import { Module } from '@nestjs/common';
import { EmailService } from './email/email.service';
import { NodemailerService } from './email/nodemailer.service';

@Module({
  providers: [
    {
      provide: EmailService,
      useClass: NodemailerService,
    },
    NodemailerService,
  ],
})
export class NotificationsModule {}
