import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import app from './app';
import logger from './utils/logger';
import { initCronJobs } from './jobs';

// ─── Prisma Client (singleton) ────────────────────────────────────────────────

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'warn', 'error']
    : ['warn', 'error'],
});

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  try {
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgres')) {
      logger.warn('⚠️ DATABASE_URL is missing or invalid. App might not function correctly.');
    } else {
      // Connect to database
      await prisma.$connect();
      logger.info('✅ Database connected');
    }

    // Initialize background cron jobs
    initCronJobs();
    logger.info('✅ Cron jobs initialized');

    // Start HTTP server (Bind to 0.0.0.0 for Render deployment)
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🏏 CricMate API running on port ${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`   Health check: http://localhost:${PORT}/health`);
    });

    // ─── Graceful Shutdown ──────────────────────────────────────────────
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Database disconnected. Goodbye!');
        process.exit(0);
      });

      // Force exit after 10s if graceful shutdown fails
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('Failed to start server', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
