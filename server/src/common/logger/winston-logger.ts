import * as winston from 'winston';

import 'winston-daily-rotate-file';

import { createLogFormat } from './log-format';

const isDev = process.env.NODE_ENV !== 'production';

const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

export const winstonLoggerConfig = {
  level: logLevel,

  format: createLogFormat(isDev),

  transports: [
    new winston.transports.Console({
      level: logLevel,

      format: isDev
        ? winston.format.combine(
            winston.format.colorize(),

            winston.format.timestamp(),

            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaString =
                Object.keys(meta).length > 0
                  ? ` | ${JSON.stringify(meta)}`
                  : '';

              return `[${timestamp}] ${level}: ${message}${metaString}`;
            }),
          )
        : winston.format.combine(
            winston.format.timestamp(),

            winston.format.json(),
          ),
    }),

    // File Transport (prod only)

    ...(isDev
      ? []
      : [
          new winston.transports.DailyRotateFile({
            filename: 'logs/%DATE%-app.log',

            datePattern: 'YYYY-MM-DD',

            zippedArchive: true,

            maxSize: '20m',

            maxFiles: '30d',

            level: logLevel,

            format: winston.format.combine(
              winston.format.timestamp(),

              winston.format.json(),
            ),
          }),
        ]),
  ],
};
