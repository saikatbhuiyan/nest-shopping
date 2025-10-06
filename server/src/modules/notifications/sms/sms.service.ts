/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { BulkSmsResult, SmsOptions, SmsResult } from './sms.interface';

@Injectable()
export abstract class SmsService {
  // Fixed: Method name case inconsistency
  abstract sendSms(options: SmsOptions): Promise<SmsResult>;

  // Fixed: Changed to accept array of SmsOptions and return results
  abstract sendBulkSms(options: SmsOptions[]): Promise<BulkSmsResult>;

  abstract validateConfig(): boolean;

  // Made public for external health checks
  public async healthCheck(): Promise<boolean> {
    return this.validateConfig();
  }

  // Helper method for phone number validation (E.164 format)
  protected isValidPhoneNumber(phoneNumber: string): boolean {
    // E.164 format: +[country code][number]
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  // Helper method for message validation
  protected validateMessage(
    message: string,
    maxLength: number = 1600,
  ): string | null {
    if (!message || message.trim().length === 0) {
      return 'Message cannot be empty';
    }
    if (message.length > maxLength) {
      return `Message too long. Maximum ${maxLength} characters allowed.`;
    }
    return null;
  }
}
