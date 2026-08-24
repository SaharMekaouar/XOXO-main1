import { Throttle } from '@nestjs/throttler';
import { Body,  Controller,  Post,  Get,  Request,  UseGuards, Logger} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('signup')
  async signUp(@Body() signupDto: SignupDto) {
    return this.authService.signUp(signupDto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('signup-google')
  async signupWithGoogle(@Body('token') token: string) {
    return this.authService.signupWithGoogle(token);
  }
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentatives max par minute
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 3 demandes max par minute
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.token,
      resetPasswordDto.newPassword
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req) {
    return { user: req.user };
  }

  @Post('google-login')
  async googleLogin(@Body('token') token: string) {
    return this.authService.googleLogin(token);
  }
}