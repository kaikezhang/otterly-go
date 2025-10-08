import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// POST /api/social/follow/:userId - Follow a user
router.post('/follow/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;
    const followerId = req.userId!;

    if (followerId === targetUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existing = await db.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUserId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    const follow = await db.userFollow.create({
      data: {
        followerId,
        followingId: targetUserId,
      },
    });

    res.json(follow);
  } catch (error) {
    logger.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// DELETE /api/social/follow/:userId - Unfollow a user
router.delete('/follow/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;
    const followerId = req.userId!;

    const follow = await db.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUserId,
        },
      },
    });

    if (!follow) {
      return res.status(404).json({ error: 'Not following this user' });
    }

    await db.userFollow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUserId,
        },
      },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// GET /api/social/followers/:userId - Get user's followers
router.get('/followers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [followers, total] = await Promise.all([
      db.userFollow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              picture: true,
              customName: true,
              customPicture: true,
              publicProfile: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      db.userFollow.count({ where: { followingId: userId } }),
    ]);

    res.json({
      followers: followers.map(f => f.follower),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// GET /api/social/following/:userId - Get users that this user follows
router.get('/following/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [following, total] = await Promise.all([
      db.userFollow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              picture: true,
              customName: true,
              customPicture: true,
              publicProfile: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      db.userFollow.count({ where: { followerId: userId } }),
    ]);

    res.json({
      following: following.map(f => f.following),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching following:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// GET /api/social/feed - Get social feed (trips from followed users)
router.get('/feed', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get users that current user follows
    const following = await db.userFollow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map(f => f.followingId);

    if (followingIds.length === 0) {
      return res.json({
        trips: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Get public trips and templates from followed users
    const [trips, total] = await Promise.all([
      db.trip.findMany({
        where: {
          userId: { in: followingIds },
          OR: [
            { isPublic: true },
            { isTemplate: true },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              picture: true,
              customName: true,
              customPicture: true,
            },
          },
          coverPhoto: true,
          _count: {
            select: {
              reviews: true,
              forks: true,
              savedBy: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      db.trip.count({
        where: {
          userId: { in: followingIds },
          OR: [
            { isPublic: true },
            { isTemplate: true },
          ],
        },
      }),
    ]);

    res.json({
      trips,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching social feed:', error);
    res.status(500).json({ error: 'Failed to fetch social feed' });
  }
});

// GET /api/social/users/:userId/templates - Get user's public templates
router.get('/users/:userId/templates', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [templates, total] = await Promise.all([
      db.trip.findMany({
        where: {
          userId,
          isTemplate: true,
          isPublic: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              picture: true,
              customName: true,
              customPicture: true,
            },
          },
          coverPhoto: true,
          reviews: {
            select: {
              rating: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              forks: true,
              savedBy: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      db.trip.count({
        where: {
          userId,
          isTemplate: true,
          isPublic: true,
        },
      }),
    ]);

    // Calculate average rating for each template
    const templatesWithRatings = templates.map(template => {
      const ratings = template.reviews.map(r => r.rating);
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

      return {
        ...template,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: template._count.reviews,
      };
    });

    res.json({
      templates: templatesWithRatings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching user templates:', error);
    res.status(500).json({ error: 'Failed to fetch user templates' });
  }
});

export default router;
