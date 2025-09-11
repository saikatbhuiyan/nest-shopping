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
    // Use userId if logged in, else IP
    const userId = request.ip;
    const path = request.method + ':' + request.route?.path;
    return `rate-limit:${userId}:${path}`;
  }
}
