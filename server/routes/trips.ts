import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import {
  validateRequest,
  validateQuery,
  createTripSchema,
  updateTripSchema,
  tripListQuerySchema,
  type CreateTripRequest,
  type UpdateTripRequest,
  type TripListQuery,
} from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = Router();

// Apply auth middleware to all trip routes
router.use(requireAuth);

/**
 * POST /api/trips
 * Create a new trip
 */
router.post('/', validateRequest(createTripSchema), async (req: Request, res: Response) => {
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
 * GET /api/trips
 * List trips for a user with pagination
 */
router.get('/', validateQuery(tripListQuerySchema), async (req: Request, res: Response) => {
  try {
    const query = req.query as unknown as TripListQuery;
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // req.userId is set by requireAuth middleware
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get total count
    const totalCount = await prisma.trip.count({
      where: { userId: req.userId },
    });

    // Get paginated trips
    const trips = await prisma.trip.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
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
        startDate: trip.startDate.toISOString(),
        endDate: trip.endDate.toISOString(),
        tripData: trip.dataJson,
        messages: trip.conversations[0]?.messagesJson || [],
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

export default router;
