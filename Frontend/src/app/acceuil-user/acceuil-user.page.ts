import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { AuthService } from '../auth/services/auth.service';

type SpeechRecognitionConstructor = new () => any;

@Component({
  selector: 'app-acceuil-user',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, Navbar],
  templateUrl: './acceuil-user.page.html',
  styleUrls: ['./acceuil-user.page.scss'],
})
export class AcceuilUserPage implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  uploadedFile: File | null = null;
  uploadedFileName = '';
  mediaUrl = '';
  isLoading = false;
  errorMessage = '';
  liveTranscript = '';
  interimTranscript = '';
  isRecording = false;
  recordingSeconds = 0;
  supportsLiveTranscription = false;
  activeSource: 'voice' | 'file' | 'youtube' | null = null;
  private isLiveRecordingSource = false;
  selectedLanguage = 'auto';
  readonly languages = [
    { code: 'auto', label: 'Auto-detect language' },
    { code: 'ar', label: 'العربية / التونسي' },
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'it', label: 'Italiano' },
    { code: 'es', label: 'Español' },
    { code: 'de', label: 'Deutsch' },
    { code: 'tr', label: 'Türkçe' },
  ];

  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private recognition?: any;
  private recordedChunks: Blob[] = [];
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.supportsLiveTranscription = this.getSpeechRecognitionConstructor() !== undefined;
  }

  ngOnDestroy(): void {
    this.stopMediaTracks();
    this.stopTimer();
  }

  get recordingTime(): string {
    const minutes = Math.floor(this.recordingSeconds / 60).toString().padStart(2, '0');
    const seconds = (this.recordingSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  get hasSource(): boolean {
    return Boolean(this.uploadedFile || this.mediaUrl.trim());
  }

  triggerFileInput(): void {
    this.activeSource = 'file';
    this.fileInputRef.nativeElement.click();
  }

  openYoutubeInput(): void {
    this.activeSource = 'youtube';
    setTimeout(() => document.getElementById('youtube-url')?.focus());
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadedFile = file;
    this.uploadedFileName = file.name;
    this.mediaUrl = '';
    this.activeSource = 'file';
    this.isLiveRecordingSource = false;
    this.errorMessage = '';
    input.value = '';
  }

  clearFile(): void {
    this.uploadedFile = null;
    this.uploadedFileName = '';
    this.isLiveRecordingSource = false;
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
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.errorMessage = 'Microphone recording is not supported by this browser.';
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : '';
      this.recorder = mimeType
        ? new MediaRecorder(this.stream, { mimeType })
        : new MediaRecorder(this.stream);
      this.recordedChunks = [];
      this.activeSource = 'voice';
      this.liveTranscript = '';
      this.interimTranscript = '';
      this.recordingSeconds = 0;

      this.recorder.ondataavailable = ({ data }) => {
        if (data.size > 0) this.recordedChunks.push(data);
      };
      this.recorder.onstop = () => this.sendRecordedAudio();
      this.recorder.start(1000);
      this.isRecording = true;
      this.startTimer();
      this.startLiveSpeechRecognition();
    } catch (error) {
      console.error('Microphone access failed:', error);
      this.errorMessage = 'Please allow microphone access, then try again.';
      this.stopMediaTracks();
    }
  }

  private stopRecording(): void {
    this.isRecording = false;
    this.stopTimer();
    this.recognition?.stop();
    if (this.recorder?.state === 'recording') this.recorder.stop();
  }

  private startLiveSpeechRecognition(): void {
    const Recognition = this.getSpeechRecognitionConstructor();
    if (!Recognition) return;
    this.recognition = new Recognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.getRecognitionLocale();
    this.recognition.onresult = (event: any) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0].transcript;
        if (event.results[index].isFinal) this.liveTranscript += `${text} `;
        else interim += text;
      }
      this.interimTranscript = interim;
    };
    this.recognition.onerror = (event: any) => {
      // Recording continues and the server still creates the final transcript.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Live speech recognition:', event.error);
      }
    };
    this.recognition.onend = () => {
      if (this.isRecording) this.recognition.start();
    };
    this.recognition.start();
  }

  private getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
    const browser = window as any;
    return browser.SpeechRecognition || browser.webkitSpeechRecognition;
  }

  private sendRecordedAudio(): void {
    this.stopMediaTracks();
    if (!this.recordedChunks.length) return;
    const type = this.recorder?.mimeType || 'audio/webm';
    const audio = new File([new Blob(this.recordedChunks, { type })], `recording-${Date.now()}.webm`, { type });
    this.uploadedFile = audio;
    this.uploadedFileName = 'Live recording';
    this.isLiveRecordingSource = true;
    // Browser speech recognition needs a fixed locale; its "auto" mode is the
    // browser/UI locale and can turn French or Arabic into English.  Only use
    // the instant draft when the speaker explicitly chose a microphone
    // language.  In Auto mode Whisper receives the recording and detects the
    // spoken language from the audio itself.
    const instantText = `${this.liveTranscript} ${this.interimTranscript}`.trim();
    if (instantText && this.selectedLanguage !== 'auto') {
      this.router.navigate(['/view'], { queryParams: { text: instantText } });
      return;
    }
    // A browser without live captions still uses Whisper as a safe fallback.
    this.convertToText();
  }

  convertToText(): void {
    if (!this.hasSource || this.isLoading) return;
    this.errorMessage = '';
    this.isLoading = true;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    if (this.uploadedFile) {
      const formData = new FormData();
      formData.append('file', this.uploadedFile, this.uploadedFile.name);
      // File transcription must detect the language from its own audio. Only
      // a live recording uses the language explicitly selected by the speaker.
      if (this.isLiveRecordingSource && this.selectedLanguage !== 'auto') {
        formData.append('language', this.selectedLanguage);
      }
      this.http.post<{ text: string }>('http://localhost:3000/ai/transcribe', formData, { headers }).subscribe({
        next: ({ text }) => this.openResult(text),
        error: (error) => this.handleConversionError(error),
      });
      return;
    }

    this.http.post<{ text: string }>('http://localhost:3000/ai/process', {
      url: encodeURIComponent(this.mediaUrl.trim()),
      // YouTube audio is always automatically detected. Never reuse a language
      // choice made for a previous microphone recording.
    }, { headers }).subscribe({
      next: ({ text }) => this.openResult(text),
      error: (error) => this.handleConversionError(error),
    });
  }

  private openResult(text: string): void {
    this.isLoading = false;
    if (!text?.trim()) {
      this.errorMessage = 'No speech was detected. Please try a clearer audio source.';
      return;
    }
    this.router.navigate(['/view'], { queryParams: { text } });
  }

  private handleConversionError(error: any): void {
    console.error('Transcription error:', error);
    this.isLoading = false;
    this.errorMessage = error?.error?.message || 'We could not transcribe this source. Please try again.';
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

  private getRecognitionLocale(): string {
    const locales: Record<string, string> = {
      ar: 'ar-TN', fr: 'fr-FR', en: 'en-US', it: 'it-IT', es: 'es-ES', de: 'de-DE', tr: 'tr-TR',
    };
    return locales[this.selectedLanguage] || navigator.language || 'fr-FR';
  }
}
