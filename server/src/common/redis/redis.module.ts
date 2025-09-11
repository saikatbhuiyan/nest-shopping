import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global() // optional: makes RedisService available app-wide
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
