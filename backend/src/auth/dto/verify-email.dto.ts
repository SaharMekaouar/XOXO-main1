import { IsEmail, IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEmail()
  @IsNotEmpty()
  verificationEmail: string;

  @IsNotEmpty()
  loginChallenge: string;
}
