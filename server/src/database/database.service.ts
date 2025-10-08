import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from 'src/config/config.types';

@Injectable()
export class DatabaseService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const dbConfig = this.configService.get<AppConfig['database']>('database');
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    return {
      type: 'postgres',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.name,
      autoLoadEntities: true,
      synchronize: false,
      logging: !isProduction,

      extra: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        statement_timeout: 10000,
        query_timeout: 10000,
        ...(isProduction && {
          ssl: { rejectUnauthorized: true },
        }),
      },

      maxQueryExecutionTime: 1000,

      replication: isProduction
        ? {
            master: {
              host: this.configService.get('DB_MASTER_HOST'),
              port: Number(this.configService.get('DB_PORT')),
              username: this.configService.get('DB_USER'),
              password: this.configService.get('DB_PASS'),
              database: this.configService.get('DB_NAME'),
            },
            slaves: [
              {
                host: this.configService.get('DB_REPLICA1_HOST'),
                port: Number(this.configService.get('DB_PORT')),
                username: this.configService.get('DB_USER'),
                password: this.configService.get('DB_PASS'),
                database: this.configService.get('DB_NAME'),
              },
            ],
          }
        : undefined,
    };
  }
}
