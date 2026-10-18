import { IsNotEmpty, IsString } from 'class-validator';

export class SendPhoneVerificationDto {
  @IsString()
  @IsNotEmpty()
  phone: string;
}
