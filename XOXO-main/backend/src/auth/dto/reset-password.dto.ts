import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;
  @IsString()
  token: string;
  
  @IsNotEmpty()
  newPassword: string;
}
