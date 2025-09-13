import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { IEmail } from './email.interface';
import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { AppConfig } from 'src/config/config.types';

@Injectable()
export class NodemailerService extends EmailService implements OnModuleInit {
  private readonly logger = new Logger(NodemailerService.name);
  private transporter: Transporter;
  private readonly fromAddress: string;
  private verified = false;

  constructor(private readonly configService: ConfigService) {
    super();

    const smtpConfig =
      this.configService.getOrThrow<AppConfig['smtp_mail']>('smtp_mail');

    this.transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });

    this.fromAddress = smtpConfig.from;
  }

  /** Run on app startup (warn only) */
  async onModuleInit(): Promise<void> {
    try {
      await this.transporter.verify();
      this.verified = true;
      this.logger.log(
        '✅ SMTP connection verified successfully (startup check)',
      );
    } catch (error) {
      this.logger.warn(
        `⚠️ SMTP verification failed at startup: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async sendEmail(options: IEmail) {
    if (!this.verified) {
      try {
        await this.transporter.verify();
        this.verified = true;
        this.logger.log('✅ SMTP connection verified successfully (on send)');
      } catch (error) {
        this.logger.error(
          '❌ SMTP connection verification failed on send',
          error instanceof Error ? error.stack : String(error),
        );
        throw error;
      }
    }

    const mailOptions: SendMailOptions = {
      from: options.from || this.fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    try {
      const info = (await this.transporter.sendMail(mailOptions)) as unknown;
      this.logger.log(
        `📧 Email sent to ${options.to} | MessageId: ${info['messageId']}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send email to ${options.to}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
