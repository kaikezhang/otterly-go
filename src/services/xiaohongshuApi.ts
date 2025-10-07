import type { SuggestionCard, ItemType } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface XiaohongshuSearchRequest {
  destination: string;
  activityType: string;
  itemType: ItemType;
  defaultDayIndex?: number;
  limit?: number;
}

export interface XiaohongshuSearchResponse {
  suggestions: SuggestionCard[];
  message?: string;
}

/**
 * Search Xiaohongshu for relevant travel content and get suggestion cards
 */
export async function searchXiaohongshu(
  request: XiaohongshuSearchRequest
): Promise<SuggestionCard[]> {
  try {
    const response = await fetch(`${API_URL}/api/xiaohongshu/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for auth
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to search Xiaohongshu');
    }

    const data: XiaohongshuSearchResponse = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('[Xiaohongshu API] Search failed:', error);
    // Don't throw - return empty array so app continues working
    return [];
  }
}

/**
 * Get Xiaohongshu statistics (admin/debugging)
 */
export async function getXiaohongshuStats() {
  try {
    const response = await fetch(`${API_URL}/api/xiaohongshu/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Xiaohongshu stats');
    }

    return await response.json();
  } catch (error) {
    console.error('[Xiaohongshu API] Stats fetch failed:', error);
    throw error;
  }
}
