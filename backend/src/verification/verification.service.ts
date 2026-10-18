import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomInt } from 'crypto';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class VerificationService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {
  }

  async sendEmailVerification(email: string, verificationEmail: string, loginChallenge: string) {
    email = email.trim().toLowerCase();
    verificationEmail = verificationEmail.trim().toLowerCase();
    if (email === verificationEmail) {
      throw new BadRequestException('Use a separate email address to receive the verification code.');
    }
    const challenge = await this.jwtService.verifyAsync(loginChallenge).catch(() => null);
    if (challenge?.purpose !== 'email-login' || challenge.email !== email) {
      throw new BadRequestException('Login session expired. Please log in again.');
    }
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new BadRequestException('No account is registered with this email. Sign up first or use the email you registered with.');
    }

    const verificationToken = randomInt(0, 10000).toString().padStart(4, '0');
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });

    // Send email with ONLY the code (no link)
    await this.mailService.sendMail({
      to: verificationEmail,
      subject: 'Your Recapify login code',
      text: `Hello ${user.name},\n\nYour login code is: ${verificationToken}\n\nEnter this 4-digit code in Recapify to continue. It expires in 10 minutes.`,
    });

    return { message: 'Verification email sent successfully' };
  }

  async verifyEmailToken(email: string, token: string) {
    email = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new BadRequestException('Invalid email or token');
    }

    if (!user.emailVerificationToken || user.emailVerificationToken !== token) {
      throw new BadRequestException('Invalid token');
    }

    if (!user.emailVerificationExpiry || user.emailVerificationExpiry < new Date()) {
      throw new BadRequestException('Token expired');
    }

    const verifiedUser = await this.prisma.user.update({
      where: { email },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    return this.authService.generateAuthResponse(verifiedUser);
  }

}
