import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPhoneCodeDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
