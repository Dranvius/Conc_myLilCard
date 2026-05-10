import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendMail(to: string, subject: string, html: string, from?: string) {
    const fromName = this.configService.get<string>('MAIL_FROM_NAME');
    const fromAddress = this.configService.get<string>('MAIL_FROM_ADDRESS');

    try {
      const info = await this.transporter.sendMail({
        from: from ?? `"${fromName}" <${fromAddress}>`,
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      this.logger.error(`Error sending email to ${to}:`, error);
      throw error;
    }
  }

  async sendTemplate(
    to: string,
    subject: string,
    templateName: string,
    context: Record<string, any>,
  ) {
    // Basic string replacement for now, could use Handlebars later
    let html = `<h1>Hola ${context.name || ''}</h1><p>Esta es una secuencia automática.</p>`;
    
    return this.sendMail(to, subject, html);
  }
}
