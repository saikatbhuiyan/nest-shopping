import { SetMetadata } from '@nestjs/common';

export const METRICS_KEY = 'metrics';
export const ApiMetrics = (operationName: string) =>
  SetMetadata(METRICS_KEY, operationName);
