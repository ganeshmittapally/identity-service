import { createApp } from './app';
import { initializeDatabase, closeDatabase } from './config/database';
import { initializeRedis, closeRedis } from './config/redis';
import { logger, logStartup, logShutdown, logCriticalError } from './config/logger';
import { config } from './config/env';

const app = createApp();
const PORT = config.port;

async function startServer(): Promise<void> {
  try {
    // Initialize database connection
    logStartup();
    logger.info('Initializing database connection...');
    await initializeDatabase();

    // Initialize Redis connection
    logger.info('Initializing Redis connection...');
    await initializeRedis();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Identity Service listening on port ${PORT}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
      logger.info(`Redis: ${config.redis.host}:${config.redis.port}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal} signal, starting graceful shutdown...`);
      logShutdown();

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await closeDatabase();
          logger.info('Database connection closed');
        } catch (error) {
          logger.error('Error closing database connection:', error);
        }

        try {
          await closeRedis();
          logger.info('Redis connection closed');
        } catch (error) {
          logger.error('Error closing Redis connection:', error);
        }

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logCriticalError(error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      logger.error('Unhandled Promise Rejection:', error);
      process.exit(1);
    });
  } catch (error) {
    logCriticalError(error);
    process.exit(1);
  }
}

// Start the server
startServer();
