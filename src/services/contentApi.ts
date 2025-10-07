/**
 * Unified Content API Client
 * Searches across multiple platforms (Xiaohongshu, Reddit, etc.)
 */

import type { SuggestionCard, ItemType } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type Platform = 'xiaohongshu' | 'reddit' | 'tiktok' | 'instagram' | 'youtube';
export type Language = 'all' | 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de';

export interface ContentSearchRequest {
  destination: string;
  activityType: string;
  itemType: ItemType;
  language?: Language;
  platforms?: Platform[];
  limit?: number;
  defaultDayIndex?: number;
}

export interface ContentSearchResponse {
  suggestions: SuggestionCard[];
  meta: {
    total: number;
    platforms: Platform[];
    languages: string[];
  };
}

/**
 * Search across all content platforms
 * Replaces the old searchXiaohongshu() with unified aggregation
 */
export async function searchContent(request: ContentSearchRequest): Promise<SuggestionCard[]> {
  try {
    const response = await fetch(`${API_URL}/api/content/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Search failed');
    }

    const data: ContentSearchResponse = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('[Content API] Search failed:', error);
    // Return empty array so app continues working
    return [];
  }
}

/**
 * Get content statistics (admin/debugging)
 */
export async function getContentStats() {
  try {
    const response = await fetch(`${API_URL}/api/content/stats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch content stats');
    }

    return await response.json();
  } catch (error) {
    console.error('[Content API] Stats fetch failed:', error);
    throw error;
  }
}
