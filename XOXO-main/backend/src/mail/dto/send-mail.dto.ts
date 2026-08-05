// src/mail/dto/send-mail.dto.ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SendMailDto {
  to: string;
  subject: string;
  text: string;
}