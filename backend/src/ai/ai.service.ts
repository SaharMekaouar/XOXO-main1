import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { exec, execFile } from 'child_process';
import * as FormData from 'form-data';
import { createReadStream, existsSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';
const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);
interface WhisperResponse {text: string;}
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly WHISPER_API_URL = 'http://localhost:8001/transcribe/';
  private readonly TEMP_DIR = tmpdir();

  async transcribeAudio(filePath: string, language?: string): Promise<string> {
    if (!existsSync(filePath)) {
      throw new InternalServerErrorException(`File not found: ${filePath}`);
    }
    const form = new FormData();
    form.append('file', createReadStream(filePath));
    if (language && language !== 'auto') form.append('language', language);
    try {
      this.logger.log(`Sending file for transcription: ${filePath}`);
      const { data } = await axios.post<WhisperResponse>(
        this.WHISPER_API_URL, 
        form, 
        { headers: form.getHeaders() }
      );
      return data.text;
    } catch (error) {
      const err = error as AxiosError;
      this.logger.error(`Transcription error: ${err.message}`);
      throw new InternalServerErrorException(`Transcription failed: ${err.message}`);
    } finally {
      this.cleanupFile(filePath);
    }
  }
  async downloadAudio(url: string): Promise<string> {
    const filePath = join(this.TEMP_DIR, `audio_${Date.now()}.wav`);
    try {
      const { data } = await axios.get<ArrayBuffer>(url, { 
        responseType: 'arraybuffer',
        timeout: 30000
      });
      writeFileSync(filePath, Buffer.from(data));
      return filePath;
    } catch (error) {
      this.cleanupFile(filePath);
      const err = error as AxiosError;
      throw new InternalServerErrorException(`Download failed: ${err.message}`);
    }
  }
  async processUrl(url: string): Promise<string> {
    const outputName = `recapify-audio-${Date.now()}`;
    const outputTemplate = join(this.TEMP_DIR, `${outputName}.%(ext)s`);
    const outputPath = join(this.TEMP_DIR, `${outputName}.mp3`);
    try {
      this.logger.log(`Downloading audio from URL: ${url}`);
      // Keep a clear enough source for names and vocabulary while still
      // downloading quickly.  The former 96 kb/s setting harmed consonants
      // and made language recognition less reliable on some videos.
      await execFilePromise('yt-dlp', [
        '--no-playlist', '--no-progress', '--concurrent-fragments', '4',
        '-f', 'bestaudio[abr<=128]/bestaudio',
        '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '2',
        '--ffmpeg-location', 'C:\\ffmpeg\\bin', '-o', outputTemplate, url,
      ], { timeout: 180000 });
      if (!existsSync(outputPath)) {
        const generated = readdirSync(this.TEMP_DIR).find(name => name.startsWith(outputName));
        if (!generated) throw new Error('Audio file not generated');
        return join(this.TEMP_DIR, generated);
      }
      return outputPath;
    } catch (error) {
      this.cleanupFile(outputPath);
      const err = error as Error;
      this.logger.error(`yt-dlp error: ${err.message}`);
      throw new InternalServerErrorException(`Processing failed: ${err.message}`);
    }
  }
  async sendToWhisper(mp3Path: string, language?: string): Promise<string> {
    if (!existsSync(mp3Path)) {
      throw new InternalServerErrorException(`File not found: ${mp3Path}`);
    }
    try {
      const form = new FormData();
      form.append('file', createReadStream(mp3Path));
      if (language && language !== 'auto') form.append('language', language);
      this.logger.log(`Sending to Whisper: ${mp3Path}`);
      const { data } = await axios.post<WhisperResponse>(
        this.WHISPER_API_URL, 
        form, 
        { headers: form.getHeaders() }
      );
      return data.text;
    } catch (error) {
      const err = error as AxiosError;
      this.logger.error(`Whisper error: ${err.message}`);
      throw new InternalServerErrorException(`Transcription failed: ${err.message}`);
    } finally {
      this.cleanupFile(mp3Path);
    }
  }
  private cleanupFile(filePath?: string): void {
    if (!filePath) return;
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        this.logger.log(`File cleaned: ${filePath}`);
      }
    } catch (err) {
      this.logger.error(`Cleanup failed: ${filePath} - ${(err as Error).message}`);
    }
  }
}
