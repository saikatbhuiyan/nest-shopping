import { Module } from '@nestjs/common';
import { EmailService } from './email/email.service';
import { NodemailerService } from './email/nodemailer.service';
import { SmsService } from './sms/sms.service';
import { AwsSnsService } from './sms/aws-sns.service';
@Module({
  providers: [
    {
      provide: EmailService,
      useClass: NodemailerService,
    },
    NodemailerService,
    // {
    //   provide: SmsService,
    //   useClass: AwsSnsService,
    // },
    // AwsSnsService,
  ],
})
export class NotificationsModule {}
