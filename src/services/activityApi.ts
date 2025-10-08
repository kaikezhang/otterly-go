/**
 * Activity Recommendations API Client
 * Frontend client for fetching intelligent activity recommendations
 */

import type { Trip, SuggestionCard } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ActivityRecommendationRequest {
  trip: Trip;
  dayIndex?: number;
  activityType?: string;
  limit?: number;
  mode?: 'basic' | 'contextual';
}

export interface ActivityRecommendationResponse {
  recommendations: SuggestionCard[];
  count: number;
}

/**
 * Get activity recommendations for a trip
 */
export async function getActivityRecommendations(
  request: ActivityRecommendationRequest
): Promise<SuggestionCard[]> {
  const response = await fetch(`${API_URL}/api/activities/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for auth
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.message || error.error || 'Failed to get recommendations');
  }

  const data: ActivityRecommendationResponse = await response.json();
  return data.recommendations;
}

/**
 * Get quick activity suggestions (legacy endpoint)
 */
export async function getActivitySuggestions(
  trip: Trip,
  dayIndex?: number,
  activityType?: string,
  limit = 5
): Promise<SuggestionCard[]> {
  const response = await fetch(`${API_URL}/api/activities/suggest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      trip,
      dayIndex,
      activityType,
      limit,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.message || error.error || 'Failed to get suggestions');
  }

  const data = await response.json();
  return data.suggestions || data.recommendations || [];
}

/**
 * Get detailed information about a specific activity
 * Returns a SuggestionCard with rich details, quotes, images, etc.
 */
export async function getActivityDetails(
  trip: Trip,
  item: { title: string; description: string; type: string }
): Promise<SuggestionCard> {
  const response = await fetch(`${API_URL}/api/activities/details`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      trip,
      item,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.message || error.error || 'Failed to get activity details');
  }

  const data = await response.json();
  return data.card;
}

/**
 * Save activity details to database for persistence
 */
export async function saveActivityDetails(
  tripId: string,
  dayIndex: number,
  itemId: string,
  suggestionCard: SuggestionCard
): Promise<{ success: boolean; id: string }> {
  console.log('[activityApi] Saving activity details:', {
    tripId,
    dayIndex,
    itemId,
    suggestionCardKeys: Object.keys(suggestionCard),
    suggestionCard,
  });

  const response = await fetch(`${API_URL}/api/activities/details/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      tripId,
      dayIndex,
      itemId,
      suggestionCard,
    }),
  });

  console.log('[activityApi] Response status:', response.status);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('[activityApi] Failed to save activity details:', error);
    throw new Error(error.message || error.error || 'Failed to save activity details');
  }

  const result = await response.json();
  console.log('[activityApi] Successfully saved activity details:', result);
  return result;
}

/**
 * Get saved activity details from database
 */
export async function getActivityDetailsFromDb(
  tripId: string,
  dayIndex: number,
  itemId: string
): Promise<SuggestionCard | null> {
  const response = await fetch(
    `${API_URL}/api/activities/details/${tripId}/${dayIndex}/${itemId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }
  );

  if (response.status === 404) {
    return null; // Details don't exist
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.message || error.error || 'Failed to get activity details');
  }

  const data = await response.json();
  return data.card;
}

/**
 * Check which items in a trip have saved details
 * Returns a map of "dayIndex-itemId" -> boolean
 */
export async function checkActivityDetails(
  tripId: string
): Promise<Record<string, boolean>> {
  const response = await fetch(`${API_URL}/api/activities/details/${tripId}/check`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.message || error.error || 'Failed to check activity details');
  }

  const data = await response.json();
  return data.detailsMap || {};
}
