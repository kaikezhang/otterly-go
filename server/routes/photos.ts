import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Unsplash API configuration
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com';

// In-memory cache for photo search results (production should use Redis)
interface CachedPhotoSearch {
  photos: any[];
  timestamp: number;
}
const searchCache = new Map<string, CachedPhotoSearch>();
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

// Validation schemas
const photoSearchRequestSchema = z.object({
  query: z.string().min(1).max(200),
  destination: z.string().optional(),
  activityType: z.string().optional(),
  limit: z.number().min(1).max(30).default(10),
});

/**
 * GET /api/photos/search
 * Search for stock photos via Unsplash API
 */
router.get('/search', async (req, res) => {
  try {
    // Validate query parameters
    const { query, destination, activityType, limit } = photoSearchRequestSchema.parse({
      query: req.query.query,
      destination: req.query.destination,
      activityType: req.query.activityType,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    });

    // Build enhanced search query
    let searchQuery = query;
    if (destination) {
      searchQuery = `${query} ${destination}`;
    }
    if (activityType) {
      searchQuery = `${searchQuery} ${activityType}`;
    }

    // Check in-memory cache first
    const cacheKey = `${searchQuery}-${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({
        success: true,
        data: cached.photos,
        cached: true,
      });
    }

    // Check database cache
    const cachedPhotos = await prisma.photoLibrary.findMany({
      where: {
        query: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: limit,
      orderBy: {
        usageCount: 'desc', // Return most popular cached photos first
      },
    });

    if (cachedPhotos.length >= limit) {
      // We have enough cached photos, return them
      const photos = cachedPhotos.map((photo) => ({
        id: photo.id,
        source: photo.source,
        sourcePhotoId: photo.sourcePhotoId,
        urls: photo.urls,
        attribution: photo.attribution,
        tags: photo.tags,
      }));

      return res.json({
        success: true,
        data: photos,
        cached: true,
      });
    }

    // Validate Unsplash API key
    if (!UNSPLASH_ACCESS_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Unsplash API key not configured',
      });
    }

    // Call Unsplash Search API
    const url = `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(
      searchQuery
    )}&per_page=${limit}&client_id=${UNSPLASH_ACCESS_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No photos found',
      });
    }

    // Transform and cache photos in database
    const photos = await Promise.all(
      data.results.map(async (photo: any) => {
        // Check if photo already exists in database
        const existing = await prisma.photoLibrary.findUnique({
          where: {
            source_sourcePhotoId: {
              source: 'unsplash',
              sourcePhotoId: photo.id,
            },
          },
        });

        if (existing) {
          // Update usage count
          await prisma.photoLibrary.update({
            where: { id: existing.id },
            data: { usageCount: { increment: 1 } },
          });

          return {
            id: existing.id,
            source: existing.source,
            sourcePhotoId: existing.sourcePhotoId,
            urls: existing.urls,
            attribution: existing.attribution,
            tags: existing.tags,
          };
        }

        // Create new photo in database
        const newPhoto = await prisma.photoLibrary.create({
          data: {
            source: 'unsplash',
            sourcePhotoId: photo.id,
            query: searchQuery,
            urls: {
              raw: photo.urls.raw,
              full: photo.urls.full,
              regular: photo.urls.regular,
              small: photo.urls.small,
              thumb: photo.urls.thumb,
            },
            attribution: {
              photographerName: photo.user.name,
              photographerUrl: photo.user.links.html,
              sourceUrl: photo.links.html,
            },
            tags: photo.tags?.map((tag: any) => tag.title) || [],
            usageCount: 1,
          },
        });

        return {
          id: newPhoto.id,
          source: newPhoto.source,
          sourcePhotoId: newPhoto.sourcePhotoId,
          urls: newPhoto.urls,
          attribution: newPhoto.attribution,
          tags: newPhoto.tags,
        };
      })
    );

    // Cache in memory
    searchCache.set(cacheKey, {
      photos,
      timestamp: Date.now(),
    });

    // Clean up old in-memory cache after TTL
    setTimeout(() => {
      searchCache.delete(cacheKey);
    }, CACHE_TTL);

    res.json({
      success: true,
      data: photos,
      cached: false,
    });
  } catch (error) {
    console.error('Photo search error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Photo search failed',
    });
  }
});

/**
 * POST /api/photos/trips/:tripId
 * Associate a photo with a trip or itinerary item
 */
router.post('/trips/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { photoId, itemId, displayContext, order } = z
      .object({
        photoId: z.string(),
        itemId: z.string().optional(),
        displayContext: z.enum(['cover', 'header', 'suggestion', 'gallery']),
        order: z.number().default(0),
      })
      .parse(req.body);

    // Verify trip exists
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }

    // Verify photo exists
    const photo = await prisma.photoLibrary.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found',
      });
    }

    // If this is a cover photo, update the trip's coverPhotoId
    if (displayContext === 'cover') {
      await prisma.trip.update({
        where: { id: tripId },
        data: { coverPhotoId: photoId },
      });

      // Increment photo usage count
      await prisma.photoLibrary.update({
        where: { id: photoId },
        data: { usageCount: { increment: 1 } },
      });
    }

    // Create trip photo association
    const tripPhoto = await prisma.tripPhoto.create({
      data: {
        tripId,
        photoId,
        itemId,
        displayContext,
        order,
      },
      include: {
        photo: true,
      },
    });

    res.json({
      success: true,
      data: tripPhoto,
    });
  } catch (error) {
    console.error('Photo association error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Photo association failed',
    });
  }
});

/**
 * GET /api/photos/trips/:tripId
 * Get all photos associated with a trip
 */
router.get('/trips/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;

    // Verify trip exists
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        coverPhoto: true,
      },
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }

    // Get all trip photos
    const tripPhotos = await prisma.tripPhoto.findMany({
      where: { tripId },
      include: {
        photo: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    res.json({
      success: true,
      data: {
        coverPhoto: trip.coverPhoto,
        photos: tripPhotos,
      },
    });
  } catch (error) {
    console.error('Get trip photos error:', error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get trip photos',
    });
  }
});

/**
 * DELETE /api/photos/trips/:tripId/:photoId
 * Remove a photo association from a trip
 */
router.delete('/trips/:tripId/:photoId', async (req, res) => {
  try {
    const { tripId, photoId } = req.params;

    // Find the trip photo association
    const tripPhoto = await prisma.tripPhoto.findFirst({
      where: {
        tripId,
        photoId,
      },
    });

    if (!tripPhoto) {
      return res.status(404).json({
        success: false,
        error: 'Photo association not found',
      });
    }

    // If this was a cover photo, clear the trip's coverPhotoId
    if (tripPhoto.displayContext === 'cover') {
      await prisma.trip.update({
        where: { id: tripId },
        data: { coverPhotoId: null },
      });
    }

    // Delete the association
    await prisma.tripPhoto.delete({
      where: { id: tripPhoto.id },
    });

    res.json({
      success: true,
      message: 'Photo association removed',
    });
  } catch (error) {
    console.error('Delete photo association error:', error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove photo association',
    });
  }
});

export default router;
