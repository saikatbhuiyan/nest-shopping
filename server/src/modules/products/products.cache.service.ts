import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/common/redis/redis.service';
import { Product } from 'src/database/entities/products/product.entity';
import { gzipSync, gunzipSync } from 'zlib';

@Injectable()
export class ProductsCacheService {
  private readonly logger = new Logger(ProductsCacheService.name);
  private readonly TTL = 3600; // 1 hour for individual product
  private readonly LIST_TTL = 300; // 5 minutes for product lists
  private readonly VERSION_KEY = 'products:version';

  constructor(private readonly redisService: RedisService) {}

  /** Retrieve current version for list cache */
  private async getVersion(): Promise<string> {
    const redis = this.redisService.getClient();
    const version = await redis.get(this.VERSION_KEY);
    return version ?? 'v1';
  }

  /** Increment version for list cache invalidation */
  private async bumpVersion(): Promise<void> {
    const redis = this.redisService.getClient();
    await redis.incr(this.VERSION_KEY);
  }

  private productKey(id: string): string {
    return `product:${id}`;
  }

  private async listKey(params: Record<string, unknown>): Promise<string> {
    const version = await this.getVersion();
    // safer stable stringify for cache key
    const serialized = JSON.stringify(params, Object.keys(params).sort());
    return `products:list:${version}:${serialized}`;
  }

  /** Fetch single product from cache */
  async getProduct(id: string): Promise<Product | null> {
    try {
      const redis = this.redisService.getClient();
      const cached = await redis.get(this.productKey(id));
      if (!cached) return null;

      const product = JSON.parse(cached) as Product;
      return product;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      this.logger.warn(`Redis getProduct failed: ${message}`);
      return null;
    }
  }

  /** Store single product in cache */
  async setProduct(id: string, product: Product): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      await redis.setex(this.productKey(id), this.TTL, JSON.stringify(product));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      this.logger.warn(`Redis getProduct failed: ${message}`);
      return null;
    }
  }

  /** Remove single product cache */
  async invalidateProduct(id: string): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      await redis.del(this.productKey(id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      this.logger.warn(`Redis getProduct failed: ${message}`);
      return null;
    }
  }

  /** Fetch cached product list */
  async getList<T = any>(params: Record<string, unknown>): Promise<T | null> {
    try {
      const redis = this.redisService.getClient();
      const key = await this.listKey(params);
      const cached = (await redis.getBuffer?.(key)) ?? null;

      if (!cached) return null;
      const decompressed = gunzipSync(cached);
      return JSON.parse(decompressed.toString()) as T;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      this.logger.warn(`Redis getList failed: ${message}`);
      return null;
    }
  }

  /** Cache product list */
  async setList(params: Record<string, unknown>, data: unknown): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      const key = await this.listKey(params);
      const compressed = gzipSync(JSON.stringify(data));
      await redis.setex(key, this.LIST_TTL, compressed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      this.logger.warn(`Redis setList failed: ${message}`);
    }
  }

  /** Invalidate all product lists via version bump */
  async invalidateAllLists(): Promise<void> {
    try {
      await this.bumpVersion();
      this.logger.log(
        '✅ Cache version bumped — list caches logically invalidated',
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      this.logger.warn(`Redis invalidateAllLists failed: ${message}`);
    }
  }

  /** Optional full cleanup fallback using SCAN */
  async clearAllListKeysFallback(): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      const stream = redis.scanStream({ match: 'products:list:*', count: 100 });
      for await (const keys of stream as AsyncIterable<string[]>) {
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
      this.logger.log('🧹 All list keys cleared via SCAN fallback');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      this.logger.warn(`Redis clearAllListKeysFallback failed: ${message}`);
    }
  }

  /** Warm-up product caches in bulk */
  async warmupCache(productIds: string[], products: Product[]): Promise<void> {
    if (!productIds.length || productIds.length !== products.length) return;
    try {
      const redis = this.redisService.getClient();
      const pipeline = redis.multi(); // compatible with redis@4.x
      products.forEach((product, idx) => {
        const key = this.productKey(productIds[idx]);
        pipeline.setex(key, this.TTL, JSON.stringify(product));
      });
      await pipeline.exec();
      this.logger.log(`🔥 Warmed up ${products.length} product caches`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      this.logger.warn(`Redis warmupCache failed: ${message}`);
    }
  }
}
