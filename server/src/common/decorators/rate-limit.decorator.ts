import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  windowMs: number; // e.g., 15 * 60 * 1000 = 15 minutes
  max: number; // maximum requests allowed in the window
  message?: string;
}

export const RATE_LIMIT_KEY = 'rate_limit';
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
