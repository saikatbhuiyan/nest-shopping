import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from 'src/config/config.types';

@Injectable()
export class DatabaseService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const dbConfig = this.configService.get<AppConfig['database']>('database');

    const isProduction = this.configService.get('NODE_ENV') === 'production';

    return {
      type: 'postgres',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.name,
      autoLoadEntities: true,
      synchronize: false, // disable in production
      logging: !isProduction,

      // Connection pooling
      extra: {
        max: 20, // Maximum pool size
        min: 5, // Minimum pool size
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,

        // Performance optimizations
        statement_timeout: 10000, // 10s query timeout
        query_timeout: 10000,

        // SSL for production
        // ...(isProduction && {
        //   ssl: {
        //     rejectUnauthorized: true,
        //   },
        // }),
      },

      // Query logging for slow queries
      maxQueryExecutionTime: 1000,

      // Read replicas for read-heavy workloads
      replication: isProduction
        ? {
            master: {
              host: this.configService.get('DB_MASTER_HOST'),
              port: this.configService.get('DB_PORT'),
              username: this.configService.get('DB_USER'),
              password: this.configService.get('DB_PASS'),
              database: this.configService.get('DB_NAME'),
            },
            slaves: [
              {
                host: this.configService.get('DB_REPLICA1_HOST'),
                port: this.configService.get('DB_PORT'),
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
