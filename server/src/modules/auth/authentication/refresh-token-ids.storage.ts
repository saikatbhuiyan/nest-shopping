import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { InvalidateRefreshTokenError } from 'src/common/errors/extend.error';
import { RedisService } from 'src/common/redis/redis.service';

@Injectable()
export class RefreshTokenIdsStorage {
  private refreshTokenTTL: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.refreshTokenTTL = this.configService.get<number>(
      'jwt.refreshTokenTtl',
    );
  }

  private get redis() {
    const client = this.redisService.getClient();
    if (!client) {
      throw new Error('Redis client not initialized');
    }
    return client;
  }

  async insert(
    userId: number,
    tokenId: string,
    deviceId: string,
  ): Promise<void> {
    const key = `refresh-token:${userId}:${deviceId}`;
    await this.redis.set(key, tokenId, 'EX', this.refreshTokenTTL);
  }

  async getToken(userId: number, deviceId: string): Promise<string | null> {
    const key = `refresh-token:${userId}:${deviceId}`;
    return await this.redis.get(key);
  }

  async validate(
    userId: number,
    tokenId: string,
    deviceId: string,
  ): Promise<boolean> {
    const key = `refresh-token:${userId}:${deviceId}`;
    const storedToken = await this.redis.get(key);
    if (!storedToken || storedToken !== tokenId)
      throw new InvalidateRefreshTokenError();
    return true;
  }

  async invalidate(userId: number, deviceId: string): Promise<void> {
    const key = `refresh-token:${userId}:${deviceId}`;
    await this.redis.del(key);
  }
}
