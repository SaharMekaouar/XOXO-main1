import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { IonicModule, PopoverController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { Navbar } from '../navbar/navbar';
import { AuthService } from '../auth/services/auth.service';
import { SavedTextService } from '../auth/services/saved-text.service';
import { PopoverMenuComponent } from '../components/popover-menu.component/popover-menu.component';

interface DialogueTurn {
  id: string;
  speakerId?: string;
  speakerName: string;
  originalLang: string;
  originalText: string;
  translations: Record<string, string>;
  timestamp: number;
}

interface RemoteParticipant {
  id: string;
  name: string;
  email: string;
  lang: string;
  status: string;
}

@Component({
  selector: 'app-meeting',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, Navbar],
  templateUrl: './meeting.page.html',
  styleUrls: ['./meeting.page.scss'],
})
export class MeetingPage implements OnDestroy {
  readonly languages = [
    { code: 'ar', label: 'العربية / التونسي' },
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'it', label: 'Italiano' },
    { code: 'es', label: 'Español' },
    { code: 'de', label: 'Deutsch' },
    { code: 'tr', label: 'Türkçe' },
  ];

  // La réunion n'existe pas encore tant que l'admin n'a pas validé le formulaire.
  remoteMeetingId: string | null = null;
  remoteParticipants: RemoteParticipant[] = [];
  inviteName = '';
  inviteEmail = '';
  inviteLang = 'fr';
  adminName = '';
  adminLang = 'fr';
  private socket?: Socket;

  // === Verrou de parole (un seul locuteur à la fois) ===
  private readonly adminSpeakerId = 'admin';
  lockedSpeakerName: string | null = null;

  // === Commun ===
  isRecording = false;
  isProcessing = false;
  recordingSeconds = 0;
  errorMessage = '';
  dialogue: DialogueTurn[] = [];

  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private recordedChunks: Blob[] = [];
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly popoverCtrl: PopoverController,
    private readonly loadingCtrl: LoadingController,
    private readonly toastCtrl: ToastController,
    private readonly savedTextService: SavedTextService,
    private readonly router: Router,
  ) {}

  ngOnDestroy(): void {
    this.stopMediaTracks();
    this.stopTimer();
    this.socket?.disconnect();
  }

  get recordingTime(): string {
    const m = Math.floor(this.recordingSeconds / 60).toString().padStart(2, '0');
    const s = (this.recordingSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  get dialogueAsText(): string {
    if (!this.dialogue.length) return '';
    return this.dialogue.map(turn => {
      const header = `${turn.speakerName} (${this.languageLabel(turn.originalLang)}):`;
      const translationLines = Object.entries(turn.translations)
        .map(([lang, text]) => `   → ${this.languageLabel(lang)}: ${text}`)
        .join('\n');
      return `${header}\n${turn.originalText}${translationLines ? '\n' + translationLines : ''}`;
    }).join('\n\n');
  }

  private authHeaders(): HttpHeaders | undefined {
    const token = this.authService.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }

  // === Création de la réunion ===

  async createMeeting(): Promise<void> {
    if (!this.adminName.trim()) {
      this.errorMessage = 'Indique ton nom avant de créer la réunion.';
      return;
    }
    const headers = this.authHeaders();
    try {
      const meeting = await firstValueFrom(
        this.http.post<{ id: string }>('http://localhost:3000/meeting', { mode: 'remote', lang: this.adminLang }, { headers }),
      );
      this.remoteMeetingId = meeting.id;
      this.connectSocket(meeting.id);
      await this.loadPastTurns();
    } catch (error) {
      console.error('Meeting creation failed:', error);
      this.errorMessage = 'Impossible de créer la réunion.';
    }
  }

  private connectSocket(meetingId: string): void {
    this.socket = io('http://localhost:3000/meeting', { query: { meetingId } });

    this.socket.on('new-turn', (turn: DialogueTurn) => {
      if (!this.dialogue.some(t => t.id === turn.id)) {
        this.dialogue.push(turn);
      }
    });

    this.socket.on('participants-updated', (participants: RemoteParticipant[]) => {
      this.remoteParticipants = participants;
    });

    this.socket.on('speaker-locked', (data: { speakerId: string; speakerName: string }) => {
      this.lockedSpeakerName = data.speakerId === this.adminSpeakerId ? null : data.speakerName;
    });

    this.socket.on('speaker-unlocked', () => {
      this.lockedSpeakerName = null;
    });
  }

  private async loadPastTurns(): Promise<void> {
    if (!this.remoteMeetingId) return;
    const headers = this.authHeaders();
    try {
      const turns = await firstValueFrom(
        this.http.get<DialogueTurn[]>(`http://localhost:3000/meeting/${this.remoteMeetingId}/turns`, { headers }),
      );
      this.dialogue = turns;
    } catch (error) {
      console.error('Failed to load past turns:', error);
    }
  }

  // === Verrou de parole ===

  private requestSpeak(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.remoteMeetingId) { resolve(true); return; }
      this.socket.emit(
        'request-speak',
        { meetingId: this.remoteMeetingId, speakerId: this.adminSpeakerId, speakerName: this.adminName || 'Admin' },
        (response: { granted: boolean; speakerName?: string }) => {
          if (!response.granted) {
            this.errorMessage = `${response.speakerName} est en train de parler, patiente un instant.`;
          }
          resolve(response.granted);
        },
      );
    });
  }

  private releaseSpeak(): void {
    if (this.socket && this.remoteMeetingId) {
      this.socket.emit('release-speak', { meetingId: this.remoteMeetingId, speakerId: this.adminSpeakerId });
    }
  }

  // === Invitations ===

  async sendInvite(): Promise<void> {
    if (!this.remoteMeetingId || !this.inviteName.trim() || !this.inviteEmail.trim()) return;
    const headers = this.authHeaders();
    try {
      await firstValueFrom(
        this.http.post(
          `http://localhost:3000/meeting/${this.remoteMeetingId}/invite`,
          { name: this.inviteName.trim(), email: this.inviteEmail.trim(), lang: this.inviteLang },
          { headers },
        ),
      );
      const toast = await this.toastCtrl.create({ message: 'Invitation envoyée !', duration: 2000, color: 'success' });
      await toast.present();
      this.inviteName = '';
      this.inviteEmail = '';
      await this.refreshParticipants();
    } catch (error) {
      console.error('Invite failed:', error);
      const toast = await this.toastCtrl.create({ message: "Échec de l'envoi de l'invitation.", duration: 2500, color: 'danger' });
      await toast.present();
    }
  }

  async refreshParticipants(): Promise<void> {
    if (!this.remoteMeetingId) return;
    const headers = this.authHeaders();
    try {
      this.remoteParticipants = await firstValueFrom(
        this.http.get<RemoteParticipant[]>(`http://localhost:3000/meeting/${this.remoteMeetingId}/participants`, { headers }),
      );
    } catch (error) {
      console.error('Failed to load participants:', error);
    }
  }

  async removeRemoteParticipant(participantId: string): Promise<void> {
    if (!this.remoteMeetingId) return;
    const headers = this.authHeaders();
    try {
      await firstValueFrom(
        this.http.delete(`http://localhost:3000/meeting/${this.remoteMeetingId}/participants/${participantId}`, { headers }),
      );
      await this.refreshParticipants();
    } catch (error) {
      console.error('Remove participant failed:', error);
    }
  }

  // === Enregistrement ===

  async toggleRecording(): Promise<void> {
    if (this.isRecording) {
      this.stopRecording();
      return;
    }
    await this.startRecording();
  }

  private async startRecording(): Promise<void> {
    this.errorMessage = '';

    const granted = await this.requestSpeak();
    if (!granted) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.errorMessage = 'L’enregistrement micro n’est pas supporté par ce navigateur.';
      this.releaseSpeak();
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : '';
      this.recorder = mimeType ? new MediaRecorder(this.stream, { mimeType }) : new MediaRecorder(this.stream);
      this.recordedChunks = [];
      this.recordingSeconds = 0;
      this.recorder.ondataavailable = ({ data }) => { if (data.size > 0) this.recordedChunks.push(data); };
      this.recorder.onstop = () => this.handleRecordingStopped();
      this.recorder.start(1000);
      this.isRecording = true;
      this.startTimer();
    } catch (error) {
      console.error('Microphone access failed:', error);
      this.errorMessage = 'Autorise l’accès au micro, puis réessaie.';
      this.stopMediaTracks();
      this.releaseSpeak();
    }
  }

  private stopRecording(): void {
    this.isRecording = false;
    this.stopTimer();
    if (this.recorder?.state === 'recording') this.recorder.stop();
  }

  private handleRecordingStopped(): void {
    this.stopMediaTracks();
    if (!this.recordedChunks.length) return;
    const type = this.recorder?.mimeType || 'audio/webm';
    const audio = new File([new Blob(this.recordedChunks, { type })], `turn-${Date.now()}.webm`, { type });
    this.processRemoteAdminTurn(audio);
  }

  private processRemoteAdminTurn(audio: File): void {
    this.isProcessing = true;
    this.errorMessage = '';
    const headers = this.authHeaders();
    const formData = new FormData();
    formData.append('file', audio, audio.name);
    formData.append('language', this.adminLang);

    this.http.post<{ text: string }>('http://localhost:3000/ai/transcribe', formData, { headers }).subscribe({
      next: ({ text }) => this.translateAndSendRemoteTurn(text, this.adminName, this.adminLang, headers),
      error: (error) => this.handleError(error),
    });
  }

  private translateAndSendRemoteTurn(originalText: string, speakerName: string, speakerLang: string, headers?: HttpHeaders): void {
    const trimmed = originalText?.trim();
    if (!trimmed) {
      this.isProcessing = false;
      this.errorMessage = 'Aucune parole détectée pour ce tour.';
      this.releaseSpeak();
      return;
    }
    const targetLangs = Array.from(new Set(this.remoteParticipants.filter(p => p.lang !== speakerLang).map(p => p.lang)));
    const translations: Record<string, string> = {};

    const finalize = () => {
      if (!this.remoteMeetingId) return;
      this.http.post(`http://localhost:3000/meeting/${this.remoteMeetingId}/turns`, {
        speakerName, originalLang: speakerLang, originalText: trimmed, translations,
      }, { headers }).subscribe({
        next: () => { this.isProcessing = false; this.releaseSpeak(); },
        error: (error) => this.handleError(error),
      });
    };

    if (!targetLangs.length) { finalize(); return; }
    let remaining = targetLangs.length;
    targetLangs.forEach((tgtLang) => {
      this.http.post<{ translation: string }>('http://localhost:3000/translate', {
        text: trimmed, srcLang: speakerLang, tgtLang,
      }, { headers }).subscribe({
        next: ({ translation }) => { translations[tgtLang] = translation; remaining -= 1; if (remaining === 0) finalize(); },
        error: () => { translations[tgtLang] = '⚠️ échec de traduction'; remaining -= 1; if (remaining === 0) finalize(); },
      });
    });
  }

  languageLabel(code: string): string {
    return this.languages.find(l => l.code === code)?.label || code;
  }

  private handleError(error: any): void {
    console.error('Meeting turn error:', error);
    this.isProcessing = false;
    this.errorMessage = error?.error?.message || 'Impossible de traiter ce tour de parole. Réessaie.';
    this.releaseSpeak();
  }

  private startTimer(): void {
    this.stopTimer();
    this.timer = setInterval(() => this.recordingSeconds += 1, 1000);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private stopMediaTracks(): void {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
  }

  // === Menu (Save / Download / Share) ===

  async presentPopover(ev: Event): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: PopoverMenuComponent,
      event: ev,
      translucent: true,
      showBackdrop: true,
      componentProps: { transcribedText: this.dialogueAsText, showTranslate: false, showSummarize: false },
    });
    await popover.present();
    const { data } = await popover.onDidDismiss();
    switch (data) {
      case 'save': await this.saveDialogue(); break;
      case 'download': this.downloadDialogue(); break;
      case 'share': this.shareDialogue(); break;
    }
  }

  private async saveDialogue(): Promise<void> {
    const content = this.dialogueAsText;
    if (!content) {
      const toast = await this.toastCtrl.create({ message: 'Aucun dialogue à sauvegarder.', duration: 2000, color: 'danger' });
      await toast.present();
      return;
    }
    const userId = this.authService.getUserId();
    if (!userId) {
      const toast = await this.toastCtrl.create({ message: 'Connecte-toi pour sauvegarder.', duration: 2000, color: 'danger' });
      await toast.present();
      return;
    }
    const loading = await this.loadingCtrl.create({ message: 'Enregistrement…' });
    await loading.present();
    try {
      await firstValueFrom(this.savedTextService.saveText({ userId, content }));
      const toast = await this.toastCtrl.create({ message: 'Dialogue enregistré !', duration: 2000, color: 'success' });
      await toast.present();
      this.router.navigate(['/history']);
    } catch (error) {
      console.error('Save error:', error);
      const toast = await this.toastCtrl.create({ message: 'Échec de la sauvegarde.', duration: 3000, color: 'danger' });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  private downloadDialogue(): void {
    const blob = new Blob([this.dialogueAsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private shareDialogue(): void {
    this.http.post<any>('http://localhost:3000/text/generate-url', {
      type: 'meeting', text: this.dialogueAsText,
    }).subscribe({
      next: (res) => {
        navigator.clipboard.writeText(res.url);
        this.toastCtrl.create({ message: 'Lien copié !', duration: 2000 }).then(t => t.present());
      },
      error: () => {
        this.toastCtrl.create({ message: 'Impossible de générer le lien.', duration: 2000, color: 'danger' }).then(t => t.present());
      },
    });
  }
}