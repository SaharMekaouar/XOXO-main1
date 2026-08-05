import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { exec } from 'child_process';
import * as FormData from 'form-data';
import { createReadStream, existsSync, unlinkSync, writeFileSync } from 'fs';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';
const execPromise = promisify(exec);
interface WhisperResponse {text: string;}
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly WHISPER_API_URL = 'https://ff3a-154-111-224-232.ngrok-free.app/transcribe';
  private readonly TEMP_DIR = tmpdir();

  async transcribeAudio(filePath: string): Promise<string> {
    if (!existsSync(filePath)) {
      throw new InternalServerErrorException(`File not found: ${filePath}`);
    }
    const form = new FormData();
    form.append('file', createReadStream(filePath));
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
    const outputPath = join(this.TEMP_DIR, `audio_${Date.now()}.mp3`);
    try {
      this.logger.log(`Downloading audio from URL: ${url}`);    
      await execPromise(`yt-dlp -f bestaudio --extract-audio --audio-format mp3 -o "${outputPath}" "${url}"`, {
        timeout: 120000
      });
      if (!existsSync(outputPath)) {
        throw new Error('Audio file not generated');
      }
      return outputPath;
    } catch (error) {
      this.cleanupFile(outputPath);
      const err = error as Error;
      this.logger.error(`yt-dlp error: ${err.message}`);
      throw new InternalServerErrorException(`Processing failed: ${err.message}`);
    }
  }
  async sendToWhisper(mp3Path: string): Promise<string> {
    if (!existsSync(mp3Path)) {
      throw new InternalServerErrorException(`File not found: ${mp3Path}`);
    }
    try {
      const form = new FormData();
      form.append('file', createReadStream(mp3Path));
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