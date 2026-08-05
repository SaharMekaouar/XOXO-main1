// src/mail/mail.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { MailService } from './mail.service';
import { SendMailDto } from './dto/send-mail.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

@Post('send')
async sendMail(@Body() body: { to: string; subject: string; text: string }) {
  const { to, subject, text } = body;
  return this.mailService.sendMail(body);
}

  
}

