import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import {
  validateRequest,
  validateQuery,
  createTripSchema,
  updateTripSchema,
  tripListQuerySchema,
  bulkOperationSchema,
  type CreateTripRequest,
  type UpdateTripRequest,
  type TripListQuery,
  type BulkOperationRequest,
} from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { checkTripLimit, incrementTripCount, decrementTripCount } from '../middleware/usageLimits.js';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

const router = Router();

// Apply auth middleware to all trip routes
router.use(requireAuth);

/**
 * POST /api/trips
 * Create a new trip
 */
router.post('/', checkTripLimit, validateRequest(createTripSchema), async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateTripRequest;

    // req.userId is set by requireAuth middleware
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Create trip in database
    const trip = await prisma.trip.create({
      data: {
        userId: req.userId, // Use authenticated user ID from JWT
        title: body.title,
        destination: body.destination,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        dataJson: body.tripData,
      },
    });

    // Create conversation if messages provided
    if (body.messages && body.messages.length > 0) {
      await prisma.conversation.create({
        data: {
          tripId: trip.id,
          messagesJson: body.messages,
        },
      });
    }

    // Increment trip count for usage tracking
    await incrementTripCount(req.userId);

    res.status(201).json({
      id: trip.id,
      userId: trip.userId,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate.toISOString(),
      tripData: trip.dataJson,
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({
      error: 'Failed to create trip',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/trips/stats
 * Get statistics about user's trips (Milestone 3.5)
 * IMPORTANT: This must come before /:id route
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    // req.userId is set by requireAuth middleware
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get all non-archived trips
    const trips = await prisma.trip.findMany({
      where: {
        userId: req.userId,
        archivedAt: null,
      },
    });

    // Calculate statistics
    const stats = {
      total: trips.length,
      byStatus: {
        draft: trips.filter(t => t.status === 'draft').length,
        planning: trips.filter(t => t.status === 'planning').length,
        upcoming: trips.filter(t => t.status === 'upcoming').length,
        active: trips.filter(t => t.status === 'active').length,
        completed: trips.filter(t => t.status === 'completed').length,
        archived: 0, // Exclude archived from this view
      },
      destinationsCount: new Set(trips.map(t => t.destination)).size,
      totalDays: trips.reduce((sum, trip) => {
        if (trip.startDate && trip.endDate) {
          const days = Math.ceil(
            (trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }
        return sum;
      }, 0),
      activitiesCount: trips.reduce((sum, trip) => {
        const tripData = trip.dataJson as any;
        if (tripData && tripData.days && Array.isArray(tripData.days)) {
          return sum + tripData.days.reduce((daySum: number, day: any) => {
            return daySum + (day.items?.length || 0);
          }, 0);
        }
        return sum;
      }, 0),
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching trip stats:', error);
    res.status(500).json({
      error: 'Failed to fetch trip statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/trips
 * List trips for a user with pagination, filtering, search, and sorting (Milestone 3.5)
 */
router.get('/', validateQuery(tripListQuerySchema), async (req: Request, res: Response) => {
  try {
    const query = req.query;
    // Parse pagination params (they come as strings from URL)
    const page = query.page ? parseInt(query.page as string, 10) : 1;
    const limit = Math.min(query.limit ? parseInt(query.limit as string, 10) : 20, 100);
    const skip = (page - 1) * limit;

    // req.userId is set by requireAuth middleware
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Build where clause for filtering
    const where: Prisma.TripWhereInput = {
      userId: req.userId,
    };

    // Filter by archived status
    if (query.archived !== undefined) {
      const archived = query.archived === 'true';
      where.archivedAt = archived ? { not: null } : null;
    } else {
      // By default, hide archived trips unless explicitly requested
      where.archivedAt = null;
    }

    // Filter by trip status
    if (query.status && query.status !== 'all') {
      const statusStr = query.status as string;
      if (statusStr === 'past') {
        // Past trips = completed or archived
        where.OR = [
          { status: 'completed' },
          { status: 'archived' },
        ];
      } else {
        where.status = statusStr;
      }
    }

    // Filter by tags (comma-separated string from URL)
    if (query.tags) {
      const tagsArray = (query.tags as string).split(',');
      if (tagsArray.length > 0) {
        where.tags = {
          hasSome: tagsArray,
        };
      }
    }

    // Search across title and destination
    if (query.search) {
      where.OR = [
        { title: { contains: query.search as string, mode: 'insensitive' } },
        { destination: { contains: query.search as string, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause for sorting
    let orderBy: Prisma.TripOrderByWithRelationInput = { createdAt: 'desc' }; // Default sort
    if (query.sort) {
      const sortStr = query.sort as string;
      const orderStr = (query.order as string) || 'desc';
      switch (sortStr) {
        case 'recent':
          orderBy = { lastViewedAt: orderStr };
          break;
        case 'oldest':
          orderBy = { createdAt: orderStr };
          break;
        case 'name':
          orderBy = { title: orderStr };
          break;
        case 'startDate':
          orderBy = { startDate: orderStr };
          break;
        case 'endDate':
          orderBy = { endDate: orderStr };
          break;
      }
    }

    // Get total count
    const totalCount = await prisma.trip.count({ where });

    // Get paginated trips
    const trips = await prisma.trip.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 1, // Get latest conversation only
        },
      },
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      trips: trips.map((trip) => ({
        id: trip.id,
        userId: trip.userId,
        title: trip.title,
        destination: trip.destination,
        startDate: trip.startDate?.toISOString() || null,
        endDate: trip.endDate?.toISOString() || null,
        tripData: trip.dataJson,
        messages: trip.conversations[0]?.messagesJson || [],
        status: trip.status,
        tags: trip.tags,
        lastViewedAt: trip.lastViewedAt.toISOString(),
        archivedAt: trip.archivedAt?.toISOString() || null,
        createdAt: trip.createdAt.toISOString(),
        updatedAt: trip.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Error listing trips:', error);
    res.status(500).json({
      error: 'Failed to list trips',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/trips/:id
 * Get a single trip by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json({
      id: trip.id,
      userId: trip.userId,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate.toISOString(),
      tripData: trip.dataJson,
      messages: trip.conversations[0]?.messagesJson || [],
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({
      error: 'Failed to fetch trip',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/trips/:id
 * Update a trip
 */
router.patch('/:id', validateRequest(updateTripSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as UpdateTripRequest;

    // Check if trip exists
    const existingTrip = await prisma.trip.findUnique({
      where: { id },
      include: {
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!existingTrip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Update trip
    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.destination && { destination: body.destination }),
        ...(body.startDate && { startDate: new Date(body.startDate) }),
        ...(body.endDate && { endDate: new Date(body.endDate) }),
        ...(body.tripData && { dataJson: body.tripData }),
      },
    });

    // Update or create conversation if messages provided
    if (body.messages) {
      if (existingTrip.conversations.length > 0) {
        // Update existing conversation
        await prisma.conversation.update({
          where: { id: existingTrip.conversations[0].id },
          data: { messagesJson: body.messages },
        });
      } else {
        // Create new conversation
        await prisma.conversation.create({
          data: {
            tripId: id,
            messagesJson: body.messages,
          },
        });
      }
    }

    // Fetch updated trip with conversation
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });

    res.json({
      id: trip!.id,
      userId: trip!.userId,
      title: trip!.title,
      destination: trip!.destination,
      startDate: trip!.startDate.toISOString(),
      endDate: trip!.endDate.toISOString(),
      tripData: trip!.dataJson,
      messages: trip!.conversations[0]?.messagesJson || [],
      createdAt: trip!.createdAt.toISOString(),
      updatedAt: trip!.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({
      error: 'Failed to update trip',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/trips/:id
 * Delete a trip
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if trip exists
    const trip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Delete trip (conversations will be cascade deleted)
    await prisma.trip.delete({
      where: { id },
    });

    // Decrement trip count for usage tracking
    await decrementTripCount(trip.userId);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({
      error: 'Failed to delete trip',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/trips/:id/share
 * Generate or retrieve a shareable link for a trip
 */
router.post('/:id/share', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // req.userId is set by requireAuth middleware
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if trip exists and belongs to user
    const trip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to share this trip' });
    }

    // Generate share token if not exists
    let shareToken = trip.publicShareToken;
    if (!shareToken) {
      shareToken = randomUUID();
      await prisma.trip.update({
        where: { id },
        data: { publicShareToken: shareToken },
      });
    }

    // Use frontend URL from env, fallback to localhost:5173
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    res.json({
      shareToken,
      shareUrl: `${frontendUrl}/share/${shareToken}`,
    });
  } catch (error) {
    console.error('Error generating share link:', error);
    res.status(500).json({
      error: 'Failed to generate share link',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/trips/:id/share
 * Revoke the share link for a trip
 */
router.delete('/:id/share', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // req.userId is set by requireAuth middleware
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if trip exists and belongs to user
    const trip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to modify this trip' });
    }

    // Remove share token
    await prisma.trip.update({
      where: { id },
      data: {
        publicShareToken: null,
        sharePassword: null,
        shareExpiresAt: null,
      },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error revoking share link:', error);
    res.status(500).json({
      error: 'Failed to revoke share link',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/trips/bulk
 * Perform bulk operations on multiple trips (Milestone 3.5)
 * IMPORTANT: This must come before /:id route
 */
router.post('/bulk', validateRequest(bulkOperationSchema), async (req: Request, res: Response) => {
  try {
    const body = req.body as BulkOperationRequest;

    // req.userId is set by requireAuth middleware
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify all trips belong to the user
    const trips = await prisma.trip.findMany({
      where: {
        id: { in: body.tripIds },
        userId: req.userId,
      },
    });

    if (trips.length !== body.tripIds.length) {
      return res.status(403).json({
        error: 'Not authorized to modify one or more trips',
      });
    }

    let result: any = {};

    switch (body.operation) {
      case 'archive':
        // Archive trips
        await prisma.trip.updateMany({
          where: { id: { in: body.tripIds } },
          data: {
            status: 'archived',
            archivedAt: new Date(),
          },
        });
        result = { archived: body.tripIds.length };
        break;

      case 'delete':
        // Delete trips (conversations will cascade)
        await prisma.trip.deleteMany({
          where: { id: { in: body.tripIds } },
        });
        result = { deleted: body.tripIds.length };
        break;

      case 'duplicate':
        // Duplicate trips
        const duplicatedTrips = [];
        for (const tripId of body.tripIds) {
          const original = trips.find(t => t.id === tripId);
          if (original) {
            const duplicate = await prisma.trip.create({
              data: {
                userId: original.userId,
                title: `${original.title} (Copy)`,
                destination: original.destination,
                startDate: null, // Clear dates on duplicate
                endDate: null,
                dataJson: original.dataJson,
                status: 'draft', // Reset to draft
                tags: original.tags,
              },
            });
            duplicatedTrips.push(duplicate.id);
          }
        }
        result = { duplicated: duplicatedTrips.length, tripIds: duplicatedTrips };
        break;

      case 'complete':
        // Mark trips as completed
        await prisma.trip.updateMany({
          where: { id: { in: body.tripIds } },
          data: {
            status: 'completed',
          },
        });
        result = { completed: body.tripIds.length };
        break;
    }

    res.json({
      success: true,
      operation: body.operation,
      ...result,
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    res.status(500).json({
      error: 'Failed to perform bulk operation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/trips/:id/duplicate
 * Duplicate a single trip (Milestone 3.5)
 */
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // req.userId is set by requireAuth middleware
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get original trip
    const original = await prisma.trip.findUnique({
      where: { id },
    });

    if (!original) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (original.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to duplicate this trip' });
    }

    // Create duplicate
    const duplicate = await prisma.trip.create({
      data: {
        userId: original.userId,
        title: `${original.title} (Copy)`,
        destination: original.destination,
        startDate: null, // Clear dates on duplicate
        endDate: null,
        dataJson: original.dataJson,
        status: 'draft', // Reset to draft
        tags: original.tags,
      },
    });

    res.status(201).json({
      id: duplicate.id,
      userId: duplicate.userId,
      title: duplicate.title,
      destination: duplicate.destination,
      startDate: null,
      endDate: null,
      tripData: duplicate.dataJson,
      status: duplicate.status,
      tags: duplicate.tags,
      createdAt: duplicate.createdAt.toISOString(),
      updatedAt: duplicate.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error duplicating trip:', error);
    res.status(500).json({
      error: 'Failed to duplicate trip',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
