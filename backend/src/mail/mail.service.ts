
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SendMailDto } from './dto/send-mail.dto';

@Injectable()
export class MailService {
  private readonly defaultFrom = process.env.EMAIL_USER || process.env.GMAIL_USER || 'recapifyapplication@gmail.com';
  private readonly appPassword = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

  async sendMail(dto: SendMailDto): Promise<void> {
    const { to, subject, text } = dto;

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.defaultFrom,
          pass: this.appPassword,
        },
      });

      await transporter.sendMail({
        from: this.defaultFrom,
        to,
        subject,
        text,
      });
    } catch (error) {
      console.error("Error sending email :", error);
      throw new InternalServerErrorException('Error sending email');
    }
  }
}
