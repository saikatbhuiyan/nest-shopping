import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { METRICS_KEY } from '../decorators/api-metrics.decorator';
import { Request } from 'express';

// Mock metrics client - replace with Prometheus/DataDog/NewRelic
class MetricsClient {
  increment(metric: string, tags?: Record<string, string>) {
    console.log(`[METRIC] ${metric}`, tags);
  }

  timing(metric: string, duration: number, tags?: Record<string, string>) {
    console.log(`[METRIC] ${metric}: ${duration}ms`, tags);
  }
}

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private metrics = new MetricsClient();

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const operationName = this.reflector.get<string>(
      METRICS_KEY,
      context.getHandler(),
    );

    if (!operationName) return next.handle();
    const startTime = Date.now();
    const req = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.metrics.timing(`api.${operationName}.duration`, duration, {
          method: req.method,
          status: 'success',
        });
        this.metrics.increment(`api.${operationName}.success`, {
          method: req.method,
        });
      }),
      catchError((error: unknown) => {
        const duration = Date.now() - startTime;
        this.metrics.timing(`api.${operationName}.duration`, duration, {
          method: req.method,
          status: 'error',
        });
        let errorName = 'Unknown';
        if (
          typeof error === 'object' &&
          error !== null &&
          'constructor' in error &&
          typeof (error as { constructor?: { name?: unknown } }).constructor
            ?.name === 'string'
        ) {
          errorName = (error as { constructor: { name: string } }).constructor
            .name;
        }
        this.metrics.increment(`api.${operationName}.error`, {
          method: req.method,
          error: errorName,
        });
        throw error;
      }),
    );
  }
}
