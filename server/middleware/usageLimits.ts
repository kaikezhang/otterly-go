import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { hasReachedTripLimit } from '../services/stripe';

// Extend Express Request to include subscription info
declare global {
  namespace Express {
    interface Request {
      userSubscription?: {
        tier: string;
        hasReachedLimit: boolean;
      };
    }
  }
}

/**
 * Middleware to check if user has reached their trip limit
 * Must be used after requireAuth middleware
 */
export async function checkTripLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        subscriptionTier: true,
        tripCount: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tier = user.subscriptionTier as 'free' | 'pro' | 'team';
    const hasReached = hasReachedTripLimit(tier, user.tripCount);

    // Attach subscription info to request for later use
    req.userSubscription = {
      tier,
      hasReachedLimit: hasReached,
    };

    if (hasReached) {
      return res.status(403).json({
        error: 'Trip limit reached',
        message: 'You have reached your trip limit. Please upgrade to create more trips.',
        tier,
        tripCount: user.tripCount,
      });
    }

    next();
  } catch (error) {
    console.error('Error checking trip limit:', error);
    res.status(500).json({ error: 'Failed to check trip limit' });
  }
}

/**
 * Middleware to increment trip count when a new trip is created
 * Must be called AFTER the trip is successfully created
 */
export async function incrementTripCount(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        tripCount: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error('Error incrementing trip count:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Middleware to decrement trip count when a trip is deleted
 */
export async function decrementTripCount(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        tripCount: {
          decrement: 1,
        },
      },
    });
  } catch (error) {
    console.error('Error decrementing trip count:', error);
    // Don't throw - this is non-critical
  }
}
