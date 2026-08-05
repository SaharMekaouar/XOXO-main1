import { BadRequestException, Body, Controller, InternalServerErrorException, Post, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AIService } from './ai.service';
import { UploadAudioDto } from './dto/upload-audio.dto';
import { Logger } from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
@Controller('ai')
export class AIController {
  private readonly logger = new Logger(AIController.name);
  constructor(private readonly aiService: AIService) {}

  @UseGuards(JwtAuthGuard)
  @Post('transcribe')
  @UseInterceptors(FileInterceptor('file', {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const originalExt = extname(file.originalname) || '.mp3';
      const uniqueName = `${uuidv4()}${originalExt}`;
      const logger = new Logger(AIController.name);
      logger.log(`New filename: ${uniqueName}`);
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
}))
  async transcribe(
    @UploadedFile() file: Express.Multer.File, 
    @Body() body: UploadAudioDto
  ) {
    this.logger.log('Received transcription request...');
    
    if (!file) {
      this.logger.error('No file provided');
      throw new BadRequestException('No file provided');
    }
    try {
      this.logger.log(`Processing file: ${file.originalname}`);
      const transcription = await this.aiService.transcribeAudio(file.path);
      this.logger.log('Transcription successful');
      this.cleanupFile(file.path);
      return { text: transcription };
    } catch (error) {
      this.cleanupFile(file.path);
      this.logger.error(`Transcription error: ${error.message}`);
      throw new InternalServerErrorException(`Transcription failed: ${error.message}`);
    }
  }
  @Post('process')
  @UseGuards(JwtAuthGuard)
  async processFile(@Body() body: UploadAudioDto) {
    this.logger.log('Processing URL request...');
    if (!body.url) {
      this.logger.error('No URL provided');
      throw new BadRequestException('URL is required');
    }
    try {
      const decodedUrl = decodeURIComponent(body.url);
      const filePath = await this.aiService.processUrl(decodedUrl);
      this.logger.log(`File downloaded: ${filePath}`);
      const transcription = await this.aiService.sendToWhisper(filePath);
      this.logger.log('Transcription successful');
      return { text: transcription };
    } catch (error) {
      this.logger.error(`Processing error: ${error.message}`);
      throw new InternalServerErrorException(`Processing failed: ${error.message}`);
    }
  }
  private cleanupFile(filePath?: string): void {
    if (!filePath) return;
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        this.logger.log(`File deleted: ${filePath}`);
      }
    } catch (err) {
      this.logger.error(`Failed to delete file: ${filePath} - ${err.message}`);
    }
  }
}