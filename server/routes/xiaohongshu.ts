import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getRelevantNotes, noteToSuggestionCard } from '../services/xiaohongshu.js';
import { z } from 'zod';

const router = express.Router();

// Request schema for search
const searchRequestSchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  activityType: z.string().min(1, 'Activity type is required'),
  itemType: z.enum(['sight', 'food', 'museum', 'hike', 'experience', 'transport', 'rest']),
  defaultDayIndex: z.number().optional(),
  limit: z.number().min(1).max(10).default(3),
});

/**
 * POST /api/xiaohongshu/search
 * Search for relevant Xiaohongshu notes and return suggestion cards
 *
 * Request body:
 * - destination: string (e.g., "Tokyo", "Peru")
 * - activityType: string (e.g., "food", "hiking", "sightseeing")
 * - itemType: ItemType enum
 * - defaultDayIndex?: number (suggested day index)
 * - limit?: number (max results, default 3)
 *
 * Response:
 * - suggestions: SuggestionCard[] (ready-to-use suggestion cards with Xiaohongshu data)
 */
router.post('/search', requireAuth, async (req, res) => {
  try {
    const validatedData = searchRequestSchema.parse(req.body);
    const { destination, activityType, itemType, defaultDayIndex, limit } = validatedData;

    console.log(
      `[Xiaohongshu API] Searching for ${activityType} in ${destination} (type: ${itemType})`
    );

    // Get relevant notes from cache or API
    const notes = await getRelevantNotes(destination, activityType, limit);

    if (notes.length === 0) {
      return res.json({
        suggestions: [],
        message: 'No Xiaohongshu content found for this search',
      });
    }

    // Convert notes to suggestion cards
    const suggestions = await Promise.all(
      notes.map((note) => noteToSuggestionCard(note, itemType, defaultDayIndex))
    );

    res.json({
      suggestions,
      message: `Found ${suggestions.length} suggestions from Xiaohongshu`,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('[Xiaohongshu API] Search error:', error);
    res.status(500).json({
      error: 'Failed to search Xiaohongshu',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/xiaohongshu/stats
 * Get statistics about cached Xiaohongshu content
 * (Admin/debugging endpoint)
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { prisma } = await import('../db.js');

    const stats = await prisma.xiaohongshuCache.aggregate({
      _count: true,
      _sum: {
        usageCount: true,
      },
    });

    const topNotes = await prisma.xiaohongshuCache.findMany({
      select: {
        title: true,
        query: true,
        usageCount: true,
        likes: true,
        location: true,
      },
      orderBy: { usageCount: 'desc' },
      take: 10,
    });

    res.json({
      totalCachedNotes: stats._count,
      totalUsage: stats._sum.usageCount || 0,
      topNotes,
    });
  } catch (error) {
    console.error('[Xiaohongshu API] Stats error:', error);
    res.status(500).json({
      error: 'Failed to get Xiaohongshu stats',
    });
  }
});

export default router;
