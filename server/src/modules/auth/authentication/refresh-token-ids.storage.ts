import { Injectable } from '@nestjs/common';
import { InvalidateRefreshTokenError } from 'src/common/errors/extend.error';
import { RedisService } from 'src/common/redis/redis.service';

@Injectable()
export class RefreshTokenIdsStorage {
  constructor(private readonly redisService: RedisService) {}

  private get redis() {
    const client = this.redisService.getClient();
    if (!client) {
      throw new Error('Redis client not initialized');
    }
    return client;
  }

  async insert(userId: number, tokenId: string): Promise<void> {
    await this.redis.set(this.getKey(userId), tokenId);
  }

  async validate(userId: number, tokenId: string): Promise<boolean> {
    const storedToken = await this.redis.get(this.getKey(userId));
    if (!storedToken || storedToken !== tokenId) {
      throw new InvalidateRefreshTokenError();
    }
    return true;
  }

  async invalidate(userId: number): Promise<void> {
    await this.redis.del(this.getKey(userId));
  }

  private getKey(userId: number): string {
    return `refresh-token:${userId}`;
  }
}
