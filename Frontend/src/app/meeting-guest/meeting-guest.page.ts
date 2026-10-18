import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { io, Socket } from 'socket.io-client';

interface DialogueTurn {
  id: string;
  speakerName: string;
  originalLang: string;
  originalText: string;
  translations: Record<string, string>;
}

interface GuestMeeting {
  meeting: { id: string; title?: string };
  participant: { id: string; name: string; lang: string };
}

@Component({
  selector: 'app-meeting-guest',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './meeting-guest.page.html',
  styleUrls: ['./meeting-guest.page.scss'],
})
export class MeetingGuestPage implements OnInit, OnDestroy {
  token: string | null = null;
  isLoading = true;
  errorMessage = '';
  meetingInfo: GuestMeeting | null = null;
  dialogue: DialogueTurn[] = [];

  isRecording = false;
  isProcessing = false;
  recordingSeconds = 0;

  // === Verrou de parole ===
  lockedSpeakerName: string | null = null;

  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private recordedChunks: Blob[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private socket?: Socket;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.errorMessage = 'Lien d’invitation invalide.';
      this.isLoading = false;
      return;
    }
    this.loadMeeting();
  }

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

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.token}` });
  }

  private loadMeeting(): void {
    this.http.get<GuestMeeting>('http://localhost:3000/meeting/guest/me', { headers: this.authHeaders() }).subscribe({
      next: (info) => {
        this.meetingInfo = info;
        this.isLoading = false;
        this.connectSocket(info.meeting.id);
        this.loadPastTurns();
      },
      error: () => {
        this.errorMessage = 'Ce lien d’invitation n’est plus valide.';
        this.isLoading = false;
      },
    });
  }

  private connectSocket(meetingId: string): void {
    this.socket = io('http://localhost:3000/meeting', { query: { meetingId } });

    this.socket.on('new-turn', (turn: DialogueTurn) => {
      if (!this.dialogue.some(t => t.id === turn.id)) this.dialogue.push(turn);
    });

    this.socket.on('speaker-locked', (data: { speakerId: string; speakerName: string }) => {
      this.lockedSpeakerName = data.speakerId === this.meetingInfo?.participant.id ? null : data.speakerName;
    });

    this.socket.on('speaker-unlocked', () => {
      this.lockedSpeakerName = null;
    });
  }

  private loadPastTurns(): void {
    this.http.get<DialogueTurn[]>('http://localhost:3000/meeting/guest/turns', { headers: this.authHeaders() }).subscribe({
      next: (turns) => { this.dialogue = turns; },
      error: (error) => console.error('Failed to load past turns:', error),
    });
  }

  // === Verrou de parole ===

  private requestSpeak(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.meetingInfo) { resolve(true); return; }
      this.socket.emit(
        'request-speak',
        {
          meetingId: this.meetingInfo.meeting.id,
          speakerId: this.meetingInfo.participant.id,
          speakerName: this.meetingInfo.participant.name,
        },
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
    if (this.socket && this.meetingInfo) {
      this.socket.emit('release-speak', {
        meetingId: this.meetingInfo.meeting.id,
        speakerId: this.meetingInfo.participant.id,
      });
    }
  }

  // === Enregistrement ===

  async toggleRecording(): Promise<void> {
    if (this.isRecording) { this.stopRecording(); return; }
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
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
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
    if (!this.recordedChunks.length || !this.meetingInfo) return;
    const type = this.recorder?.mimeType || 'audio/webm';
    const audio = new File([new Blob(this.recordedChunks, { type })], `turn-${Date.now()}.webm`, { type });
    this.processTurn(audio);
  }

  private processTurn(audio: File): void {
    this.isProcessing = true;
    const headers = this.authHeaders();
    const formData = new FormData();
    formData.append('file', audio, audio.name);
    formData.append('language', this.meetingInfo!.participant.lang);
    this.http.post<{ text: string }>('http://localhost:3000/meeting/guest/transcribe', formData, { headers }).subscribe({
      next: ({ text }) => this.submitTurn(text),
      error: (error) => {
        console.error(error);
        this.isProcessing = false;
        this.errorMessage = 'Échec de la transcription.';
        this.releaseSpeak();
      },
    });
  }

  private submitTurn(originalText: string): void {
    const trimmed = originalText?.trim();
    if (!trimmed || !this.meetingInfo) {
      this.isProcessing = false;
      this.releaseSpeak();
      return;
    }
    const headers = this.authHeaders();
    this.http.post('http://localhost:3000/meeting/guest/turns', {
      speakerName: this.meetingInfo.participant.name,
      originalLang: this.meetingInfo.participant.lang,
      originalText: trimmed,
      translations: {},
    }, { headers }).subscribe({
      next: () => { this.isProcessing = false; this.releaseSpeak(); },
      error: (error) => {
        console.error(error);
        this.isProcessing = false;
        this.errorMessage = 'Échec de l’envoi.';
        this.releaseSpeak();
      },
    });
  }

  languageLabel(code: string): string {
    const map: Record<string, string> = { ar: 'العربية', fr: 'Français', en: 'English', it: 'Italiano', es: 'Español', de: 'Deutsch', tr: 'Türkçe' };
    return map[code] || code;
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
}