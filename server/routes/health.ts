import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

/**
 * Basic health check - server is running
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Database health check - tests database connection
 */
router.get('/health/db', async (_req: Request, res: Response) => {
  try {
    // Execute a simple query to verify database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
