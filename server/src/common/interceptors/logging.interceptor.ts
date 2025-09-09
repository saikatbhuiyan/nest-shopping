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
import type { LoggerService } from '@nestjs/common';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly isDev: boolean;
  private readonly sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'refreshToken',
  ];

  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
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

    const handlerName = context.getHandler().name;
    const controllerName = context.getClass().name;
    const startTime = Date.now();

    // Log incoming request
    this.logger.log({
      event: 'request_received',
      method,
      url,
      ip,
      userAgent,
      correlationId,
      controller: controllerName,
      handler: handlerName,
      headers: this.isDev ? this.sanitize(request.headers) : undefined,
      body: this.isDev ? this.sanitize(request.body) : undefined,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap((responseBody) => {
        const { statusCode } = response;
        const duration = Date.now() - startTime;

        const requestSize = request.body
          ? JSON.stringify(request.body).length
          : 0;
        const responseSize = responseBody
          ? JSON.stringify(
              this.isDev ? this.sanitize(responseBody) : responseBody,
            ).length
          : 0;

        const level =
          statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

        this.logger.log(level, {
          event: 'response_sent',
          method,
          url,
          statusCode,
          duration,
          correlationId,
          controller: controllerName,
          handler: handlerName,
          requestSize,
          responseSize,
          responseBody: this.isDev ? this.sanitize(responseBody) : undefined,
          timestamp: new Date().toISOString(),
        });
      }),
      catchError((error: HttpException | Error) => {
        const duration = Date.now() - startTime;
        const status = error instanceof HttpException ? error.getStatus() : 500;
        const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

        this.logger.error(level, {
          event: 'error',
          method,
          url,
          status,
          duration,
          message: error.message,
          stack: this.isDev ? error.stack : undefined,
          correlationId,
          controller: controllerName,
          handler: handlerName,
          timestamp: new Date().toISOString(),
        });

        return throwError(() => error);
      }),
    );
  }

  private sanitize(body: unknown, depth = 1): unknown {
    if (!body || typeof body !== 'object') return body;
    if (Array.isArray(body))
      return depth > 0 ? body.map((i) => this.sanitize(i, depth - 1)) : body;
    const clone: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      clone[k] = this.sensitiveFields.includes(k)
        ? '***'
        : depth > 0 && typeof v === 'object'
          ? this.sanitize(v, depth - 1)
          : v;
    }
    return clone;
  }
}
