import winston from 'winston';
import { config } from './env';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) =>
      `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.uncolorize(),
  }),
  new winston.transports.File({
    filename: 'logs/app.log',
    format: winston.format.uncolorize(),
  }),
];

// Add Datadog transport in production
if (config.nodeEnv === 'production' && config.datadog.enabled) {
  // Datadog Winston Transport can be added here
  // For now, we'll use HTTP transport pattern that Datadog supports
  transports.push(
    new winston.transports.File({
      filename: 'logs/datadog.log',
      level: 'info',
      format: winston.format.json(),
    }),
  );
}

export const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'warn' : 'debug',
  levels,
  format,
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Request logger for morgan integration
export const morganLogger = {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    },
  },
};

// Log startup information
export function logStartup(): void {
  logger.info('==========================================');
  logger.info(`Identity Service starting...`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Node Version: ${process.version}`);
  logger.info(`Port: ${config.port}`);
  logger.info(`Database Host: ${config.database.host}`);
  logger.info(`Redis Host: ${config.redis.host}`);
  logger.info('==========================================');
}

// Log critical error
export function logCriticalError(error: unknown): void {
  logger.error('CRITICAL ERROR:', error instanceof Error ? error.message : String(error));
  logger.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
}

// Log application shutdown
export function logShutdown(): void {
  logger.info('Application shutting down gracefully...');
}
