/**
 * Activity Recommendations API
 * Provides intelligent activity suggestions for trips
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { chatRateLimiter } from '../middleware/rateLimit.js';
import {
  generateActivityRecommendations,
  generateContextualRecommendations,
  type ActivityRecommendationRequest
} from '../services/activityRecommendation.js';
import { z } from 'zod';
import { prisma } from '../db.js';

const router = express.Router();

// Validation schema
const recommendationRequestSchema = z.object({
  trip: z.object({
    id: z.string(),
    destination: z.string(),
    days: z.array(z.any()),
    interests: z.array(z.string()).optional().default([]),
    mustSee: z.array(z.string()).optional().default([]),
  }),
  dayIndex: z.number().int().min(0).optional(),
  activityType: z.string().optional(),
  limit: z.number().int().min(1).max(10).optional().default(5),
  mode: z.enum(['basic', 'contextual']).optional().default('basic'),
});

/**
 * POST /api/activities/recommend
 * Generate activity recommendations based on current itinerary
 *
 * Request body:
 * {
 *   trip: Trip,              // Current trip object
 *   dayIndex?: number,       // Optional: recommend for specific day (0-indexed)
 *   activityType?: string,   // Optional: filter by activity type
 *   limit?: number,          // Number of recommendations (1-10, default 5)
 *   mode?: 'basic' | 'contextual' // Recommendation mode (default 'basic')
 * }
 *
 * Response:
 * {
 *   recommendations: ActivityRecommendation[],
 *   count: number
 * }
 */
router.post(
  '/recommend',
  requireAuth,
  chatRateLimiter, // Reuse chat rate limiter since this also uses OpenAI
  async (req, res) => {
    try {
      // Validate request body
      const validationResult = recommendationRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: validationResult.error.errors,
        });
      }

      const { trip, dayIndex, activityType, limit, mode } = validationResult.data;

      console.log(`[Activities API] Generating ${mode} recommendations for trip ${trip.id}`);

      // Build recommendation request
      const request: ActivityRecommendationRequest = {
        trip: trip as any,
        dayIndex,
        activityType,
        limit,
      };

      // Generate recommendations based on mode
      let recommendations;
      if (mode === 'contextual') {
        recommendations = await generateContextualRecommendations(request);
      } else {
        recommendations = await generateActivityRecommendations(request);
      }

      console.log(`[Activities API] Generated ${recommendations.length} recommendations`);

      // Return recommendations
      res.json({
        recommendations,
        count: recommendations.length,
      });

    } catch (error) {
      console.error('[Activities API] Error generating recommendations:', error);

      if (error instanceof Error) {
        if (error.message.includes('OpenAI')) {
          return res.status(503).json({
            error: 'AI service unavailable',
            message: 'Failed to generate recommendations. Please try again.',
          });
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate activity recommendations.',
      });
    }
  }
);

/**
 * POST /api/activities/suggest
 * Quick activity suggestions (legacy endpoint for backward compatibility)
 * Uses basic recommendation mode
 */
router.post(
  '/suggest',
  requireAuth,
  chatRateLimiter,
  async (req, res) => {
    try {
      const { trip, dayIndex, activityType, limit = 5 } = req.body;

      if (!trip || !trip.destination) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Trip object with destination is required',
        });
      }

      const request: ActivityRecommendationRequest = {
        trip,
        dayIndex,
        activityType,
        limit,
      };

      const recommendations = await generateActivityRecommendations(request);

      res.json({
        suggestions: recommendations, // Use "suggestions" for backward compatibility
        count: recommendations.length,
      });

    } catch (error) {
      console.error('[Activities API] Error in /suggest:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate suggestions.',
      });
    }
  }
);

/**
 * POST /api/activities/details
 * Generate detailed information card for a specific activity
 * Uses caching to avoid redundant LLM calls
 *
 * Request body:
 * {
 *   trip: Trip,
 *   item: { title: string, description: string, type: string }
 * }
 *
 * Response:
 * {
 *   card: SuggestionCard
 * }
 */
router.post(
  '/details',
  requireAuth,
  chatRateLimiter,
  async (req, res) => {
    try {
      const { trip, item } = req.body;

      if (!trip || !trip.destination || !item || !item.title) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Trip and item (with title) are required',
        });
      }

      console.log(`[Activities API] Generating details for "${item.title}" in ${trip.destination}`);

      // Import the details generator
      const { generateActivityDetails } = await import('../services/activityDetails.js');

      // Generate detailed card
      const card = await generateActivityDetails(trip, item);

      console.log(`[Activities API] Generated card for "${item.title}"`);

      res.json({ card });

    } catch (error) {
      console.error('[Activities API] Error generating details:', error);

      if (error instanceof Error) {
        if (error.message.includes('OpenAI')) {
          return res.status(503).json({
            error: 'AI service unavailable',
            message: 'Failed to generate activity details. Please try again.',
          });
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate activity details.',
      });
    }
  }
);

/**
 * POST /api/activities/details/save
 * Save activity details to database for persistence
 *
 * Request body:
 * {
 *   tripId: string,
 *   dayIndex: number,
 *   itemId: string,
 *   suggestionCard: SuggestionCard
 * }
 */
router.post(
  '/details/save',
  requireAuth,
  async (req, res) => {
    try {
      const { tripId, dayIndex, itemId, suggestionCard } = req.body;

      console.log('[Activities API] Save details request:', {
        tripId,
        dayIndex,
        itemId,
        hasSuggestionCard: !!suggestionCard,
        suggestionCardKeys: suggestionCard ? Object.keys(suggestionCard) : [],
        userId: req.user?.id,
      });

      if (!tripId || dayIndex === undefined || !itemId || !suggestionCard) {
        console.error('[Activities API] Missing required fields:', {
          hasTripId: !!tripId,
          hasDayIndex: dayIndex !== undefined,
          hasItemId: !!itemId,
          hasSuggestionCard: !!suggestionCard,
        });
        return res.status(400).json({
          error: 'Invalid request',
          message: 'tripId, dayIndex, itemId, and suggestionCard are required',
        });
      }

      // Verify trip belongs to user
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        select: { userId: true },
      });

      if (!trip) {
        console.error(`[Activities API] Trip not found: ${tripId}`);
        return res.status(404).json({ error: 'Trip not found' });
      }

      if (trip.userId !== req.user!.id) {
        console.error(`[Activities API] Access denied for user ${req.user!.id} to trip ${tripId}`);
        return res.status(403).json({ error: 'Access denied' });
      }

      console.log('[Activities API] Upserting activity details...');

      // Upsert activity details (create or update)
      const activityDetails = await prisma.activityDetails.upsert({
        where: {
          tripId_dayIndex_itemId: {
            tripId,
            dayIndex,
            itemId,
          },
        },
        update: {
          suggestionCardJson: suggestionCard,
          updatedAt: new Date(),
        },
        create: {
          tripId,
          dayIndex,
          itemId,
          suggestionCardJson: suggestionCard,
        },
      });

      console.log(`[Activities API] Successfully saved details for item ${itemId} in trip ${tripId}`);

      res.json({
        success: true,
        id: activityDetails.id,
      });

    } catch (error) {
      console.error('[Activities API] Error saving activity details:');
      console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Full error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to save activity details.',
      });
    }
  }
);

/**
 * GET /api/activities/details/:tripId/:dayIndex/:itemId
 * Get saved activity details from database
 */
router.get(
  '/details/:tripId/:dayIndex/:itemId',
  async (req, res) => {
    try {
      const { tripId, dayIndex, itemId } = req.params;

      const activityDetails = await prisma.activityDetails.findUnique({
        where: {
          tripId_dayIndex_itemId: {
            tripId,
            dayIndex: parseInt(dayIndex),
            itemId,
          },
        },
      });

      if (!activityDetails) {
        return res.status(404).json({ error: 'Activity details not found' });
      }

      res.json({
        card: activityDetails.suggestionCardJson,
      });

    } catch (error) {
      console.error('[Activities API] Error fetching activity details:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch activity details.',
      });
    }
  }
);

/**
 * GET /api/activities/details/:tripId/check
 * Check which items in a trip have saved details
 * Returns a map of "dayIndex-itemId" -> boolean
 */
router.get(
  '/details/:tripId/check',
  async (req, res) => {
    try {
      const { tripId } = req.params;

      const allDetails = await prisma.activityDetails.findMany({
        where: { tripId },
        select: {
          dayIndex: true,
          itemId: true,
        },
      });

      // Create a map for easy lookup
      const detailsMap: Record<string, boolean> = {};
      allDetails.forEach((detail) => {
        const key = `${detail.dayIndex}-${detail.itemId}`;
        detailsMap[key] = true;
      });

      res.json({ detailsMap });

    } catch (error) {
      console.error('[Activities API] Error checking activity details:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check activity details.',
      });
    }
  }
);

export default router;
