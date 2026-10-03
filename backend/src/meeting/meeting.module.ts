import { Module } from '@nestjs/common';
import { MeetingService } from './meeting.service';
import { MeetingController } from './meeting.controller';
import { MeetingGateway } from './meeting.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { AIModule } from '../ai/ai.module';
import { TranslationModule } from '../translate/translate.module';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [PrismaModule, MailModule, AIModule, TranslationModule, AuthModule],
  controllers: [MeetingController],
  providers: [MeetingService, MeetingGateway, JwtAuthGuard],
})
export class MeetingModule {}