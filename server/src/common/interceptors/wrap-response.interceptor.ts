import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ApiResponse, NoWrapResponseOptions } from '../types';
import { Reflector } from '@nestjs/core';
import { NO_WRAP_RESPONSE } from '../decorators/no-wrap-response.decorator';

// Type guard with better type inference
function isApiResponse<T>(data: unknown): data is ApiResponse<T> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    'statusCode' in data &&
    'data' in data &&
    'timestamp' in data
  );
}

// Interface for data with meta
interface DataWithMeta {
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

// Type guard for data with meta
function hasMetaProperty<T>(data: T): data is T & DataWithMeta {
  return (
    typeof data === 'object' &&
    data !== null &&
    'meta' in data &&
    typeof (data as DataWithMeta).meta === 'object'
  );
}

@Injectable()
export class WrapResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  private readonly logger = new Logger(WrapResponseInterceptor.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | T> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { correlationId?: string }>();
    const response = http.getResponse<Response>();

    // Check if the endpoint has NoWrapResponse decorator
    const noWrapMetadata = this.reflector.getAllAndOverride<
      boolean | NoWrapResponseOptions
    >(NO_WRAP_RESPONSE, [context.getHandler(), context.getClass()]);

    // Handle different decorator formats
    const shouldSkipWrap = this.shouldSkipWrapping(noWrapMetadata);

    if (shouldSkipWrap) {
      this.logSkipReason(noWrapMetadata, context);
      return next.handle() as Observable<T>;
    }

    // Get configuration values at runtime for flexibility
    const enableWrap = this.configService.get<boolean>(
      'appConfig.wrapResponse',
      true,
    );

    if (!enableWrap) {
      return next.handle() as Observable<T>;
    }

    const apiVersion = this.configService.get<string>(
      'appConfig.apiVersion',
      '1.0',
    );

    const correlationId = request.correlationId ?? this.generateCorrelationId();
    const statusCode = response.statusCode ?? 200;

    return next.handle().pipe(
      map((data: T): ApiResponse<T> | T => {
        try {
          // If already wrapped, don't wrap again
          if (isApiResponse<T>(data)) {
            return data;
          }

          const wrappedResponse = this.wrapResponse(
            data,
            statusCode,
            correlationId,
            apiVersion,
          );

          return wrappedResponse;
        } catch (error) {
          this.logger.error('Error wrapping response:', error);
          // Return original data if wrapping fails
          return data;
        }
      }),
      catchError((error): Observable<never> => {
        this.logger.error('Error in response interceptor:', error);
        throw error;
      }),
    );
  }

  private shouldSkipWrapping(
    metadata: boolean | NoWrapResponseOptions | undefined,
  ): boolean {
    if (typeof metadata === 'boolean') {
      return metadata;
    }

    if (typeof metadata === 'object' && metadata !== null) {
      return metadata.skipWrap ?? true;
    }

    return false;
  }

  private logSkipReason(
    metadata: boolean | NoWrapResponseOptions | undefined,
    context: ExecutionContext,
  ): void {
    if (!context?.getHandler || !context?.getClass) {
      this.logger.debug('Skipping response wrapping - invalid context');
      return;
    }

    const handler = context.getHandler()?.name ?? 'unknown';
    const controller = context.getClass()?.name ?? 'unknown';

    if (typeof metadata === 'object' && metadata?.reason) {
      this.logger.debug(
        `Skipping response wrapping for ${controller}.${handler}: ${metadata.reason}`,
      );
    } else {
      this.logger.debug(
        `Skipping response wrapping for ${controller}.${handler}`,
      );
    }
  }

  private wrapResponse<T>(
    data: T,
    statusCode: number,
    correlationId: string,
    apiVersion: string,
  ): ApiResponse<T> {
    let payload: T = data;
    let meta: Record<string, unknown> | undefined;

    // Safely extract meta if present
    if (hasMetaProperty(data)) {
      try {
        const { meta: extractedMeta, ...rest } = data;
        meta = extractedMeta;
        payload = rest as T;
      } catch (error) {
        this.logger.warn('Failed to extract meta, using original data:', error);
        payload = data;
      }
    }

    const response: ApiResponse<T> = {
      success: statusCode >= 200 && statusCode < 300,
      statusCode,
      message: this.getStatusMessage(statusCode),
      data: payload,
      timestamp: new Date().toISOString(),
      correlationId,
      version: apiVersion,
      ...(meta && { meta }),
    };

    return response;
  }

  private getStatusMessage(statusCode: number): string {
    // More comprehensive status messages
    switch (true) {
      case statusCode >= 200 && statusCode < 300:
        return 'Request successful';
      case statusCode >= 300 && statusCode < 400:
        return 'Redirection';
      case statusCode === 400:
        return 'Bad request';
      case statusCode === 401:
        return 'Unauthorized';
      case statusCode === 403:
        return 'Forbidden';
      case statusCode === 404:
        return 'Not found';
      case statusCode >= 400 && statusCode < 500:
        return 'Client error';
      case statusCode === 500:
        return 'Internal server error';
      case statusCode >= 500:
        return 'Server error';
      default:
        return 'Unknown status';
    }
  }

  private generateCorrelationId(): string {
    // Using substring instead of deprecated substr
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Additional utility function for manual wrapping if needed
export function createApiResponse<T>(
  data: T,
  options: Partial<{
    statusCode: number;
    message: string;
    correlationId: string;
    version: string;
    meta: Record<string, unknown>;
  }> = {},
): ApiResponse<T> {
  const {
    statusCode = 200,
    message = 'Request successful',
    correlationId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    version = '1.0',
    meta,
  } = options;

  return {
    success: statusCode >= 200 && statusCode < 300,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
    correlationId,
    version,
    ...(meta && { meta }),
  };
}
