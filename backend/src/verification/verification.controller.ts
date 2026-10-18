import { Throttle } from '@nestjs/throttler';
import { Body, Controller, Post, Get, Query } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerifyEmailDto } from '../auth/dto/verify-email.dto';
import { VerifyEmailTokenDto } from '../auth/dto/verify-email-token.dto';

@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('send-email')
  async sendEmailVerification(@Body() dto: VerifyEmailDto) {
    return this.verificationService.sendEmailVerification(dto.email, dto.verificationEmail, dto.loginChallenge);
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailTokenDto) {
    return this.verificationService.verifyEmailToken(dto.email, dto.token);
  }

  @Get('verify-email')
  async verifyEmailViaLink(@Query('email') email: string, @Query('token') token: string) {
    return this.verificationService.verifyEmailToken(email, token);
  }

}
