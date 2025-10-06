import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';
import { SmsOptions, SmsResult, BulkSmsResult } from './sms.interface';
import {
  SNSClient,
  PublishCommand,
  PublishCommandInput,
  GetSMSAttributesCommand,
  SetSMSAttributesCommand,
  CheckIfPhoneNumberIsOptedOutCommand,
} from '@aws-sdk/client-sns';

@Injectable()
export class AwsSnsService extends SmsService implements OnModuleInit {
  private readonly logger = new Logger(AwsSnsService.name);
  private snsClient: SNSClient;
  private readonly maxConcurrency = 10;
  private readonly maxRetries = 3;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async onModuleInit() {
    this.initializeClient();
    await this.configureSmsAttributes();
  }

  private initializeClient(): void {
    try {
      const region = this.configService.get<string>('AWS_REGION');
      const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get<string>(
        'AWS_SECRET_ACCESS_KEY',
      );

      if (!region || !accessKeyId || !secretAccessKey) {
        throw new Error('AWS SNS credentials are not properly configured');
      }

      this.snsClient = new SNSClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        maxAttempts: this.maxRetries,
      });

      this.logger.log(`AWS SNS client initialized for region: ${region}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to initialize AWS SNS client: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  private async configureSmsAttributes(): Promise<void> {
    try {
      const defaultSenderId = this.configService.get<string>(
        'AWS_SNS_DEFAULT_SENDER_ID',
      );
      const smsType = this.configService.get<string>(
        'AWS_SNS_DEFAULT_SMS_TYPE',
        'Transactional',
      );

      const attributes: Record<string, string> = {
        DefaultSMSType: smsType,
      };

      if (defaultSenderId) {
        attributes.DefaultSenderID = defaultSenderId;
      }

      const command = new SetSMSAttributesCommand({
        attributes,
      });

      await this.snsClient.send(command);
      this.logger.log('AWS SNS SMS attributes configured successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to set SMS attributes: ${errorMessage}. Using defaults.`,
      );
    }
  }

  async sendSms(options: SmsOptions): Promise<SmsResult> {
    const startTime = Date.now();

    try {
      // Validate phone number
      if (!this.isValidPhoneNumber(options.to)) {
        return this.createErrorResult(
          'Invalid phone number format. Expected E.164 format (e.g., +1234567890)',
          startTime,
        );
      }

      // Validate message
      const messageError = this.validateMessage(options.message, 1600);
      if (messageError) {
        return this.createErrorResult(messageError, startTime);
      }

      // Check if phone number is opted out
      const isOptedOut = await this.checkIfOptedOut(options.to);
      if (isOptedOut) {
        return this.createErrorResult(
          'Phone number has opted out of receiving SMS messages',
          startTime,
        );
      }

      // Prepare SNS publish parameters
      const params: PublishCommandInput = {
        Message: options.message,
        PhoneNumber: options.to,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue:
              options.priority === 'high' ? 'Transactional' : 'Promotional',
          },
        },
      };

      // Add sender ID if provided
      if (options.senderId && params.MessageAttributes) {
        params.MessageAttributes['AWS.SNS.SMS.SenderID'] = {
          DataType: 'String',
          StringValue: options.senderId,
        };
      }

      // Add max price
      const maxPrice = this.configService.get<string>('AWS_SNS_MAX_PRICE');
      if (maxPrice && params.MessageAttributes) {
        params.MessageAttributes['AWS.SNS.SMS.MaxPrice'] = {
          DataType: 'String',
          StringValue: maxPrice,
        };
      }

      // Send SMS
      const command = new PublishCommand(params);
      const response = await this.snsClient.send(command);

      const duration = Date.now() - startTime;
      this.logger.log(
        `SMS sent successfully via AWS SNS to ${options.to} (${duration}ms) - MessageId: ${response.MessageId}`,
      );

      return {
        success: true,
        messageId: response.MessageId,
        provider: 'aws-sns',
        timestamp: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `AWS SNS SMS failed to ${options.to} after ${duration}ms: ${errorMessage}`,
        errorStack,
      );

      return this.createErrorResult(this.formatAwsError(error), startTime);
    }
  }

  async sendBulkSms(options: SmsOptions[]): Promise<BulkSmsResult> {
    const startTime = Date.now();

    if (!options || options.length === 0) {
      this.logger.warn('sendBulkSms called with empty options array');
      return {
        totalSent: 0,
        totalFailed: 0,
        results: [],
        duration: 0,
      };
    }

    this.logger.log(`Starting bulk SMS send to ${options.length} recipients`);

    const results: SmsResult[] = [];
    const batches = this.chunkArray(options, this.maxConcurrency);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.log(
        `Processing batch ${i + 1}/${batches.length} (${batch.length} messages)`,
      );

      const batchResults = await Promise.allSettled(
        batch.map((option) => this.sendSms(option)),
      );

      const mappedResults = batchResults.map((result) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          const errorMessage =
            result.reason instanceof Error
              ? result.reason.message
              : 'Unknown error';
          return this.createErrorResult(errorMessage, startTime);
        }
      });

      results.push(...mappedResults);

      if (i < batches.length - 1) {
        await this.delay(100);
      }
    }

    const duration = Date.now() - startTime;
    const totalSent = results.filter((r) => r.success).length;
    const totalFailed = results.filter((r) => !r.success).length;

    this.logger.log(
      `Bulk SMS completed: ${totalSent} sent, ${totalFailed} failed in ${duration}ms`,
    );

    return {
      totalSent,
      totalFailed,
      results,
      duration,
    };
  }

  async checkIfOptedOut(phoneNumber: string): Promise<boolean> {
    try {
      const command = new CheckIfPhoneNumberIsOptedOutCommand({
        phoneNumber,
      });
      const response = await this.snsClient.send(command);
      return response.isOptedOut || false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to check opt-out status for ${phoneNumber}: ${errorMessage}`,
      );
      return false;
    }
  }

  async getSmsAttributes(): Promise<Record<string, string>> {
    try {
      const command = new GetSMSAttributesCommand({});
      const response = await this.snsClient.send(command);
      return response.attributes || {};
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to get SMS attributes: ${errorMessage}`,
        errorStack,
      );
      return {};
    }
  }

  validateConfig(): boolean {
    try {
      const region = this.configService.get<string>('AWS_REGION');
      const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get<string>(
        'AWS_SECRET_ACCESS_KEY',
      );

      const isValid = !!(region && accessKeyId && secretAccessKey);

      if (!isValid) {
        this.logger.warn('AWS SNS configuration is incomplete');
      }

      return isValid;
    } catch (error) {
      this.logger.error('AWS SNS config validation failed', error);
      return false;
    }
  }

  public override async healthCheck(): Promise<boolean> {
    try {
      const configValid = this.validateConfig();

      if (!configValid) {
        return false;
      }

      await this.getSmsAttributes();

      this.logger.log('AWS SNS health check passed');
      return true;
    } catch (error) {
      this.logger.error('AWS SNS health check failed', error);
      return false;
    }
  }

  // ==================== HELPER METHODS ====================

  private createErrorResult(error: string, startTime: number): SmsResult {
    const duration = Date.now() - startTime;
    this.logger.warn(`SMS send failed: ${error} (${duration}ms)`);
    return {
      success: false,
      error,
      provider: 'aws-sns',
      timestamp: new Date(),
    };
  }

  private formatAwsError(error: unknown): string {
    if (error && typeof error === 'object' && 'name' in error) {
      const errorName = (error as { name: string }).name;

      if (errorName === 'InvalidParameterException') {
        return 'Invalid SMS parameters. Check phone number format and message content.';
      }
      if (errorName === 'ThrottlingException') {
        return 'Rate limit exceeded. Please try again later.';
      }
      if (errorName === 'AuthorizationErrorException') {
        return 'AWS credentials are invalid or expired.';
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown AWS SNS error occurred';
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
