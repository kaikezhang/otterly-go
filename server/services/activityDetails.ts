/**
 * Activity Details Service
 * Generates detailed information cards for existing activities
 * Uses caching to avoid redundant LLM calls
 */

import OpenAI from 'openai';
import { aggregateContent } from './content/aggregator.js';
import type { Trip, ItemType } from '../../src/types/index.js';

// Initialize OpenAI client
let openai: OpenAI;
function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export interface ActivityDetailCard {
  id: string;
  title: string;
  images: string[];
  summary: string;
  detailedDescription?: string;
  quotes: Array<{ zh: string; en: string }>;
  sourceLinks: Array<{ url: string; label: string }>;
  itemType: ItemType;
  duration?: string;
  photoQuery?: string;
  source: string;
  platformMeta?: {
    authorName: string;
    authorAvatar?: string;
    likes: number;
    comments: number;
    shares: number;
    platform: string;
    contentLang: string;
    engagementScore: number;
    location?: string;
    bestTime?: string;
  };
}

// Cache for generated cards (in-memory cache with TTL)
interface CacheEntry {
  card: ActivityDetailCard;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate cache key from activity title and destination
 */
function getCacheKey(activityTitle: string, destination: string): string {
  return `${destination.toLowerCase()}:${activityTitle.toLowerCase()}`;
}

/**
 * Get cached card if available and not expired
 */
function getCachedCard(cacheKey: string): ActivityDetailCard | null {
  const entry = cache.get(cacheKey);

  if (!entry) {
    return null;
  }

  // Check if cache entry is expired
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(cacheKey);
    return null;
  }

  console.log(`[ActivityDetails] Cache HIT for ${cacheKey}`);
  return entry.card;
}

/**
 * Cache a generated card
 */
function cacheCard(cacheKey: string, card: ActivityDetailCard): void {
  cache.set(cacheKey, {
    card,
    timestamp: Date.now(),
  });
  console.log(`[ActivityDetails] Cached card for ${cacheKey}`);
}

/**
 * Generate detailed information card for an activity
 */
export async function generateActivityDetails(
  trip: Trip,
  item: { title: string; description: string; type: string }
): Promise<ActivityDetailCard> {
  const cacheKey = getCacheKey(item.title, trip.destination);

  // Check cache first
  const cachedCard = getCachedCard(cacheKey);
  if (cachedCard) {
    return cachedCard;
  }

  console.log(`[ActivityDetails] Generating details for "${item.title}" in ${trip.destination}`);

  try {
    // Step 1: Fetch content from multiple platforms
    const contentResults = await aggregateContent({
      location: trip.destination,
      query: `${item.title} ${trip.destination}`,
      activityTypes: [item.type],
      limit: 5,
    });

    console.log(`[ActivityDetails] Fetched ${contentResults.length} content items for "${item.title}"`);

    // Step 2: Use LLM to generate detailed card from content
    const client = getOpenAIClient();

    const systemPrompt = `You are a travel recommendation expert. Generate a detailed information card about a specific activity/attraction.

Output ONLY valid JSON matching this exact structure:
{
  "summary": "2-3 sentence engaging description",
  "detailedDescription": "1-2 paragraph detailed description with practical tips and insider knowledge",
  "quotes": [
    { "zh": "Chinese quote", "en": "English translation" }
  ],
  "photoQuery": "Unsplash search query for relevant photos",
  "duration": "Recommended duration (e.g., '2 hours', '1 day')",
  "bestTime": "Best time to visit (e.g., 'Sunset', 'Morning', 'Weekdays')",
  "location": "Specific location/address if mentioned in content"
}

Important:
- Be enthusiastic and inspiring
- Include practical tips (best time, duration, how to get there)
- Use quotes from the content if available (max 2)
- If no Chinese content, leave quotes array empty
- Make the photo query specific and descriptive`;

    const contentSummary = contentResults
      .slice(0, 3)
      .map((c, i) => `[Content ${i + 1}]\nTitle: ${c.title}\nSummary: ${c.summary}\nSource: ${c.platform}`)
      .join('\n\n');

    const userPrompt = `Activity: ${item.title}
Location: ${trip.destination}
Type: ${item.type}
Current Description: ${item.description}

Content from travel platforms:
${contentSummary || 'No specific content found for this activity.'}

Generate a detailed, engaging information card for this activity.`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    const rawContent = response.choices[0]?.message?.content?.trim() || '';
    let parsedData: any;

    try {
      parsedData = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('[ActivityDetails] Failed to parse LLM response, using fallback');
      parsedData = {
        summary: item.description,
        detailedDescription: `${item.title} is a must-visit attraction in ${trip.destination}. It offers a unique experience that showcases the best of what this destination has to offer.`,
        quotes: [],
        photoQuery: `${item.title} ${trip.destination}`,
        duration: '2 hours',
      };
    }

    // Step 3: Build the card
    const card: ActivityDetailCard = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: item.title,
      images: contentResults.slice(0, 3).map(c => c.imageUrl).filter(Boolean),
      summary: parsedData.summary || item.description,
      detailedDescription: parsedData.detailedDescription,
      quotes: parsedData.quotes || [],
      sourceLinks: contentResults.slice(0, 3).map(c => ({
        url: c.sourceUrl,
        label: c.title.slice(0, 60) + (c.title.length > 60 ? '...' : ''),
      })),
      itemType: item.type as ItemType,
      duration: parsedData.duration,
      photoQuery: parsedData.photoQuery || `${item.title} ${trip.destination}`,
      source: contentResults.length > 0 ? 'multi-platform' : 'ai-generated',
      platformMeta: contentResults.length > 0 ? {
        authorName: contentResults[0].author || 'Community',
        authorAvatar: contentResults[0].authorAvatar,
        likes: contentResults[0].likes || 0,
        comments: contentResults[0].comments || 0,
        shares: contentResults[0].shares || 0,
        platform: contentResults[0].platform || 'Multi-platform',
        contentLang: contentResults[0].language || 'en',
        engagementScore: contentResults[0].engagementScore || 0,
        location: parsedData.location,
        bestTime: parsedData.bestTime,
      } : undefined,
    };

    // Cache the card
    cacheCard(cacheKey, card);

    console.log(`[ActivityDetails] Generated card for "${item.title}"`);
    return card;

  } catch (error) {
    console.error('[ActivityDetails] Error generating details:', error);

    // Return fallback card with basic info
    const fallbackCard: ActivityDetailCard = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: item.title,
      images: [],
      summary: item.description,
      detailedDescription: `${item.title} is a notable attraction in ${trip.destination}. Plan to spend some time here to fully appreciate what it has to offer.`,
      quotes: [],
      sourceLinks: [],
      itemType: item.type as ItemType,
      photoQuery: `${item.title} ${trip.destination}`,
      source: 'ai-generated',
    };

    return fallbackCard;
  }
}

/**
 * Clear expired cache entries (call periodically if needed)
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  let clearedCount = 0;

  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
      clearedCount++;
    }
  }

  console.log(`[ActivityDetails] Cleared ${clearedCount} expired cache entries`);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
