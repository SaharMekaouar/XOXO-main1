import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Resend } from 'resend';
import { SendMailDto } from './dto/send-mail.dto';

@Injectable()
export class MailService {
  private readonly resend = new Resend(process.env.RESEND_API_KEY);
  private readonly defaultFrom = process.env.MAIL_FROM!;

  async sendMail(dto: SendMailDto): Promise<void> {
    const { to, subject, text } = dto;

    try {
      const { error } = await this.resend.emails.send({
        from: this.defaultFrom,
        to: [to],
        subject,
        text,
      });

      if (error) {
        console.error('Error sending email:', error);
        throw new InternalServerErrorException('Error sending email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      throw new InternalServerErrorException('Error sending email');
    }
  }
}