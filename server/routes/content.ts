/**
 * Unified Content API
 * Aggregates content from multiple social platforms (Xiaohongshu, Reddit, etc.)
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aggregateContent } from '../services/content/aggregator.js';
import { z } from 'zod';

const router = express.Router();

const searchRequestSchema = z.object({
  destination: z.string().min(1),
  activityType: z.string().min(1),
  itemType: z.enum(['sight', 'food', 'museum', 'hike', 'experience', 'transport', 'rest']),
  language: z.enum(['all', 'en', 'zh', 'ja', 'ko', 'es', 'fr', 'de']).default('all'),
  platforms: z
    .array(z.enum(['xiaohongshu', 'reddit', 'tiktok', 'instagram', 'youtube']))
    .optional(),
  limit: z.number().min(1).max(20).default(10),
  defaultDayIndex: z.number().optional(),
});

/**
 * POST /api/content/search
 * Unified endpoint for searching across all platforms
 *
 * Request body:
 * - destination: string (e.g., "Tokyo", "Peru")
 * - activityType: string (e.g., "food", "hiking", "sightseeing")
 * - itemType: ItemType enum
 * - language?: 'all' | 'en' | 'zh' | 'ja' | etc. (default: 'all')
 * - platforms?: string[] (filter by platforms, e.g., ['reddit', 'xiaohongshu'])
 * - limit?: number (max results, default 10)
 * - defaultDayIndex?: number (suggested day index)
 *
 * Response:
 * - suggestions: SuggestionCard[] (ready-to-use suggestion cards)
 */
router.post('/search', requireAuth, async (req, res) => {
  try {
    const validated = searchRequestSchema.parse(req.body);

    console.log(
      `[Content API] Searching for ${validated.activityType} in ${validated.destination}` +
        ` (language: ${validated.language}, platforms: ${validated.platforms?.join(',') || 'all'})`
    );

    // Aggregate content from all platforms
    const content = await aggregateContent({
      query: `${validated.destination} ${validated.activityType}`,
      destination: validated.destination,
      activityType: validated.activityType,
      language: validated.language,
      platforms: validated.platforms,
      limit: validated.limit,
    });

    // Convert to suggestion cards
    const suggestions = content.map((item) => ({
      id: `${item.platform}-${item.platformPostId}`,
      title: item.title,
      images: item.images,
      summary: item.summary || item.content.substring(0, 200),
      quotes: [], // TODO: Extract quotes from content if needed
      sourceLinks: [
        {
          url: item.postUrl,
          label: `View on ${capitalize(item.platform)}`,
        },
      ],
      itemType: validated.itemType,
      defaultDayIndex: validated.defaultDayIndex || 0,
      duration: 'half day',
      photoQuery: item.title,
      source: item.platform,
      platformMeta: {
        authorName: item.authorName,
        authorAvatar: item.authorAvatar,
        likes: item.likes,
        comments: item.comments,
        shares: item.shares,
        platform: item.platform,
        contentLang: item.contentLang,
        engagementScore: item.engagementScore,
        ...item.platformMeta,
      },
    }));

    res.json({
      suggestions,
      meta: {
        total: suggestions.length,
        platforms: [...new Set(content.map((c) => c.platform))],
        languages: [...new Set(content.map((c) => c.contentLang))],
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('[Content API] Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/content/stats
 * Get statistics about cached content across all platforms
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { prisma } = await import('../db.js');

    // Overall stats
    const totalStats = await prisma.socialContentCache.aggregate({
      _count: true,
      _sum: {
        usageCount: true,
      },
      _avg: {
        engagementScore: true,
      },
    });

    // Stats by platform
    const platformStats = await prisma.socialContentCache.groupBy({
      by: ['platform'],
      _count: true,
      _sum: {
        usageCount: true,
      },
      _avg: {
        engagementScore: true,
      },
    });

    // Stats by language
    const languageStats = await prisma.socialContentCache.groupBy({
      by: ['contentLang'],
      _count: true,
    });

    // Top content
    const topContent = await prisma.socialContentCache.findMany({
      select: {
        platform: true,
        title: true,
        authorName: true,
        usageCount: true,
        engagementScore: true,
        likes: true,
        comments: true,
        location: true,
        contentLang: true,
      },
      orderBy: { usageCount: 'desc' },
      take: 10,
    });

    res.json({
      total: {
        cachedPosts: totalStats._count,
        totalUsage: totalStats._sum.usageCount || 0,
        avgEngagement: Math.round(totalStats._avg.engagementScore || 0),
      },
      byPlatform: platformStats.map((stat) => ({
        platform: stat.platform,
        count: stat._count,
        usage: stat._sum.usageCount || 0,
        avgEngagement: Math.round(stat._avg.engagementScore || 0),
      })),
      byLanguage: languageStats.map((stat) => ({
        language: stat.contentLang,
        count: stat._count,
      })),
      topContent,
    });
  } catch (error) {
    console.error('[Content API] Stats error:', error);
    res.status(500).json({
      error: 'Failed to get content stats',
    });
  }
});

/**
 * Helper: Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default router;
