import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { IonicModule, PopoverController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Navbar } from '../navbar/navbar';
import { AuthService } from '../auth/services/auth.service';
import { SavedTextService } from '../auth/services/saved-text.service';
import { PopoverMenuComponent } from '../components/popover-menu.component/popover-menu.component';

interface Speaker {
  id: string;
  name: string;
  lang: string;
}

interface DialogueTurn {
  id: string;
  speakerId: string;
  speakerName: string;
  originalLang: string;
  originalText: string;
  translations: Record<string, string>;
  timestamp: number;
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

  speakers: Speaker[] = [];
  newSpeakerName = '';
  newSpeakerLang = 'fr';

  activeSpeakerId: string | null = null;
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
  }

  get recordingTime(): string {
    const m = Math.floor(this.recordingSeconds / 60).toString().padStart(2, '0');
    const s = (this.recordingSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  get activeSpeaker(): Speaker | undefined {
    return this.speakers.find(s => s.id === this.activeSpeakerId);
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

  addSpeaker(): void {
    const name = this.newSpeakerName.trim();
    if (!name) return;
    this.speakers.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      lang: this.newSpeakerLang,
    });
    this.newSpeakerName = '';
    if (!this.activeSpeakerId) this.activeSpeakerId = this.speakers[this.speakers.length - 1].id;
  }

  removeSpeaker(id: string): void {
    this.speakers = this.speakers.filter(s => s.id !== id);
    if (this.activeSpeakerId === id) this.activeSpeakerId = this.speakers[0]?.id || null;
  }

  selectSpeaker(id: string): void {
    if (this.isRecording) return;
    this.activeSpeakerId = id;
  }

  async toggleRecording(): Promise<void> {
    if (this.isRecording) {
      this.stopRecording();
      return;
    }
    await this.startRecording();
  }

  private async startRecording(): Promise<void> {
    this.errorMessage = '';
    if (!this.activeSpeaker) {
      this.errorMessage = 'Choisis qui parle avant d’enregistrer.';
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.errorMessage = 'L’enregistrement micro n’est pas supporté par ce navigateur.';
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
    }
  }

  private stopRecording(): void {
    this.isRecording = false;
    this.stopTimer();
    if (this.recorder?.state === 'recording') this.recorder.stop();
  }

  private handleRecordingStopped(): void {
    this.stopMediaTracks();
    if (!this.recordedChunks.length || !this.activeSpeaker) return;
    const type = this.recorder?.mimeType || 'audio/webm';
    const audio = new File([new Blob(this.recordedChunks, { type })], `turn-${Date.now()}.webm`, { type });
    this.processTurn(audio, this.activeSpeaker);
  }

  private processTurn(audio: File, speaker: Speaker): void {
    this.isProcessing = true;
    this.errorMessage = '';
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    const formData = new FormData();
    formData.append('file', audio, audio.name);
    formData.append('language', speaker.lang);

    this.http.post<{ text: string }>('http://localhost:3000/ai/transcribe', formData, { headers }).subscribe({
      next: ({ text }) => this.translateTurn(text, speaker, headers),
      error: (error) => this.handleError(error),
    });
  }

  private translateTurn(originalText: string, speaker: Speaker, headers?: HttpHeaders): void {
    const trimmed = originalText?.trim();
    if (!trimmed) {
      this.isProcessing = false;
      this.errorMessage = 'Aucune parole détectée pour ce tour.';
      return;
    }

    const targetLangs = Array.from(new Set(
      this.speakers.filter(s => s.lang !== speaker.lang).map(s => s.lang)
    ));

    const turn: DialogueTurn = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      speakerId: speaker.id,
      speakerName: speaker.name,
      originalLang: speaker.lang,
      originalText: trimmed,
      translations: {},
      timestamp: Date.now(),
    };

    if (!targetLangs.length) {
      this.dialogue.push(turn);
      this.isProcessing = false;
      return;
    }

    let remaining = targetLangs.length;
    targetLangs.forEach((tgtLang) => {
      this.http.post<{ translation: string }>('http://localhost:3000/translate', {
        text: trimmed,
        srcLang: speaker.lang,
        tgtLang,
      }, { headers }).subscribe({
        next: ({ translation }) => {
          turn.translations[tgtLang] = translation;
          remaining -= 1;
          if (remaining === 0) {
            this.dialogue.push(turn);
            this.isProcessing = false;
          }
        },
        error: (error) => {
          console.error(`Translation to ${tgtLang} failed:`, error);
          turn.translations[tgtLang] = '⚠️ échec de traduction';
          remaining -= 1;
          if (remaining === 0) {
            this.dialogue.push(turn);
            this.isProcessing = false;
          }
        },
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

  async presentPopover(ev: Event): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: PopoverMenuComponent,
      event: ev,
      translucent: true,
      showBackdrop: true,
      componentProps: {
        transcribedText: this.dialogueAsText,
        showTranslate: false,
        showSummarize: false,
      },
    });

    await popover.present();
    const { data } = await popover.onDidDismiss();

    switch (data) {
      case 'save':
        await this.saveDialogue();
        break;
      case 'download':
        this.downloadDialogue();
        break;
      case 'share':
        this.shareDialogue();
        break;
      case 'edit':
        this.toastCtrl.create({
          message: "L'édition manuelle du dialogue n'est pas encore disponible.",
          duration: 2000,
        }).then(t => t.present());
        break;
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
      type: 'meeting',
      text: this.dialogueAsText,
    }).subscribe({
      next: (res) => {
        navigator.clipboard.writeText(res.url);
        this.toastCtrl.create({ message: 'Lien copié dans le presse-papiers !', duration: 2000 }).then(t => t.present());
      },
      error: () => {
        this.toastCtrl.create({ message: 'Impossible de générer le lien.', duration: 2000, color: 'danger' }).then(t => t.present());
      },
    });
  }
}