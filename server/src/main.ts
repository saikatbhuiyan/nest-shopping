import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Logging
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const logger = new Logger('Bootstrap');

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );

  // CORS
  const configService = app.get(ConfigService);
  const allowedOrigins = (configService.get<string>('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  app.enableCors({
    origin:
      allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:3000'],
    credentials: true,
  });

  app.use(compression());

  app.use(cookieParser());

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true, // transform types like dto to class instance
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const options = new DocumentBuilder()
    .setTitle('CoffeeScript')
    .setDescription('Coffee application')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'Authorization',
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);

  // Start server
  const httpPort = configService.getOrThrow<number>('app_port');
  try {
    await app.listen(httpPort);
    logger.log(`🚀 Application running on port ${httpPort}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(
        '❌ Error starting the application',
        error.stack || error.message,
      );
    } else {
      logger.error('❌ Error starting the application', error);
    }
  }
}
bootstrap();
