import {
  Controller,
  Post,
  Body,
  Get,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { SmsService } from './sms.service';
import { AwsSnsService } from './aws-sns.service';
import { SmsOptions } from './sms.interface';

// DTO for validation
class SendSmsDto {
  to: string;
  message: string;
  priority?: 'high' | 'low';
  senderId?: string;
}

class SendBulkSmsDto {
  recipients: SmsOptions[];
}

@Controller('sms')
export class SmsController {
  constructor(
    private readonly smsService: SmsService,
    private readonly awsSnsService: AwsSnsService,
  ) {}

  @Post('send')
  async sendSms(@Body() dto: SendSmsDto) {
    const result = await this.smsService.sendSms(dto);

    if (!result.success) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: result.error,
          provider: result.provider,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return result;
  }

  @Post('send-bulk')
  async sendBulkSms(@Body() dto: SendBulkSmsDto) {
    if (!dto.recipients || dto.recipients.length === 0) {
      throw new HttpException(
        'Recipients array cannot be empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.smsService.sendBulkSms(dto.recipients);
    return result;
  }

  @Get('health')
  healthCheck() {
    const isHealthy = this.smsService.healthCheck();

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      provider: 'aws-sns',
      timestamp: new Date(),
    };
  }

  @Get('attributes')
  async getSmsAttributes() {
    const attributes = await this.awsSnsService.getSmsAttributes();
    return {
      attributes,
      timestamp: new Date(),
    };
  }

  @Post('check-opted-out')
  async checkOptedOut(@Body() body: { phoneNumber: string }) {
    const isOptedOut = await this.awsSnsService.checkIfOptedOut(
      body.phoneNumber,
    );

    return {
      phoneNumber: body.phoneNumber,
      isOptedOut,
      timestamp: new Date(),
    };
  }
}
