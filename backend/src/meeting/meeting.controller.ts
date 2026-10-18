import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MeetingGuestGuard, MeetingGuestPayload } from './guards/meeting-guest.guard';
import { MeetingService } from './meeting.service';
import { AIService } from '../ai/ai.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { InviteParticipantDto } from './dto/invite-participant.dto';
import { CreateTurnDto } from './dto/create-turn.dto';

@Controller('meeting')
export class MeetingController {
  constructor(
    private readonly meetingService: MeetingService,
    private readonly aiService: AIService,
  ) {}

  // === Routes invité (routes "fixes" : TOUJOURS avant les routes ":meetingId/...") ===

  @UseGuards(MeetingGuestGuard)
  @Get('guest/me')
  getGuestMeeting(@Req() req: Request) {
    const guest = (req as any).guest as MeetingGuestPayload;
    return this.meetingService.getMeetingForGuest(guest.meetingId, guest.participantId);
  }

  @UseGuards(MeetingGuestGuard)
  @Post('guest/turns')
  addGuestTurn(@Req() req: Request, @Body() dto: CreateTurnDto) {
    const guest = (req as any).guest as MeetingGuestPayload;
    return this.meetingService.addTurn(guest.meetingId, dto, guest.participantId);
  }

  @UseGuards(MeetingGuestGuard)
  @Get('guest/turns')
  listGuestTurns(@Req() req: Request) {
    const guest = (req as any).guest as MeetingGuestPayload;
    return this.meetingService.listTurns(guest.meetingId);
  }

  @UseGuards(MeetingGuestGuard)
  @Post('guest/transcribe')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname) || '.webm'}`),
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  async guestTranscribe(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { language?: string },
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const text = await this.aiService.transcribeAudio(file.path, body.language);
    return { text };
  }

  // === Routes admin (compte connecté) — routes à variable, déclarées APRÈS ===

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: Request, @Body() dto: CreateMeetingDto) {
    const userId = (req as any).user.sub;
    return this.meetingService.createMeeting(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':meetingId/invite')
  invite(
    @Req() req: Request,
    @Param('meetingId') meetingId: string,
    @Body() dto: InviteParticipantDto,
  ) {
    const userId = (req as any).user.sub;
    return this.meetingService.inviteParticipant(meetingId, userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':meetingId/participants')
  listParticipants(@Req() req: Request, @Param('meetingId') meetingId: string) {
    const userId = (req as any).user.sub;
    return this.meetingService.listParticipants(meetingId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':meetingId/participants/:participantId')
  removeParticipant(
    @Req() req: Request,
    @Param('meetingId') meetingId: string,
    @Param('participantId') participantId: string,
  ) {
    const userId = (req as any).user.sub;
    return this.meetingService.removeParticipant(meetingId, participantId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':meetingId/turns')
  addAdminTurn(
    @Req() req: Request,
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateTurnDto,
  ) {
    const userId = (req as any).user.sub;
    return this.meetingService.addAdminTurn(meetingId, userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':meetingId/turns')
  listAdminTurns(@Req() req: Request, @Param('meetingId') meetingId: string) {
    const userId = (req as any).user.sub;
    return this.meetingService.listTurnsForAdmin(meetingId, userId);
  }
}