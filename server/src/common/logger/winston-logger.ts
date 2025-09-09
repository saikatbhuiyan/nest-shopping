import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import 'winston-daily-rotate-file';
import { createLogFormat } from './log-format';

const isDev = process.env.NODE_ENV !== 'production';

export const WinstonLogger = WinstonModule.createLogger({
  level: isDev ? 'debug' : 'info',
  format: createLogFormat(isDev),
  transports: [
    new winston.transports.Console(),
    new winston.transports.DailyRotateFile({
      filename: 'logs/%DATE%-app.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'info',
    }),
  ],
});
