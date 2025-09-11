import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';
import { Request } from 'express';
import { AuthenticatedRequest } from 'src/modules/auth/interface/active-user-data-interface';
import { RedisService } from 'src/common/redis/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!options) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const key = this.generateKey(request);

    const redis = this.redisService.getClient();
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, Math.floor(options.windowMs / 1000));
    }

    if (current > options.max) {
      await redis.ttl(key);
      throw new HttpException(
        options.message || 'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private generateKey(request: Request): string {
    // Prefer userId from JWT/session if available
    const req = request as AuthenticatedRequest;
    const userId = req.user?.sub;

    // Fall back to client IP if not authenticated
    const identifier = userId ? `user:${userId}` : `ip:${request.ip}`;

    // Use method + URL path for granularity
    const path = `${request.method}:${request.originalUrl.split('?')[0]}`;

    return `rate-limit:${identifier}:${path}`;
  }
}
