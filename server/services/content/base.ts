/**
 * Base interfaces for unified content integration across platforms
 * Supports Xiaohongshu, Reddit, TikTok, Instagram, YouTube, etc.
 */

export type Platform = 'xiaohongshu' | 'reddit' | 'tiktok' | 'instagram' | 'youtube' | 'ai-agent';
export type Language = 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de';

/**
 * Unified content model for travel-related social posts
 */
export interface TravelContent {
  platformPostId: string;
  platform: Platform;
  title: string;
  content: string;
  contentLang: Language;
  summary?: string;
  images: string[];
  videoUrl?: string;
  tags: string[];
  authorName: string;
  authorId: string;
  authorAvatar?: string;
  likes: number;
  comments: number;
  shares: number;
  postUrl: string;
  location?: string;
  publishedAt?: Date;
  platformMeta?: Record<string, any>;
  engagementScore?: number;
  qualityScore?: number;
}

/**
 * Search options for finding travel content
 */
export interface SearchOptions {
  query: string;
  destination: string;
  activityType: string;
  language?: 'all' | Language;
  limit?: number;
  minEngagement?: number;
  platforms?: Platform[];
}

/**
 * Content provider interface - each platform implements this
 */
export interface ContentProvider {
  platform: Platform;

  /**
   * Search for content on this platform
   */
  search(options: SearchOptions): Promise<TravelContent[]>;

  /**
   * Normalize engagement metrics to 0-1000 scale
   */
  calculateEngagementScore(content: TravelContent): number;

  /**
   * Platform-specific quality checks
   */
  isHighQuality(content: TravelContent): boolean;
}
