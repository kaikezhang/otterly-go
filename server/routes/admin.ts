import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { prisma } from '../db.js';

const router = express.Router();

/**
 * GET /api/admin/usage/overview
 * Get overall usage statistics
 */
router.get('/usage/overview', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate as string);
    }

    // Get total usage statistics
    const totalUsage = await prisma.apiUsage.aggregate({
      where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : undefined,
      _sum: {
        totalTokens: true,
        promptTokens: true,
        completionTokens: true,
        estimatedCost: true,
      },
      _count: {
        id: true,
      },
    });

    // Get usage by model
    const usageByModel = await prisma.apiUsage.groupBy({
      by: ['model'],
      where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : undefined,
      _sum: {
        totalTokens: true,
        estimatedCost: true,
      },
      _count: {
        id: true,
      },
    });

    // Get total number of unique users
    const uniqueUsers = await prisma.apiUsage.groupBy({
      by: ['userId'],
      where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : undefined,
    });

    res.json({
      overview: {
        totalRequests: totalUsage._count.id,
        totalTokens: totalUsage._sum.totalTokens || 0,
        promptTokens: totalUsage._sum.promptTokens || 0,
        completionTokens: totalUsage._sum.completionTokens || 0,
        estimatedCost: totalUsage._sum.estimatedCost || 0,
        uniqueUsers: uniqueUsers.length,
      },
      byModel: usageByModel.map((item) => ({
        model: item.model,
        requests: item._count.id,
        totalTokens: item._sum.totalTokens || 0,
        estimatedCost: item._sum.estimatedCost || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching usage overview:', error);
    res.status(500).json({ error: 'Failed to fetch usage overview' });
  }
});

/**
 * GET /api/admin/usage/by-user
 * Get usage breakdown by user
 */
router.get('/usage/by-user', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { limit = '50', offset = '0' } = req.query;

    // Get usage by user
    const usageByUser = await prisma.apiUsage.groupBy({
      by: ['userId'],
      _sum: {
        totalTokens: true,
        estimatedCost: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          estimatedCost: 'desc',
        },
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    // Get user details
    const userIds = usageByUser.map((item) => item.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const result = usageByUser.map((item) => {
      const user = userMap.get(item.userId);
      return {
        userId: item.userId,
        email: user?.email || 'Unknown',
        name: user?.name || 'Unknown',
        subscriptionTier: user?.subscriptionTier || 'free',
        requests: item._count.id,
        totalTokens: item._sum.totalTokens || 0,
        estimatedCost: item._sum.estimatedCost || 0,
      };
    });

    res.json({ users: result });
  } catch (error) {
    console.error('Error fetching usage by user:', error);
    res.status(500).json({ error: 'Failed to fetch usage by user' });
  }
});

/**
 * GET /api/admin/usage/by-date
 * Get usage over time (aggregated by day)
 */
router.get('/usage/by-date', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, interval = 'day' } = req.query;

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate as string);
    }

    // Get all usage records in date range
    const usageRecords = await prisma.apiUsage.findMany({
      where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : undefined,
      select: {
        createdAt: true,
        totalTokens: true,
        estimatedCost: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by date (using interval = day for now)
    const groupedByDate = new Map<string, { tokens: number; cost: number; count: number }>();

    usageRecords.forEach((record) => {
      const dateKey = record.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      const existing = groupedByDate.get(dateKey) || { tokens: 0, cost: 0, count: 0 };
      groupedByDate.set(dateKey, {
        tokens: existing.tokens + (record.totalTokens || 0),
        cost: existing.cost + (record.estimatedCost || 0),
        count: existing.count + 1,
      });
    });

    const result = Array.from(groupedByDate.entries()).map(([date, data]) => ({
      date,
      requests: data.count,
      totalTokens: data.tokens,
      estimatedCost: data.cost,
    }));

    res.json({ usage: result });
  } catch (error) {
    console.error('Error fetching usage by date:', error);
    res.status(500).json({ error: 'Failed to fetch usage by date' });
  }
});

/**
 * GET /api/admin/users
 * Get all users with their usage stats
 */
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { limit = '50', offset = '0', search } = req.query;

    // Build search filter
    const searchFilter: any = {};
    if (search) {
      searchFilter.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: searchFilter.OR ? searchFilter : undefined,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        tripCount: true,
        createdAt: true,
        _count: {
          select: {
            apiUsage: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    // Get usage stats for each user
    const userIds = users.map((u) => u.id);
    const usageStats = await prisma.apiUsage.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _sum: {
        totalTokens: true,
        estimatedCost: true,
      },
    });

    const usageMap = new Map(
      usageStats.map((s) => [
        s.userId,
        {
          totalTokens: s._sum.totalTokens || 0,
          estimatedCost: s._sum.estimatedCost || 0,
        },
      ])
    );

    const result = users.map((user) => {
      const usage = usageMap.get(user.id) || { totalTokens: 0, estimatedCost: 0 };
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        tripCount: user.tripCount,
        apiRequests: user._count.apiUsage,
        totalTokens: usage.totalTokens,
        estimatedCost: usage.estimatedCost,
        createdAt: user.createdAt,
      };
    });

    res.json({ users: result });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
