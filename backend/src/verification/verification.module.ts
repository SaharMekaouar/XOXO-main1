import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, MailModule, AuthModule],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
