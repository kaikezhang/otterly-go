import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { logger } from '../utils/logger.js';

const router = Router();

const startTime = Date.now();

/**
 * Basic health check - server is running
 */
router.get('/health', (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: `${uptime}s`,
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * Database health check - tests database connection
 */
router.get('/health/db', async (_req: Request, res: Response) => {
  try {
    const startTime = Date.now();

    // Execute a simple query to verify database connection
    await prisma.$queryRaw`SELECT 1`;

    const responseTime = Date.now() - startTime;

    res.json({
      status: 'ok',
      database: 'connected',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Database health check failed');

    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Detailed health check with all components
 */
router.get('/health/detailed', async (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const healthStatus: {
    status: 'ok' | 'degraded' | 'error';
    timestamp: string;
    uptime: string;
    environment: string;
    services: {
      database: { status: string; responseTime?: string; error?: string };
    };
  } = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: `${uptime}s`,
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: { status: 'unknown' },
    },
  };

  // Check database
  try {
    const dbStartTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - dbStartTime;

    healthStatus.services.database = {
      status: 'connected',
      responseTime: `${dbResponseTime}ms`,
    };
  } catch (error) {
    healthStatus.status = 'degraded';
    healthStatus.services.database = {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    logger.error({ error }, 'Database health check failed in detailed endpoint');
  }

  const statusCode = healthStatus.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

export default router;
