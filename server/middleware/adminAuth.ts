import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';

/**
 * Middleware to check if the authenticated user has admin role
 * Must be used after requireAuth middleware
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if user is authenticated (should be done by requireAuth middleware)
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Check if user has admin role
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    // User is admin, proceed
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
