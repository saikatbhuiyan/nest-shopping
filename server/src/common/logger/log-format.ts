import winston from 'winston';

const { combine, timestamp, errors, printf, colorize, splat, json } =
  winston.format;

export const createLogFormat = (isDev: boolean) =>
  isDev
    ? combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        splat(),
        printf(({ timestamp, level, message, stack, ...meta }) => {
          const metaStr =
            Object.keys(meta).length > 0
              ? ` | meta: ${JSON.stringify(meta)}`
              : '';
          // Ensure stack is a string
          const stackStr =
            typeof stack === 'string'
              ? ` | stack: ${stack}`
              : stack
                ? ` | stack: ${JSON.stringify(stack)}`
                : '';
          return `${String(timestamp)} ${level}: ${String(message)}${stackStr}${metaStr}`;
        }),
      )
    : combine(timestamp(), errors({ stack: true }), json());
