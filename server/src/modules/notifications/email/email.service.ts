// email.service.ts
import { Injectable } from '@nestjs/common';
import { IEmail } from './email.interface';

@Injectable()
export abstract class EmailService {
  abstract sendEmail(options: IEmail): Promise<void>;
}
