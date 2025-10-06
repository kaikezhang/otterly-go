import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { hasReachedTripLimit } from '../services/stripe';

export interface UsageInfo {
  currentUsage: number;
  limit: number;
  percentageUsed: number;
  shouldWarn: boolean;
  shouldUpgrade: boolean;
  tier: string;
}

// Extend Express Request to include subscription info
declare global {
  namespace Express {
    interface Request {
      userSubscription?: {
        tier: string;
        hasReachedLimit: boolean;
      };
      usageInfo?: UsageInfo;
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

// ===== API USAGE LIMITS (Milestone 4.2) =====

// Soft limits per subscription tier (tokens per month)
const API_USAGE_LIMITS: Record<string, number> = {
  free: 100_000, // ~75 messages
  pro: 1_000_000, // ~750 messages
  team: -1, // unlimited
};

// Warning threshold (percentage of limit)
const WARNING_THRESHOLD = 0.8; // Warn at 80%

/**
 * Calculate API usage for the current billing period (month)
 */
async function getCurrentMonthApiUsage(userId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const usage = await prisma.apiUsage.aggregate({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    _sum: {
      totalTokens: true,
    },
  });

  return usage._sum.totalTokens || 0;
}

/**
 * Get usage info for a user
 */
export async function getUserUsageInfo(userId: string): Promise<UsageInfo> {
  // Get user's subscription tier
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const tier = user.subscriptionTier;
  const limit = API_USAGE_LIMITS[tier] || API_USAGE_LIMITS.free;

  // Unlimited tier
  if (limit === -1) {
    return {
      currentUsage: 0,
      limit: -1,
      percentageUsed: 0,
      shouldWarn: false,
      shouldUpgrade: false,
      tier,
    };
  }

  const currentUsage = await getCurrentMonthApiUsage(userId);
  const percentageUsed = (currentUsage / limit) * 100;

  return {
    currentUsage,
    limit,
    percentageUsed,
    shouldWarn: percentageUsed >= WARNING_THRESHOLD * 100,
    shouldUpgrade: percentageUsed >= 100,
    tier,
  };
}

/**
 * Middleware to check API usage limits and add info to response
 * This is a "soft" limit - requests are not blocked, but warnings are sent
 */
export async function checkApiUsageLimits(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip if user not authenticated
    if (!req.userId) {
      next();
      return;
    }

    const usageInfo = await getUserUsageInfo(req.userId);

    // Attach usage info to request for use in route handlers
    req.usageInfo = usageInfo;

    next();
  } catch (error) {
    console.error('Error checking API usage limits:', error);
    // Don't fail the request if usage check fails
    next();
  }
}

/**
 * Helper to add usage warnings to API responses
 */
export function addUsageWarning(
  responseData: any,
  usageInfo?: UsageInfo
): any {
  if (!usageInfo || !usageInfo.shouldWarn) {
    return responseData;
  }

  return {
    ...responseData,
    usageWarning: {
      currentUsage: usageInfo.currentUsage,
      limit: usageInfo.limit,
      percentageUsed: Math.round(usageInfo.percentageUsed),
      tier: usageInfo.tier,
      message: usageInfo.shouldUpgrade
        ? `You've exceeded your ${usageInfo.tier} plan's monthly limit of ${usageInfo.limit.toLocaleString()} tokens. Consider upgrading to Pro for higher limits!`
        : `You've used ${Math.round(usageInfo.percentageUsed)}% of your ${usageInfo.tier} plan's monthly limit. Consider upgrading to avoid interruptions.`,
      upgradeUrl: '/settings/subscription',
    },
  };
}
