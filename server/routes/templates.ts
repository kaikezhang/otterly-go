import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authenticateJWT, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/templates - List public templates with filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      category,
      budget,
      season,
      interests,
      duration,
      sortBy = 'trending',
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {
      isTemplate: true,
      isPublic: true,
    };

    if (category) {
      where.templateCategory = category;
    }

    if (budget) {
      where.estimatedBudget = budget;
    }

    if (season) {
      where.season = {
        hasSome: Array.isArray(season) ? season : [season],
      };
    }

    if (interests) {
      where.interests = {
        hasSome: Array.isArray(interests) ? interests : [interests],
      };
    }

    if (duration) {
      const durationNum = parseInt(duration as string, 10);
      where.duration = durationNum;
    }

    // Determine sort order
    let orderBy: any = {};
    switch (sortBy) {
      case 'trending':
        orderBy = { viewCount: 'desc' };
        break;
      case 'popular':
        orderBy = { forkCount: 'desc' };
        break;
      case 'mostSaved':
        orderBy = { saveCount: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      default:
        orderBy = { viewCount: 'desc' };
    }

    const [templates, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
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
      }),
      prisma.trip.count({ where }),
    ]);

    // Calculate average rating for each template
    const templatesWithRatings = templates.map(template => {
      const ratings = template.reviews.map(r => r.rating);
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

      return {
        ...template,
        avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
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
    logger.error('Error listing templates:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// GET /api/templates/:id - Get single template with full details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await prisma.trip.findFirst({
      where: {
        id,
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
          },
          orderBy: {
            helpfulCount: 'desc',
          },
        },
        originalTrip: {
          select: {
            id: true,
            title: true,
            user: {
              select: {
                id: true,
                name: true,
                customName: true,
              },
            },
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
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Increment view count
    await prisma.trip.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // Calculate average rating
    const ratings = template.reviews.map(r => r.rating);
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;

    res.json({
      ...template,
      avgRating: Math.round(avgRating * 10) / 10,
    });
  } catch (error) {
    logger.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST /api/templates/:id/fork - Fork/remix a template
router.post('/:id/fork', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const originalTemplate = await prisma.trip.findFirst({
      where: {
        id,
        isTemplate: true,
        isPublic: true,
      },
      include: {
        activityDetails: true,
        tripPhotos: true,
      },
    });

    if (!originalTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Create forked trip
    const forkedTrip = await prisma.trip.create({
      data: {
        userId,
        title: `${originalTemplate.title} (My Version)`,
        destination: originalTemplate.destination,
        startDate: originalTemplate.startDate,
        endDate: originalTemplate.endDate,
        dataJson: originalTemplate.dataJson,
        templateCategory: originalTemplate.templateCategory,
        estimatedBudget: originalTemplate.estimatedBudget,
        season: originalTemplate.season,
        interests: originalTemplate.interests,
        duration: originalTemplate.duration,
        originalTripId: originalTemplate.id,
        status: 'draft',
      },
    });

    // Increment fork count on original
    await prisma.trip.update({
      where: { id },
      data: { forkCount: { increment: 1 } },
    });

    res.json(forkedTrip);
  } catch (error) {
    logger.error('Error forking template:', error);
    res.status(500).json({ error: 'Failed to fork template' });
  }
});

// POST /api/templates/:id/save - Save template to inspiration folder
router.post('/:id/save', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { folder = 'inspiration', notes } = req.body;

    const template = await prisma.trip.findFirst({
      where: {
        id,
        isTemplate: true,
        isPublic: true,
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check if already saved
    const existing = await prisma.savedTrip.findUnique({
      where: {
        userId_tripId: {
          userId,
          tripId: id,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Template already saved' });
    }

    // Save template
    const savedTrip = await prisma.savedTrip.create({
      data: {
        userId,
        tripId: id,
        folder,
        notes,
      },
    });

    // Increment save count
    await prisma.trip.update({
      where: { id },
      data: { saveCount: { increment: 1 } },
    });

    res.json(savedTrip);
  } catch (error) {
    logger.error('Error saving template:', error);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// DELETE /api/templates/:id/save - Unsave template
router.delete('/:id/save', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const savedTrip = await prisma.savedTrip.findUnique({
      where: {
        userId_tripId: {
          userId,
          tripId: id,
        },
      },
    });

    if (!savedTrip) {
      return res.status(404).json({ error: 'Saved trip not found' });
    }

    await prisma.savedTrip.delete({
      where: {
        userId_tripId: {
          userId,
          tripId: id,
        },
      },
    });

    // Decrement save count
    await prisma.trip.update({
      where: { id },
      data: { saveCount: { decrement: 1 } },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error unsaving template:', error);
    res.status(500).json({ error: 'Failed to unsave template' });
  }
});

// GET /api/templates/saved - Get user's saved templates
router.get('/saved/list', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { folder } = req.query;

    const where: any = { userId };
    if (folder) {
      where.folder = folder;
    }

    const savedTrips = await prisma.savedTrip.findMany({
      where,
      include: {
        trip: {
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(savedTrips);
  } catch (error) {
    logger.error('Error fetching saved templates:', error);
    res.status(500).json({ error: 'Failed to fetch saved templates' });
  }
});

// POST /api/templates/:id/review - Add review
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  isVerified: z.boolean().optional(),
});

router.post('/:id/review', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const validatedData = reviewSchema.parse(req.body);

    const template = await prisma.trip.findFirst({
      where: {
        id,
        isTemplate: true,
        isPublic: true,
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check if user already reviewed
    const existing = await prisma.tripReview.findUnique({
      where: {
        tripId_userId: {
          tripId: id,
          userId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this template' });
    }

    const review = await prisma.tripReview.create({
      data: {
        tripId: id,
        userId,
        rating: validatedData.rating,
        comment: validatedData.comment,
        isVerified: validatedData.isVerified || false,
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
      },
    });

    res.json(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid review data', details: error.errors });
    }
    logger.error('Error adding review:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// PATCH /api/templates/:id/publish - Publish user's trip as template
const publishSchema = z.object({
  templateCategory: z.string(),
  estimatedBudget: z.enum(['budget', 'moderate', 'luxury']),
  season: z.array(z.string()),
  interests: z.array(z.string()),
  isPremium: z.boolean().optional(),
  revenueShare: z.number().optional(),
});

router.patch('/:id/publish', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const validatedData = publishSchema.parse(req.body);

    // Check if user owns the trip
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Calculate duration from dates
    const duration = trip.startDate && trip.endDate
      ? Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Publish as template
    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: {
        isTemplate: true,
        isPublic: true,
        templateCategory: validatedData.templateCategory,
        estimatedBudget: validatedData.estimatedBudget,
        season: validatedData.season,
        interests: validatedData.interests,
        duration,
        isPremium: validatedData.isPremium || false,
        revenueShare: validatedData.revenueShare,
      },
    });

    res.json(updatedTrip);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid publish data', details: error.errors });
    }
    logger.error('Error publishing template:', error);
    res.status(500).json({ error: 'Failed to publish template' });
  }
});

// PATCH /api/templates/:id/unpublish - Unpublish template
router.patch('/:id/unpublish', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const trip = await prisma.trip.findFirst({
      where: {
        id,
        userId,
        isTemplate: true,
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: {
        isTemplate: false,
        isPublic: false,
      },
    });

    res.json(updatedTrip);
  } catch (error) {
    logger.error('Error unpublishing template:', error);
    res.status(500).json({ error: 'Failed to unpublish template' });
  }
});

export default router;
