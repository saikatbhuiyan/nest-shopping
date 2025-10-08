import * as winston from 'winston';
import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { ConfigModule } from '@nestjs/config';

import appConfig from './config';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { WrapResponseInterceptor } from './common/interceptors/wrap-response.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { NotificationSettingsModule } from './modules/notification-settings/notification-settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import environmentValidation from './config/enviroment.validation';
import { winstonLoggerConfig } from './common/logger/winston-logger';
import { ProductsModule } from './modules/products/products.module';
import { BrandsModule } from './modules/brands/brands.module';
import { ProductTypesModule } from './modules/product-types/product-types.module';

// Get the current NODE_ENV
const ENV = process.env.NODE_ENV || 'development';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: !ENV ? '.env' : `.env.${ENV}`,
      load: [appConfig],
      validationSchema: environmentValidation,
    }),
    WinstonModule.forRoot(winstonLoggerConfig),
    DatabaseModule,
    CommonModule,
    AuthModule,
    NotificationSettingsModule,
    NotificationsModule,
    ProductsModule,
    BrandsModule,
    ProductTypesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: WrapResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
