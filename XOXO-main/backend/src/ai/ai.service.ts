import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import axios, { AxiosError } from 'axios';
import { exec } from 'child_process';
import * as FormData from 'form-data';

import {
  createReadStream,
  existsSync,
  unlinkSync,
  writeFileSync,
} from 'fs';

import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';

const execPromise = promisify(exec);

interface TranscriptionResponse {
  text: string;
  language?: string;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  // ============================================================
  // FASTAPI + FASTER-WHISPER
  // ============================================================

  private readonly TRANSCRIPTION_API_URL =
    'http://localhost:8001/transcribe/';

  private readonly TEMP_DIR = tmpdir();

  // ============================================================
  // TRANSCRIPTION D'UN FICHIER AUDIO
  // ============================================================

  async transcribeAudio(filePath: string): Promise<string> {
    if (!existsSync(filePath)) {
      throw new InternalServerErrorException(
        `File not found: ${filePath}`,
      );
    }

    const form = new FormData();

    form.append(
      'file',
      createReadStream(filePath),
    );

    try {
      this.logger.log(
        `Sending file to Faster-Whisper: ${filePath}`,
      );

      const { data } = await axios.post<TranscriptionResponse>(
        this.TRANSCRIPTION_API_URL,
        form,
        {
          headers: form.getHeaders(),
          timeout: 300000,
        },
      );

      this.logger.log(
        'Faster-Whisper transcription successful',
      );

      return data.text;
    } catch (error) {
      const err = error as AxiosError;

      this.logger.error(
        `Faster-Whisper transcription error: ${err.message}`,
      );

      throw new InternalServerErrorException(
        `Transcription failed: ${err.message}`,
      );
    } finally {
      this.cleanupFile(filePath);
    }
  }

  // ============================================================
  // DOWNLOAD AUDIO DIRECT
  // ============================================================

  async downloadAudio(url: string): Promise<string> {
    const filePath = join(
      this.TEMP_DIR,
      `audio_${Date.now()}.wav`,
    );

    try {
      this.logger.log(
        `Downloading direct audio URL: ${url}`,
      );

      const { data } = await axios.get<ArrayBuffer>(
        url,
        {
          responseType: 'arraybuffer',
          timeout: 30000,
        },
      );

      writeFileSync(
        filePath,
        Buffer.from(data),
      );

      return filePath;
    } catch (error) {
      this.cleanupFile(filePath);

      const err = error as AxiosError;

      throw new InternalServerErrorException(
        `Download failed: ${err.message}`,
      );
    }
  }

  // ============================================================
  // PROCESS YOUTUBE URL
  // ============================================================

  async processUrl(url: string): Promise<string> {
    const timestamp = Date.now();

    const videoPath = join(
      this.TEMP_DIR,
      `youtube_${timestamp}.mp4`,
    );

    const outputPath = join(
      this.TEMP_DIR,
      `audio_${timestamp}.mp3`,
    );

    try {
      this.logger.log(
        `Downloading YouTube video: ${url}`,
      );

      // --------------------------------------------------------
      // STEP 1: Download YouTube video
      // --------------------------------------------------------

      await execPromise(
        `yt-dlp --extractor-args "youtube:player_client=mweb" -f 18 -o "${videoPath}" "${url}"`,
        {
          timeout: 180000,
          maxBuffer: 10 * 1024 * 1024,
        },
      );

      if (!existsSync(videoPath)) {
        throw new Error(
          'YouTube video file was not generated',
        );
      }

      this.logger.log(
        `YouTube video downloaded: ${videoPath}`,
      );

      // --------------------------------------------------------
      // STEP 2: Extract audio with FFmpeg
      // --------------------------------------------------------

      await execPromise(
        `ffmpeg -y -i "${videoPath}" -vn -acodec libmp3lame "${outputPath}"`,
        {
          timeout: 120000,
          maxBuffer: 10 * 1024 * 1024,
        },
      );

      if (!existsSync(outputPath)) {
        throw new Error(
          'MP3 audio file was not generated',
        );
      }

      this.logger.log(
        `Audio extraction successful: ${outputPath}`,
      );

      // --------------------------------------------------------
      // STEP 3: Delete temporary MP4
      // --------------------------------------------------------

      this.cleanupFile(videoPath);

      return outputPath;
    } catch (error) {
      this.cleanupFile(videoPath);
      this.cleanupFile(outputPath);

      const err = error as Error;

      this.logger.error(
        `yt-dlp/FFmpeg error: ${err.message}`,
      );

      throw new InternalServerErrorException(
        `Processing failed: ${err.message}`,
      );
    }
  }

  // ============================================================
  // SEND AUDIO TO FASTER-WHISPER
  // ============================================================

  async sendToFasterWhisper(
    mp3Path: string,
  ): Promise<string> {
    if (!existsSync(mp3Path)) {
      throw new InternalServerErrorException(
        `File not found: ${mp3Path}`,
      );
    }

    const form = new FormData();

    form.append(
      'file',
      createReadStream(mp3Path),
    );

    try {
      this.logger.log(
        `Sending audio to Faster-Whisper: ${mp3Path}`,
      );

      const { data } = await axios.post<TranscriptionResponse>(
        this.TRANSCRIPTION_API_URL,
        form,
        {
          headers: form.getHeaders(),
          timeout: 300000,
        },
      );

      this.logger.log(
        'Faster-Whisper transcription successful',
      );

      return data.text;
    } catch (error) {
      const err = error as AxiosError;

      this.logger.error(
        `Faster-Whisper error: ${err.message}`,
      );

      throw new InternalServerErrorException(
        `Transcription failed: ${err.message}`,
      );
    } finally {
      this.cleanupFile(mp3Path);
    }
  }

  // ============================================================
  // CLEANUP TEMPORARY FILE
  // ============================================================

  private cleanupFile(filePath?: string): void {
    if (!filePath) {
      return;
    }

    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);

        this.logger.log(
          `File cleaned: ${filePath}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Cleanup failed: ${filePath} - ${
          (err as Error).message
        }`,
      );
    }
  }
}