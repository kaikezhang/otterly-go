/**
 * Activity Extractor Service
 * Extracts specific activities from social media posts and groups them
 */

import OpenAI from 'openai';
import type { TravelContent } from './base.js';

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

export interface ExtractedActivity {
  activityName: string; // e.g., "Visit Shibuya Crossing"
  activityType: string; // e.g., "sightseeing", "food", "shopping"
  description: string; // Short description of what to do
  detailedDescription?: string; // Longer, more appealing description (1-2 paragraphs)
  photoKeywords: string; // Keywords for photo search (e.g., "Shibuya Crossing Tokyo Japan nighttime")
  location?: string; // Specific location if mentioned
  estimatedDuration?: string; // e.g., "1-2 hours"
  bestTimeToVisit?: string; // e.g., "evening", "morning"
  tips?: string; // Any useful tips from the post
}

export interface Activity {
  id: string;
  name: string;
  type: string;
  description: string;
  detailedDescription?: string;
  photoKeywords: string;
  location?: string;
  duration?: string;
  bestTime?: string;
  tips: string[];
  sourcePosts: Array<{
    platform: string;
    postUrl: string;
    authorName: string;
    authorAvatar?: string;
    likes: number;
    comments: number;
    contentLang: string;
  }>;
  isAIGenerated?: boolean; // True if all sources are from AI agent
}

/**
 * Extract 1-2 specific activities from a social media post or AI-generated content
 */
export async function extractActivitiesFromPost(
  content: TravelContent,
  destination: string
): Promise<ExtractedActivity[]> {
  // Handle AI-generated content directly (no extraction needed)
  if (content.platform === 'ai-agent') {
    const aiMeta = content.platformMeta as any;
    return [{
      activityName: content.title,
      activityType: 'experience',
      description: content.summary,
      detailedDescription: aiMeta?.detailedDescription,
      photoKeywords: aiMeta?.photoKeywords || `${content.title} ${destination}`,
      location: content.location,
      estimatedDuration: aiMeta?.duration,
      bestTimeToVisit: aiMeta?.bestTime,
      tips: aiMeta?.tips?.join('; '),
    }];
  }

  try {
    const prompt = `You are a travel activity extractor. Extract 1-2 SPECIFIC, ACTIONABLE activities from this ${content.platform} post about ${destination}.

Post Title: ${content.title}
Post Content: ${content.content}

Requirements:
1. Extract SPECIFIC activities (e.g., "Visit Shibuya Crossing at night" not "Explore Tokyo")
2. Include location details if mentioned
3. Generate good photo search keywords (place name + city + country + descriptive words)
4. Focus on activities that would interest travelers
5. Skip generic advice or non-actionable content
6. Write a detailed, appealing description (1-2 paragraphs) that makes readers excited

Return JSON array of activities:
[
  {
    "activityName": "Visit Shibuya Crossing",
    "activityType": "sightseeing",
    "description": "Experience the world's busiest pedestrian crossing with neon lights and crowds",
    "detailedDescription": "Shibuya Crossing is Tokyo's most iconic intersection and one of the world's busiest pedestrian crossings, with up to 3,000 people crossing at a time during peak hours. The intersection comes alive at night when massive LED screens illuminate the surrounding buildings, creating a cyberpunk atmosphere that defines modern Tokyo. Watch from street level as waves of people surge forward when the lights change, or head to the second-floor Starbucks for a bird's-eye view of the organized chaos below. The crossing represents the perfect blend of Tokyo's efficiency and energy, making it an unmissable experience for first-time visitors.",
    "photoKeywords": "Shibuya Crossing Tokyo Japan nighttime crowds neon",
    "location": "Shibuya, Tokyo",
    "estimatedDuration": "30 minutes",
    "bestTimeToVisit": "evening",
    "tips": "Best views from Starbucks overlooking the crossing"
  }
]

Return empty array [] if no specific activities found.`;

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a travel activity extractor. Extract specific, actionable activities from travel posts. Return valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 800, // Increased for detailed descriptions
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) return [];

    // Strip markdown code fences if present (```json ... ```)
    const jsonContent = result.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    // Parse JSON response
    const activities = JSON.parse(jsonContent);
    return Array.isArray(activities) ? activities : [];
  } catch (error) {
    console.error(`[ActivityExtractor] Failed to extract activities from ${content.platform} post:`, error);
    return [];
  }
}

/**
 * Group similar activities from multiple posts
 */
export function groupActivities(
  allActivities: Array<{ activity: ExtractedActivity; post: TravelContent }>
): Activity[] {
  const activityGroups = new Map<string, Activity>();

  for (const { activity, post } of allActivities) {
    // Create a normalized key for grouping (lowercase, remove special chars)
    const normalizedName = activity.activityName.toLowerCase().replace(/[^\w\s]/g, '');

    // Check if similar activity already exists
    let groupKey: string | null = null;
    for (const [key, group] of activityGroups.entries()) {
      const normalizedGroupName = group.name.toLowerCase().replace(/[^\w\s]/g, '');

      // Simple similarity check: if 60% of words match, consider it the same activity
      const words1 = normalizedName.split(/\s+/);
      const words2 = normalizedGroupName.split(/\s+/);
      const commonWords = words1.filter(w => words2.includes(w)).length;
      const similarity = commonWords / Math.max(words1.length, words2.length);

      if (similarity > 0.6) {
        groupKey = key;
        break;
      }
    }

    if (groupKey) {
      // Add to existing group
      const group = activityGroups.get(groupKey)!;
      group.sourcePosts.push({
        platform: post.platform,
        postUrl: post.postUrl,
        authorName: post.authorName,
        authorAvatar: post.authorAvatar,
        likes: post.likes,
        comments: post.comments,
        contentLang: post.contentLang,
      });

      // Merge tips
      if (activity.tips && !group.tips.includes(activity.tips)) {
        group.tips.push(activity.tips);
      }

      // Use better description if current one is longer/more detailed
      if (activity.description.length > group.description.length) {
        group.description = activity.description;
      }

      // Use better detailed description if current one is longer
      if (activity.detailedDescription && (
        !group.detailedDescription || activity.detailedDescription.length > group.detailedDescription.length
      )) {
        group.detailedDescription = activity.detailedDescription;
      }
    } else {
      // Create new group
      const newActivity: Activity = {
        id: `activity-${activityGroups.size + 1}`,
        name: activity.activityName,
        type: activity.activityType,
        description: activity.description,
        photoKeywords: activity.photoKeywords,
        location: activity.location,
        duration: activity.estimatedDuration,
        bestTime: activity.bestTimeToVisit,
        tips: activity.tips ? [activity.tips] : [],
        sourcePosts: [{
          platform: post.platform,
          postUrl: post.postUrl,
          authorName: post.authorName,
          authorAvatar: post.authorAvatar,
          likes: post.likes,
          comments: post.comments,
          contentLang: post.contentLang,
        }],
      };

      // Add detailedDescription if present
      if (activity.detailedDescription) {
        newActivity.detailedDescription = activity.detailedDescription;
      }

      activityGroups.set(normalizedName, newActivity);
    }
  }

  // Mark activities as AI-generated if all sources are from AI agent
  const finalActivities = Array.from(activityGroups.values()).map((activity) => {
    const allFromAI = activity.sourcePosts.every(post => post.platform === 'ai-agent');
    return {
      ...activity,
      isAIGenerated: allFromAI,
    };
  });

  return finalActivities;
}

/**
 * Extract and group activities from multiple posts
 */
export async function extractAndGroupActivities(
  posts: TravelContent[],
  destination: string,
  specificLocation?: string,
  existingActivities?: string[],
  mainDestination?: string
): Promise<Activity[]> {
  console.log(`[ActivityExtractor] Extracting activities from ${posts.length} posts for ${specificLocation || destination}`);

  // Extract activities from all posts in parallel
  const extractionPromises = posts.map(async (post) => {
    const activities = await extractActivitiesFromPost(post, destination);
    return activities.map(activity => ({ activity, post }));
  });

  const results = await Promise.all(extractionPromises);
  const allActivities = results.flat();

  console.log(`[ActivityExtractor] Extracted ${allActivities.length} activities from ${posts.length} posts`);

  // STRICT filtering for location relevance and duplicates
  let filteredActivities = allActivities;

  // Step 1: Filter out activities from completely different countries/destinations
  if (mainDestination) {
    const mainDestLower = mainDestination.toLowerCase();
    const destinationKeywords = mainDestLower.split(/\s+/); // e.g., "Peru" from "Peru"

    filteredActivities = filteredActivities.filter(({ activity }) => {
      const activityLocation = activity.location?.toLowerCase() || '';
      const activityName = activity.activityName.toLowerCase();
      const activityDescription = activity.description.toLowerCase();
      const allText = `${activityLocation} ${activityName} ${activityDescription}`;

      // Check if the activity mentions the destination country at all
      const mentionsDestination = destinationKeywords.some(keyword =>
        keyword.length > 2 && allText.includes(keyword)
      );

      if (!mentionsDestination) {
        console.log(`[ActivityExtractor] Filtering out "${activity.activityName}" - doesn't mention ${mainDestination}`);
        return false;
      }

      return true;
    });

    console.log(`[ActivityExtractor] After country filter: ${filteredActivities.length} activities`);
  }

  // Step 2: Filter by specific location if provided (e.g., "Cusco" when day is in Cusco)
  if (specificLocation && filteredActivities.length > 0) {
    const locationLower = specificLocation.toLowerCase();
    const cityFiltered = filteredActivities.filter(({ activity }) => {
      const activityLocation = activity.location?.toLowerCase() || '';
      const activityName = activity.activityName.toLowerCase();
      const activityDescription = activity.description.toLowerCase();

      return (
        activityLocation.includes(locationLower) ||
        activityName.includes(locationLower) ||
        activityDescription.includes(locationLower)
      );
    });

    // Always use city-filtered results when a specific location is provided
    // Don't fall back to country-wide activities - better to show nothing than wrong city
    filteredActivities = cityFiltered;

    if (cityFiltered.length > 0) {
      console.log(`[ActivityExtractor] Filtered to ${filteredActivities.length} activities matching "${specificLocation}"`);
    } else {
      console.log(`[ActivityExtractor] No activities match "${specificLocation}" - will return empty`);
    }
  }

  // Step 3: Filter out activities already in the itinerary
  if (existingActivities && existingActivities.length > 0) {
    const beforeCount = filteredActivities.length;
    filteredActivities = filteredActivities.filter(({ activity }) => {
      const activityNameLower = activity.activityName.toLowerCase();

      // Check for exact match or very similar titles
      const isDuplicate = existingActivities.some(existing => {
        return (
          activityNameLower === existing ||
          activityNameLower.includes(existing) ||
          existing.includes(activityNameLower)
        );
      });

      if (isDuplicate) {
        console.log(`[ActivityExtractor] Filtering out duplicate: "${activity.activityName}"`);
      }

      return !isDuplicate;
    });

    console.log(`[ActivityExtractor] Removed ${beforeCount - filteredActivities.length} duplicates, ${filteredActivities.length} remaining`);
  }

  // Group similar activities
  const groupedActivities = groupActivities(filteredActivities);
  console.log(`[ActivityExtractor] Grouped into ${groupedActivities.length} unique activities`);

  return groupedActivities;
}
