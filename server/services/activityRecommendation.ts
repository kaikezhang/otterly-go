/**
 * Activity Recommendation Service
 * Provides intelligent activity suggestions based on current itinerary context
 * Leverages multi-platform content aggregation and LLM-powered activity extraction
 */

import OpenAI from 'openai';
import { aggregateContent } from './content/aggregator.js';
import { extractAndGroupActivities, type Activity } from './content/activityExtractor.js';
import type { Trip, Day, ItemType } from '../../src/types/index.js';

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

export interface ActivityRecommendationRequest {
  trip: Trip;
  dayIndex?: number; // Optional: recommend for specific day
  activityType?: string; // Optional: filter by activity type (food, sightseeing, etc.)
  limit?: number; // Number of recommendations (default: 5)
}

export interface ActivityRecommendation {
  id: string;
  title: string;
  images: string[];
  summary: string;
  detailedDescription?: string;
  quotes: Array<{ zh: string; en: string }>;
  sourceLinks: Array<{ url: string; label: string }>;
  itemType: ItemType;
  defaultDayIndex?: number;
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

/**
 * Get existing activity titles from the trip to avoid duplicates
 */
function getExistingActivities(trip: Trip): string[] {
  return trip.days
    .flatMap((day: Day) => day.items.map(item => item.title.toLowerCase()))
    .filter(Boolean);
}

/**
 * Map activity type to ItemType
 */
function mapActivityTypeToItemType(activityType: string): ItemType {
  const mapping: Record<string, ItemType> = {
    sightseeing: 'sight',
    food: 'food',
    dining: 'food',
    restaurant: 'food',
    museum: 'museum',
    hiking: 'hike',
    hike: 'hike',
    experience: 'experience',
    transport: 'transport',
    rest: 'rest',
  };

  return mapping[activityType.toLowerCase()] || 'experience';
}

/**
 * Generate activity recommendations using LLM and multi-platform content
 */
export async function generateActivityRecommendations(
  request: ActivityRecommendationRequest
): Promise<ActivityRecommendation[]> {
  const { trip, dayIndex, activityType, limit = 5 } = request;

  console.log(`[ActivityRecommendation] Generating recommendations for trip to ${trip.destination}`);

  // Step 1: Determine search context
  let searchLocation = trip.destination;
  let specificLocation: string | undefined;
  let targetDay: Day | undefined;

  if (dayIndex !== undefined && trip.days[dayIndex]) {
    targetDay = trip.days[dayIndex];

    // Extract specific location from day
    if (targetDay.location) {
      specificLocation = targetDay.location;
      searchLocation = specificLocation;
    } else if (targetDay.items && targetDay.items.length > 0) {
      // Try to extract from first item's locationHint
      const firstItemWithLocation = targetDay.items.find(item => item.locationHint);
      if (firstItemWithLocation?.locationHint) {
        const cityMatch = firstItemWithLocation.locationHint.match(/^([^,]+)/);
        specificLocation = cityMatch?.[1]?.trim();
        searchLocation = specificLocation || trip.destination;
      }
    }

    console.log(`[ActivityRecommendation] Targeting Day ${dayIndex + 1} in ${searchLocation}`);
  }

  // Step 2: Get existing activities to avoid duplicates
  const existingActivities = getExistingActivities(trip);
  console.log(`[ActivityRecommendation] Excluding ${existingActivities.length} existing activities`);

  // Step 3: Build search query
  const searchQuery = activityType
    ? `${searchLocation} ${activityType} travel activities`
    : `${searchLocation} travel activities recommendations`;

  console.log(`[ActivityRecommendation] Search query: "${searchQuery}"`);

  // Step 4: Fetch content from multiple platforms (Reddit, Xiaohongshu, etc.)
  const socialPosts = await aggregateContent({
    query: searchQuery,
    destination: searchLocation,
    activityType: activityType || 'travel activities',
    language: 'all',
    limit: Math.min(limit * 2, 15), // Fetch more posts to ensure enough unique activities
  });

  if (socialPosts.length === 0) {
    console.log('[ActivityRecommendation] No social content found');
    return [];
  }

  console.log(`[ActivityRecommendation] Found ${socialPosts.length} posts from social platforms`);

  // Step 5: Extract and group activities from posts
  const activities = await extractAndGroupActivities(
    socialPosts,
    searchLocation,
    specificLocation,
    existingActivities,
    trip.destination // Pass main destination to filter out wrong countries
  );

  if (activities.length === 0) {
    console.log('[ActivityRecommendation] No activities extracted from posts');
    return [];
  }

  console.log(`[ActivityRecommendation] Extracted ${activities.length} unique activities`);

  // Step 6: Convert activities to recommendations
  const recommendations: ActivityRecommendation[] = activities.slice(0, limit).map((activity) => {
    // Get the most popular source post for metadata
    const topPost = activity.sourcePosts.sort((a, b) => b.likes - a.likes)[0];

    // Determine if this is multi-platform
    const uniquePlatforms = new Set(activity.sourcePosts.map(p => p.platform));
    const isMultiPlatform = uniquePlatforms.size > 1;

    // Map activity type to ItemType
    const itemType = mapActivityTypeToItemType(activity.type);

    return {
      id: activity.id,
      title: activity.name,
      images: [], // Will be populated via photoQuery
      summary: activity.description,
      detailedDescription: activity.detailedDescription,
      quotes: activity.tips.map(tip => ({
        zh: '', // No Chinese content for activities
        en: tip,
      })),
      sourceLinks: activity.sourcePosts
        .filter(post => post.postUrl) // Filter out AI-generated posts with no URL
        .map(post => ({
          url: post.postUrl,
          label: `${post.platform} - ${post.authorName} (❤️ ${post.likes.toLocaleString()})`,
        })),
      itemType,
      defaultDayIndex: dayIndex,
      duration: activity.duration || 'half day',
      photoQuery: activity.photoKeywords,
      source: activity.isAIGenerated ? 'ai-generated' : (isMultiPlatform ? 'multi-platform' : topPost.platform),
      platformMeta: {
        authorName: activity.isAIGenerated ? 'OtterlyGo AI' : topPost.authorName,
        authorAvatar: topPost.authorAvatar,
        likes: activity.sourcePosts.reduce((sum, p) => sum + p.likes, 0),
        comments: activity.sourcePosts.reduce((sum, p) => sum + p.comments, 0),
        shares: 0,
        platform: activity.isAIGenerated
          ? 'AI-generated'
          : (isMultiPlatform
            ? `${activity.sourcePosts.length} sources`
            : topPost.platform),
        contentLang: 'en',
        engagementScore: 0,
        location: activity.location,
        bestTime: activity.bestTime,
      },
    };
  });

  console.log(`[ActivityRecommendation] Returning ${recommendations.length} recommendations`);

  return recommendations;
}

/**
 * Generate contextual activity recommendations using LLM analysis of the itinerary
 * This provides a more intelligent, context-aware approach
 */
export async function generateContextualRecommendations(
  request: ActivityRecommendationRequest
): Promise<ActivityRecommendation[]> {
  const { trip, dayIndex, limit = 5 } = request;

  // Step 1: Analyze the trip context with LLM
  const contextPrompt = buildContextPrompt(trip, dayIndex);

  console.log('[ActivityRecommendation] Analyzing trip context with LLM...');

  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `You are a travel expert who suggests activities based on itinerary context.
Analyze the trip and suggest ${limit} specific, actionable activities that complement the existing itinerary.
Return ONLY activity search queries (one per line) that will be used to find real user-generated content.

Example output:
traditional food tour Lima Peru
sunset viewing Lima Miraflores
local market shopping Lima`,
      },
      { role: 'user', content: contextPrompt },
    ],
    temperature: 0.7,
    max_tokens: 200,
  });

  const suggestedQueries = response.choices[0]?.message?.content
    ?.trim()
    .split('\n')
    .filter(Boolean) || [];

  console.log(`[ActivityRecommendation] LLM suggested ${suggestedQueries.length} activity queries`);

  // Step 2: Fetch recommendations for each query
  const allRecommendations: ActivityRecommendation[] = [];
  const existingActivities = getExistingActivities(trip);

  for (const query of suggestedQueries) {
    const recommendations = await generateActivityRecommendations({
      trip,
      dayIndex,
      activityType: query,
      limit: 2, // Get 2 activities per query
    });

    allRecommendations.push(...recommendations);

    if (allRecommendations.length >= limit) {
      break;
    }
  }

  // Step 3: Deduplicate and return top recommendations
  const uniqueRecommendations = deduplicateRecommendations(allRecommendations);

  console.log(`[ActivityRecommendation] Returning ${Math.min(uniqueRecommendations.length, limit)} contextual recommendations`);

  return uniqueRecommendations.slice(0, limit);
}

/**
 * Build a context prompt for LLM analysis
 */
function buildContextPrompt(trip: Trip, dayIndex?: number): string {
  let prompt = `Trip destination: ${trip.destination}\n`;
  prompt += `Duration: ${trip.days.length} days\n`;
  prompt += `Interests: ${trip.interests.join(', ')}\n`;
  prompt += `Must-see: ${trip.mustSee.join(', ')}\n\n`;

  if (dayIndex !== undefined && trip.days[dayIndex]) {
    const day = trip.days[dayIndex];
    prompt += `Analyzing Day ${dayIndex + 1} (${day.date}):\n`;
    prompt += `Location: ${day.location || 'Unknown'}\n`;
    prompt += `Existing activities:\n`;
    day.items.forEach((item, idx) => {
      prompt += `${idx + 1}. ${item.title} (${item.type}, ${item.duration || 'unknown duration'})\n`;
    });
    prompt += `\nSuggest ${dayIndex + 1} more activities for this day that complement the existing activities and location.`;
  } else {
    prompt += 'Current itinerary:\n';
    trip.days.forEach((day, idx) => {
      prompt += `Day ${idx + 1}: ${day.location || 'Unknown'} - ${day.items.length} activities\n`;
    });
    prompt += '\nSuggest diverse activities that would enhance this trip.';
  }

  return prompt;
}

/**
 * Deduplicate recommendations by title similarity
 */
function deduplicateRecommendations(recommendations: ActivityRecommendation[]): ActivityRecommendation[] {
  const seen = new Set<string>();
  const unique: ActivityRecommendation[] = [];

  for (const rec of recommendations) {
    const normalizedTitle = rec.title.toLowerCase().replace(/[^\w\s]/g, '');

    if (!seen.has(normalizedTitle)) {
      seen.add(normalizedTitle);
      unique.push(rec);
    }
  }

  return unique;
}
