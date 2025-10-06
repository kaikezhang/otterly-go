import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Structured logger using Pino
 *
 * In development: Pretty-printed logs with colors
 * In production: JSON logs for log aggregation services
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // Pretty print in development
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,

  // Add custom formatters for production
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },

  // Base fields to include in all logs
  base: {
    env: process.env.NODE_ENV || 'development',
  },
});

/**
 * Create a child logger with additional context
 */
export const createLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};
