import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { MeetingGateway } from './meeting.gateway';
import { TranslationService } from '../translate/translate.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { InviteParticipantDto } from './dto/invite-participant.dto';
import { CreateTurnDto } from './dto/create-turn.dto';

@Injectable()
export class MeetingService {
  private readonly guestSecret = process.env.JWT_GUEST_SECRET || 'change_me_guest_secret';
  private readonly frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8100';

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly gateway: MeetingGateway,
    private readonly translationService: TranslationService,
  ) {}

  async createMeeting(adminUserId: string, dto: CreateMeetingDto) {
    return this.prisma.meeting.create({
      data: {
        adminUserId,
        mode: dto.mode,
        adminLang: dto.lang,
        title: dto.title,
      },
    });
  }

  async assertIsAdmin(meetingId: string, userId: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Meeting not found');
    if (meeting.adminUserId !== userId) {
      throw new ForbiddenException('Only the meeting admin can perform this action');
    }
    return meeting;
  }

  async inviteParticipant(meetingId: string, adminUserId: string, dto: InviteParticipantDto) {
    const meeting = await this.assertIsAdmin(meetingId, adminUserId);

    const rawToken = randomUUID();

    const participant = await this.prisma.meetingParticipant.create({
      data: {
        meetingId: meeting.id,
        name: dto.name,
        email: dto.email,
        lang: dto.lang,
        inviteToken: rawToken,
        status: 'invited',
      },
    });

    const guestJwt = sign(
      { scope: 'meeting-guest', meetingId: meeting.id, participantId: participant.id },
      this.guestSecret,
      { expiresIn: '30d' },
    );

    const joinUrl = `${this.frontendUrl}/meeting-guest?token=${guestJwt}`;

    await this.mailService.sendMail({
      to: dto.email,
      subject: `Invitation à une réunion Recapify${meeting.title ? ` — ${meeting.title}` : ''}`,
      text:
        `Bonjour ${dto.name},\n\n` +
        `Vous êtes invité(e) à rejoindre une réunion multilingue sur Recapify.\n` +
        `Cliquez sur le lien suivant pour y accéder :\n\n${joinUrl}\n\n` +
        `Ce lien est personnel, à usage réservé à cette réunion.`,
    });

    return { participant, joinUrl };
  }

  async listParticipants(meetingId: string, adminUserId: string) {
    await this.assertIsAdmin(meetingId, adminUserId);
    return this.prisma.meetingParticipant.findMany({
      where: { meetingId, status: { not: 'removed' } },
    });
  }

  async removeParticipant(meetingId: string, participantId: string, adminUserId: string) {
    await this.assertIsAdmin(meetingId, adminUserId);
    return this.prisma.meetingParticipant.update({
      where: { id: participantId },
      data: { status: 'removed' },
    });
  }

  async getMeetingForGuest(meetingId: string, participantId: string) {
  const [meeting, participant] = await Promise.all([
    this.prisma.meeting.findUnique({ where: { id: meetingId } }),
    this.prisma.meetingParticipant.findUnique({ where: { id: participantId } }),
  ]);
  if (!meeting || !participant || participant.status === 'removed') {
    throw new NotFoundException('This invite link is no longer valid');
  }
  if (participant.meetingId !== meeting.id) {
    throw new ForbiddenException('Token does not match this meeting');
  }

  // Premier accès réel au lien : on passe le statut de "invité" à "connecté",
  // et on prévient l'admin en direct via WebSocket pour qu'il voie le
  // changement sans avoir à rafraîchir sa page.
  if (participant.status === 'invited') {
    const updated = await this.prisma.meetingParticipant.update({
      where: { id: participantId },
      data: { status: 'joined' },
    });
    const allParticipants = await this.prisma.meetingParticipant.findMany({
      where: { meetingId, status: { not: 'removed' } },
    });
    this.gateway.broadcastParticipants(meetingId, allParticipants);
    return { meeting, participant: updated };
  }

  return { meeting, participant };
}

  async addTurn(meetingId: string, dto: CreateTurnDto, participantId?: string) {
    // Si les traductions n'ont pas été fournies (cas typique de l'invité),
    // le serveur les calcule lui-même pour toutes les langues présentes
    // dans la réunion, hors la langue du locuteur.
    let translations = dto.translations;
    if (!translations || Object.keys(translations).length === 0) {
      translations = await this.computeTranslationsForMeeting(meetingId, dto.originalText, dto.originalLang);
    }

    const turn = await this.prisma.meetingTurn.create({
      data: {
        meetingId,
        participantId,
        speakerName: dto.speakerName,
        originalLang: dto.originalLang,
        originalText: dto.originalText,
        translations,
      },
    });

    this.gateway.broadcastTurn(meetingId, turn);
    return turn;
  }

  async addAdminTurn(meetingId: string, adminUserId: string, dto: CreateTurnDto) {
    await this.assertIsAdmin(meetingId, adminUserId);
    return this.addTurn(meetingId, dto);
  }

  async listTurns(meetingId: string) {
    return this.prisma.meetingTurn.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listTurnsForAdmin(meetingId: string, adminUserId: string) {
    await this.assertIsAdmin(meetingId, adminUserId);
    return this.listTurns(meetingId);
  }

  private async computeTranslationsForMeeting(
  meetingId: string,
  text: string,
  sourceLang: string,
): Promise<Record<string, string>> {
  const [meeting, participants] = await Promise.all([
    this.prisma.meeting.findUnique({ where: { id: meetingId } }),
    this.prisma.meetingParticipant.findMany({ where: { meetingId, status: { not: 'removed' } } }),
  ]);

  // On inclut la langue de l'admin EN PLUS des langues des invités.
  const allLangs = [meeting?.adminLang, ...participants.map(p => p.lang)].filter(Boolean) as string[];
  const targetLangs = Array.from(new Set(allLangs.filter(lang => lang !== sourceLang)));

  const translations: Record<string, string> = {};
  await Promise.all(
    targetLangs.map(async (tgtLang) => {
      try {
        translations[tgtLang] = await this.translationService.translate(text, sourceLang, tgtLang);
      } catch {
        translations[tgtLang] = '⚠️ échec de traduction';
      }
    }),
  );
  return translations;
}
  }

