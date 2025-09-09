import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly isDev: boolean;

  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const env = this.configService.get<string>('NODE_ENV', 'development');
    this.isDev = env !== 'production';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const { method, url, ip } = request;
    const userAgent = request.get('User-Agent') || '';
    const correlationId =
      (request.headers['x-request-id'] as string) || randomUUID();

    const startTime = Date.now();

    this.logger.info({
      event: 'request_received',
      method,
      url,
      ip,
      userAgent,
      correlationId,
      headers: this.isDev ? request.headers : undefined,
      body: this.isDev ? this.sanitize(request.body) : undefined,
    });

    return next.handle().pipe(
      tap(() => {
        const { statusCode } = response;
        const duration = Date.now() - startTime;

        this.logger.info({
          event: 'response_sent',
          method,
          url,
          statusCode,
          duration,
          correlationId,
        });
      }),
      catchError((error: HttpException | Error) => {
        const duration = Date.now() - startTime;
        const status = error instanceof HttpException ? error.getStatus() : 500;
        const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

        this.logger.log(level, {
          event: 'request_error',
          method,
          url,
          status,
          duration,
          message: error.message,
          stack: this.isDev ? error.stack : undefined,
          correlationId,
        });

        return throwError(() => error);
      }),
    );
  }

  private sanitize(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    const clone = { ...(body as Record<string, unknown>) };
    if ('password' in clone) clone['password'] = '***';
    if ('token' in clone) clone['token'] = '***';
    return clone;
  }
}
