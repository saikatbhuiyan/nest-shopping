import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ConfigService } from '@nestjs/config';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { correlationId?: string }>();

    const correlationId = request.correlationId ?? '';
    const path = request.url;
    const timestamp = new Date().toISOString();

    let status: number;
    let message: string;
    let errors: Array<Record<string, unknown> | string> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message =
          (obj.message as string | undefined) ??
          (obj.error as string | undefined) ??
          'Error';
        if (Array.isArray(obj.message)) errors = obj.message as Array<string>;
      } else {
        message = 'Error';
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
      errors = exception.stack ? [exception.stack] : undefined;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Unexpected error';
    }

    const apiVersion = this.configService.get<string>(
      'appConfig.apiVersion',
      '1.0',
    );

    const apiResponse: ApiResponse<null> = {
      success: false,
      version: apiVersion,
      statusCode: status,
      message,
      data: null,
      timestamp,
      correlationId,
      path,
      errors,
    };

    // Log the error using Winston
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    this.logger.log(level, message, {
      status,
      correlationId,
      path,
      errors,
      stack: exception instanceof Error ? exception.stack : undefined,
      timestamp,
    });

    response.status(status).json(apiResponse);
  }
}
