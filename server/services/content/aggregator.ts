/**
 * Content Aggregator Service
 * Aggregates content from multiple platforms (Xiaohongshu, Reddit, etc.)
 * Handles caching, LLM enhancement, and quality scoring
 */

import type { ContentProvider, TravelContent, SearchOptions, Platform } from './base.js';
import { XiaohongshuProvider } from './providers/xiaohongshu.js';
import { RedditProvider } from './providers/reddit.js';
import { prisma } from '../../db.js';
import OpenAI from 'openai';

// Registry of all available providers
function getEnabledProviders(): ContentProvider[] {
  const providers: ContentProvider[] = [];

  // Check environment variables for each platform
  if (process.env.ENABLE_PLATFORM_XIAOHONGSHU === 'true') {
    providers.push(new XiaohongshuProvider());
    console.log('[Aggregator] Xiaohongshu provider enabled');
  }

  if (process.env.ENABLE_PLATFORM_REDDIT === 'true') {
    providers.push(new RedditProvider());
    console.log('[Aggregator] Reddit provider enabled');
  }

  // Future platforms
  // if (process.env.ENABLE_PLATFORM_TIKTOK === 'true') {
  //   providers.push(new TikTokProvider());
  // }

  console.log(`[Aggregator] ${providers.length} provider(s) enabled: ${providers.map(p => p.platform).join(', ')}`);
  return providers;
}

const PROVIDERS = getEnabledProviders();

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

/**
 * Aggregate content from multiple platforms
 */
export async function aggregateContent(options: SearchOptions): Promise<TravelContent[]> {
  console.log(`[Aggregator] Searching for: "${options.query}"`);

  // 1. Check cache first
  const cached = await getCachedContent(options);
  if (cached.length >= (options.limit || 10)) {
    console.log(`[Aggregator] Using ${cached.length} cached results`);
    return cached;
  }

  // 2. Filter providers by platform preference
  const activeProviders = options.platforms
    ? PROVIDERS.filter((p) => options.platforms!.includes(p.platform))
    : PROVIDERS;

  // 3. Fetch from all providers in parallel
  const results = await Promise.allSettled(
    activeProviders.map((provider) =>
      provider.search(options).catch((err) => {
        console.error(`[${provider.platform}] Search failed:`, err);
        return [];
      })
    )
  );

  // 4. Flatten and collect all content
  const allContent: TravelContent[] = [];
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allContent.push(...result.value);
    }
  });

  if (allContent.length === 0) {
    console.log('[Aggregator] No content found from any provider');
    return cached; // Return cached results if any
  }

  console.log(`[Aggregator] Found ${allContent.length} posts from providers`);

  // 5. Enhance with LLM summaries (parallel, with concurrency limit)
  const enhanced = await enhanceContentBatch(allContent, options.query);

  // 6. Calculate engagement scores
  const scored = enhanced.map((content) => {
    const provider = getProvider(content.platform);
    return {
      ...content,
      engagementScore: provider?.calculateEngagementScore(content) || 0,
    };
  });

  // 7. Sort by engagement score
  scored.sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0));

  // 8. Cache results
  await cacheContentBatch(scored, options.query);

  // 9. Filter by language preference
  const filtered =
    options.language && options.language !== 'all'
      ? scored.filter((c) => c.contentLang === options.language)
      : scored;

  console.log(`[Aggregator] Returning ${Math.min(filtered.length, options.limit || 10)} results`);

  return filtered.slice(0, options.limit || 10);
}

/**
 * Get cached content from database
 */
async function getCachedContent(options: SearchOptions): Promise<TravelContent[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const where: any = {
    query: { contains: options.destination },
    createdAt: { gte: thirtyDaysAgo },
  };

  // Filter by language
  if (options.language && options.language !== 'all') {
    where.contentLang = options.language;
  }

  // Filter by platforms
  if (options.platforms && options.platforms.length > 0) {
    where.platform = { in: options.platforms };
  }

  const cached = await prisma.socialContentCache.findMany({
    where,
    orderBy: [{ usageCount: 'desc' }, { engagementScore: 'desc' }],
    take: options.limit || 10,
  });

  // Increment usage count for returned results
  if (cached.length > 0) {
    await Promise.all(
      cached.map((item) =>
        prisma.socialContentCache.update({
          where: { id: item.id },
          data: { usageCount: { increment: 1 } },
        })
      )
    );
  }

  return cached.map(dbContentToTravelContent);
}

/**
 * Enhance content with LLM summaries (batch processing)
 */
async function enhanceContentBatch(
  content: TravelContent[],
  query: string
): Promise<TravelContent[]> {
  // Process in batches of 5 to avoid rate limits
  const batchSize = 5;
  const enhanced: TravelContent[] = [];

  for (let i = 0; i < content.length; i += batchSize) {
    const batch = content.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((item) => enhanceContent(item, query)));
    enhanced.push(...results);
  }

  return enhanced;
}

/**
 * Enhance single content item with LLM summary
 */
async function enhanceContent(content: TravelContent, query: string): Promise<TravelContent> {
  if (content.summary) return content; // Already summarized

  try {
    const prompt =
      content.contentLang === 'zh'
        ? `Translate and summarize this Chinese travel content in 2-3 concise English sentences highlighting key insights and recommendations:\n\nTitle: ${content.title}\n\nContent: ${content.content}`
        : `Summarize this travel content in 2-3 concise sentences highlighting key insights and recommendations:\n\nTitle: ${content.title}\n\nContent: ${content.content}`;

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a travel content summarizer. Create concise, actionable summaries that help travelers make decisions.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    content.summary =
      response.choices[0]?.message?.content?.trim() || content.content.substring(0, 200);
  } catch (error) {
    console.error('[Aggregator] LLM enhancement failed:', error);
    // Fallback to truncation
    content.summary = content.content.substring(0, 200);
  }

  return content;
}

/**
 * Cache content in database (batch upsert)
 */
async function cacheContentBatch(content: TravelContent[], query: string): Promise<void> {
  await Promise.allSettled(
    content.map(async (item) => {
      try {
        await prisma.socialContentCache.upsert({
          where: {
            platform_platformPostId: {
              platform: item.platform,
              platformPostId: item.platformPostId,
            },
          },
          update: {
            usageCount: { increment: 1 },
            summary: item.summary || '',
            engagementScore: item.engagementScore || 0,
          },
          create: {
            platform: item.platform,
            platformPostId: item.platformPostId,
            query,
            title: item.title,
            content: item.content,
            contentLang: item.contentLang,
            summary: item.summary || '',
            images: item.images,
            videoUrl: item.videoUrl,
            tags: item.tags,
            authorName: item.authorName,
            authorId: item.authorId,
            authorAvatar: item.authorAvatar,
            engagementScore: item.engagementScore || 0,
            likes: item.likes,
            comments: item.comments,
            shares: item.shares,
            postUrl: item.postUrl,
            location: item.location,
            publishedAt: item.publishedAt,
            platformMeta: item.platformMeta,
            usageCount: 1,
          },
        });
      } catch (error) {
        console.error(`[Aggregator] Failed to cache ${item.platform}/${item.platformPostId}:`, error);
      }
    })
  );
}

/**
 * Get provider by platform name
 */
function getProvider(platform: Platform): ContentProvider | undefined {
  return PROVIDERS.find((p) => p.platform === platform);
}

/**
 * Convert database record to TravelContent
 */
function dbContentToTravelContent(db: any): TravelContent {
  return {
    platformPostId: db.platformPostId,
    platform: db.platform,
    title: db.title,
    content: db.content,
    contentLang: db.contentLang,
    summary: db.summary,
    images: db.images,
    videoUrl: db.videoUrl,
    tags: db.tags,
    authorName: db.authorName,
    authorId: db.authorId,
    authorAvatar: db.authorAvatar,
    likes: db.likes,
    comments: db.comments,
    shares: db.shares,
    postUrl: db.postUrl,
    location: db.location,
    publishedAt: db.publishedAt,
    platformMeta: db.platformMeta,
    engagementScore: db.engagementScore,
    qualityScore: db.qualityScore,
  };
}
