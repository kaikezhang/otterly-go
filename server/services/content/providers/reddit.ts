/**
 * Reddit Content Provider
 * Uses public JSON API (no authentication required)
 */

import type { ContentProvider, TravelContent, SearchOptions, Language } from '../base.js';

const TRAVEL_SUBREDDITS = [
  'travel',
  'solotravel',
  'backpacking',
  'TravelHacks',
  'JapanTravel',
  'chinatravel',
  'digitalnomad',
  'TravelNoPics',
  'Shoestring',
];

export class RedditProvider implements ContentProvider {
  platform: 'reddit' = 'reddit';

  async search(options: SearchOptions): Promise<TravelContent[]> {
    try {
      console.log(`[Reddit] Searching for: "${options.query}"`);

      const posts: TravelContent[] = [];

      // Search across relevant subreddits in parallel
      const searchPromises = TRAVEL_SUBREDDITS.map((subreddit) =>
        this.searchSubreddit(subreddit, options.query, options.limit || 3)
      );

      const results = await Promise.allSettled(searchPromises);

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          posts.push(...result.value);
        }
      });

      // Filter high-quality posts only
      const highQuality = posts.filter((post) => this.isHighQuality(post));

      // Sort by engagement score
      highQuality.sort((a, b) => {
        const scoreA = this.calculateEngagementScore(a);
        const scoreB = this.calculateEngagementScore(b);
        return scoreB - scoreA;
      });

      console.log(`[Reddit] Found ${highQuality.length} high-quality posts`);

      return highQuality.slice(0, options.limit || 10);
    } catch (error) {
      console.error('[Reddit] Search error:', error);
      return [];
    }
  }

  calculateEngagementScore(content: TravelContent): number {
    // Reddit: upvotes typically 10-10k range
    const normalizedUpvotes = Math.min(content.likes / 10, 1000);
    const normalizedComments = Math.min(content.comments / 5, 1000);
    const normalizedAwards = Math.min((content.shares || 0) * 100, 1000);
    return Math.round((normalizedUpvotes + normalizedComments + normalizedAwards) / 3);
  }

  isHighQuality(content: TravelContent): boolean {
    // Require minimum upvotes and meaningful content
    return content.likes >= 50 && content.content.length >= 200;
  }

  /**
   * Search a specific subreddit
   */
  private async searchSubreddit(
    subreddit: string,
    query: string,
    limit: number
  ): Promise<TravelContent[]> {
    try {
      // Reddit's public JSON API - append .json to any URL
      const url =
        `https://www.reddit.com/r/${subreddit}/search.json?` +
        `q=${encodeURIComponent(query)}&limit=${limit}&sort=relevance&restrict_sr=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OtterlyGo/1.0 (Travel Planning App)',
        },
      });

      if (!response.ok) {
        console.warn(`[Reddit] Failed to search r/${subreddit}: ${response.status}`);
        return [];
      }

      const data = await response.json();

      if (!data?.data?.children) {
        return [];
      }

      return data.data.children
        .filter((child: any) => {
          const post = child.data;
          // Filter out:
          // - Removed/deleted posts
          // - Short posts (likely not useful)
          // - Link posts without selftext
          return (
            !post.removed_by_category &&
            post.selftext &&
            post.selftext.length > 100 &&
            post.selftext !== '[removed]' &&
            post.selftext !== '[deleted]'
          );
        })
        .map((child: any) => this.mapRedditPost(child.data, subreddit));
    } catch (error) {
      console.error(`[Reddit] Error searching r/${subreddit}:`, error);
      return [];
    }
  }

  /**
   * Map Reddit post to unified TravelContent
   */
  private mapRedditPost(post: any, subreddit: string): TravelContent {
    return {
      platformPostId: post.id,
      platform: 'reddit',
      title: post.title,
      content: post.selftext,
      contentLang: this.detectLanguage(post.selftext),
      images: this.extractImages(post),
      tags: this.extractTags(post, subreddit),
      authorName: post.author,
      authorId: post.author,
      likes: post.ups,
      comments: post.num_comments,
      shares: post.total_awards_received || 0,
      postUrl: `https://reddit.com${post.permalink}`,
      publishedAt: new Date(post.created_utc * 1000),
      platformMeta: {
        subreddit: post.subreddit,
        flair: post.link_flair_text,
        gilded: post.gilded,
        upvoteRatio: post.upvote_ratio,
      },
    };
  }

  /**
   * Detect language from text (simple heuristic)
   */
  private detectLanguage(text: string): Language {
    // Check for Chinese characters
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
    if (chineseChars && chineseChars.length > text.length * 0.3) {
      return 'zh';
    }

    // Check for Japanese characters (Hiragana/Katakana)
    const japaneseChars = text.match(/[\u3040-\u309f\u30a0-\u30ff]/g);
    if (japaneseChars && japaneseChars.length > text.length * 0.3) {
      return 'ja';
    }

    // Default to English
    return 'en';
  }

  /**
   * Extract images from Reddit post
   */
  private extractImages(post: any): string[] {
    const images: string[] = [];

    // Post thumbnail (if high quality)
    if (post.thumbnail && post.thumbnail.startsWith('http') && post.thumbnail_width > 140) {
      images.push(post.thumbnail);
    }

    // Preview images
    if (post.preview?.images) {
      post.preview.images.forEach((img: any) => {
        if (img.source?.url) {
          // Reddit uses HTML entities in URLs
          const url = img.source.url.replace(/&amp;/g, '&');
          images.push(url);
        }
      });
    }

    // Media (direct image posts)
    if (post.post_hint === 'image' && post.url) {
      images.push(post.url);
    }

    return images;
  }

  /**
   * Extract tags from post
   */
  private extractTags(post: any, subreddit: string): string[] {
    const tags: string[] = [subreddit];

    // Add flair as tag
    if (post.link_flair_text) {
      tags.push(post.link_flair_text);
    }

    // Add post hint as tag
    if (post.post_hint) {
      tags.push(post.post_hint);
    }

    return tags;
  }
}
