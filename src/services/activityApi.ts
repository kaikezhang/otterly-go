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
