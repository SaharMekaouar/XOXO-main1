import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly client: OAuth2Client;

  constructor( private readonly prisma: PrismaService,private readonly jwtService: JwtService) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID must be defined');
    }
    this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  private async verifyGoogleToken(token: string) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      return ticket.getPayload();
    } catch (error) {
      this.logger.error('Google token verification failed', error.stack);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  async signUp({ name, email, password }: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { name, email, password: hashedPassword },
    });
    return this.generateAuthResponse(user);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateAuthResponse(user);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const resetToken = randomUUID();
    await this.prisma.user.update({
      where: { email },
      data: { resetToken },
    });
    return { message: 'Reset token generated', email, token: resetToken };
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, resetToken: token },
    });
    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null },
    });
    return { message: 'Password reset successfully' };
  }

  async googleLogin(token: string) {
    const payload = await this.verifyGoogleToken(token);
    if (!payload?.email || !payload?.name) {
      throw new UnauthorizedException('Invalid Google token payload');
    }
    let user = await this.prisma.user.findUnique({ 
      where: { email: payload.email } 
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: payload.name,
          email: payload.email,
          password: '',
        },
      });
    }
    return this.generateAuthResponse(user);
  }

  async signupWithGoogle(token: string) {
    const payload = await this.verifyGoogleToken(token);
    if (!payload?.email || !payload?.name) {
      throw new UnauthorizedException('Invalid Google token payload');
    }
    const existingUser = await this.prisma.user.findUnique({ 
      where: { email: payload.email } 
    });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }
    const user = await this.prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password: '',
      },
    });
    return this.generateAuthResponse(user);
  }

  private generateAuthResponse(user: any) {
    const token = this.jwtService.sign({ 
      sub: user.id, 
      email: user.email,
      name: user.name
    });

    return {
      token,
      userId: user.id,
      username: user.name,
      email: user.email
    };
  }
}