export interface SmsOptions {
  to: string;
  message: string;
  priority?: 'high' | 'low';
  senderId?: string;
  metadata?: Record<string, any>;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
  timestamp?: Date;
  cost?: number;
}

export interface BulkSmsResult {
  totalSent: number;
  totalFailed: number;
  results: SmsResult[];
  duration: number;
}
