import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsString } from 'class-validator';

export class SignupDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
