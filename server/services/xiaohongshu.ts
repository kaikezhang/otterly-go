import { prisma } from '../db.js';
import OpenAI from 'openai';

// Simplified note structure for web scraping
interface XiaohongshuNote {
  note_id: string;
  title: string;
  desc: string;
  user: {
    user_id: string;
    nickname: string;
    avatar?: string;
  };
  interact_info: {
    liked_count: string;
    comment_count: string;
  };
  image_list?: string[]; // Simplified to just URLs
  tag_list?: string[];
  note_url: string;
  time?: number;
  location?: string;
}

// Initialize OpenAI client for summarization
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
 * Search Xiaohongshu notes using web scraping
 * FREE alternative - scrapes public search results
 *
 * NOTE: This is for MVP/development. For production, consider:
 * 1. Official API access
 * 2. Compliance with Xiaohongshu's ToS
 * 3. Rate limiting to be respectful
 */
export async function searchXiaohongshuNotes(
  query: string,
  options?: {
    pageSize?: number;
  }
): Promise<XiaohongshuNote[]> {
  try {
    console.log(`[Xiaohongshu] Searching for: "${query}"`);

    // Use a simple approach: Fetch Xiaohongshu mobile web search
    // Mobile version is simpler to parse and less likely to block
    const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    });

    if (!response.ok) {
      console.warn('[Xiaohongshu] Search failed, using fallback sample data');
      return getSampleNotes(query);
    }

    const html = await response.text();
    const notes = parseXiaohongshuHTML(html, query);

    if (notes.length === 0) {
      console.warn('[Xiaohongshu] No notes found, using fallback sample data');
      return getSampleNotes(query);
    }

    console.log(`[Xiaohongshu] Found ${notes.length} notes`);
    return notes.slice(0, options?.pageSize || 10);

  } catch (error) {
    console.error('[Xiaohongshu] Search error:', error);
    // Fallback to sample data
    return getSampleNotes(query);
  }
}

/**
 * Parse Xiaohongshu HTML (best effort)
 * Falls back to sample data if parsing fails
 */
function parseXiaohongshuHTML(html: string, query: string): XiaohongshuNote[] {
  try {
    // Try to extract embedded JSON from script tags
    const scriptMatch = html.match(/<script>window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?})<\/script>/);

    if (scriptMatch) {
      const data = JSON.parse(scriptMatch[1]);
      const notes = data?.note?.noteDetailMap || data?.note?.search?.notes || [];

      return Object.values(notes).slice(0, 10).map((note: any) => ({
        note_id: note.noteId || note.id,
        title: note.title,
        desc: note.desc || note.description || '',
        user: {
          user_id: note.user?.userId || '',
          nickname: note.user?.nickname || 'User',
          avatar: note.user?.avatar,
        },
        interact_info: {
          liked_count: String(note.interactInfo?.likedCount || 0),
          comment_count: String(note.interactInfo?.commentCount || 0),
        },
        image_list: note.imageList?.map((img: any) => img.url) || [],
        tag_list: note.tagList?.map((tag: any) => tag.name) || [],
        note_url: `https://www.xiaohongshu.com/explore/${note.noteId || note.id}`,
        time: note.time,
        location: note.ipLocation,
      }));
    }

    return [];
  } catch (error) {
    console.error('[Xiaohongshu] Parse error:', error);
    return [];
  }
}

/**
 * Sample/fallback data for development
 * This allows the feature to work without hitting Xiaohongshu
 */
function getSampleNotes(query: string): XiaohongshuNote[] {
  // Extract destination from query
  const destination = query.split(' ')[0];

  return [
    {
      note_id: `sample-${Date.now()}-1`,
      title: `${destination}美食探店 | 必吃榜单推荐`,
      desc: `来${destination}旅游一定不能错过这些地道美食！作为一个资深吃货，我整理了这份超全攻略。从街边小吃到米其林餐厅，每一家都是精心挑选。强烈推荐大家收藏！`,
      user: {
        user_id: 'sample-user-1',
        nickname: '旅行美食家',
        avatar: 'https://ui-avatars.com/api/?name=Travel+Food',
      },
      interact_info: {
        liked_count: '12580',
        comment_count: '346',
      },
      image_list: [],
      tag_list: [`${destination}美食`, '旅行攻略', '必吃榜单'],
      note_url: 'https://www.xiaohongshu.com/explore/sample1',
      time: Date.now() / 1000,
      location: destination,
    },
    {
      note_id: `sample-${Date.now()}-2`,
      title: `${destination}5天4晚完美行程 | 深度游攻略`,
      desc: `第一次来${destination}的朋友看过来！这条线路我走了3遍，每次都有新发现。分享给大家最优化的行程安排，避开人流高峰，玩转经典景点。记得点赞收藏！`,
      user: {
        user_id: 'sample-user-2',
        nickname: '环球旅行者',
        avatar: 'https://ui-avatars.com/api/?name=World+Traveler',
      },
      interact_info: {
        liked_count: '8934',
        comment_count: '221',
      },
      image_list: [],
      tag_list: [`${destination}旅游`, '行程规划', '深度游'],
      note_url: 'https://www.xiaohongshu.com/explore/sample2',
      time: Date.now() / 1000,
      location: destination,
    },
    {
      note_id: `sample-${Date.now()}-3`,
      title: `${destination}小众景点分享 | 99%的人都不知道`,
      desc: `厌倦了人山人海的热门景点？这几个小众地方绝对让你惊喜！本地人才知道的秘密花园，拍照超级出片。去过的都说好，赶紧马住！`,
      user: {
        user_id: 'sample-user-3',
        nickname: '旅拍达人',
        avatar: 'https://ui-avatars.com/api/?name=Photo+Expert',
      },
      interact_info: {
        liked_count: '15240',
        comment_count: '892',
      },
      image_list: [],
      tag_list: [`${destination}小众`, '旅拍圣地', '网红打卡'],
      note_url: 'https://www.xiaohongshu.com/explore/sample3',
      time: Date.now() / 1000,
      location: destination,
    },
  ];
}

/**
 * Generate English summary of Xiaohongshu note content using LLM
 */
async function summarizeNoteContent(title: string, content: string): Promise<string> {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a travel content summarizer. Summarize Xiaohongshu travel notes in 2-3 concise English sentences that highlight the key travel insights, recommendations, or experiences. Focus on actionable advice and unique perspectives.',
        },
        {
          role: 'user',
          content: `Title: ${title}\n\nContent: ${content}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0]?.message?.content?.trim() || 'Travel recommendation from Xiaohongshu.';
  } catch (error) {
    console.error('[Xiaohongshu] Summarization error:', error);
    // Fallback to simple truncation if LLM fails
    return content.substring(0, 200) + (content.length > 200 ? '...' : '');
  }
}

/**
 * Extract meaningful quotes from note content using LLM
 */
async function extractQuotes(
  title: string,
  content: string
): Promise<Array<{ zh: string; en: string }>> {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a travel content analyzer. Extract 1-2 compelling quotes from Xiaohongshu travel notes. Return JSON array format: {"quotes": [{"zh": "Chinese original", "en": "English translation"}]}. Choose quotes that provide unique insights, tips, or memorable moments. Keep quotes concise (max 100 characters each).`,
        },
        {
          role: 'user',
          content: `Title: ${title}\n\nContent: ${content}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"quotes":[]}');
    return result.quotes || [];
  } catch (error) {
    console.error('[Xiaohongshu] Quote extraction error:', error);
    return [];
  }
}

/**
 * Get or create cached Xiaohongshu note with LLM-generated summary
 */
export async function getCachedNote(note: XiaohongshuNote, query: string) {
  // Check if note is already cached
  const cached = await prisma.xiaohongshuCache.findUnique({
    where: { noteId: note.note_id },
  });

  if (cached) {
    // Update usage count and return cached version
    await prisma.xiaohongshuCache.update({
      where: { id: cached.id },
      data: { usageCount: { increment: 1 } },
    });
    return cached;
  }

  // Generate summary using LLM
  const summary = await summarizeNoteContent(note.title, note.desc);

  // Create cached entry
  const cachedNote = await prisma.xiaohongshuCache.create({
    data: {
      noteId: note.note_id,
      query,
      title: note.title,
      content: note.desc,
      contentZh: note.desc,
      summary,
      images: note.image_list || [],
      tags: note.tag_list || [],
      authorName: note.user.nickname,
      authorId: note.user.user_id,
      authorAvatar: note.user.avatar || null,
      likes: parseInt(note.interact_info.liked_count) || 0,
      comments: parseInt(note.interact_info.comment_count) || 0,
      shares: 0,
      noteUrl: note.note_url,
      publishedAt: note.time ? new Date(note.time * 1000) : null,
      location: note.location || null,
      usageCount: 1,
    },
  });

  return cachedNote;
}

/**
 * Search and retrieve relevant Xiaohongshu notes for a destination and activity type
 * Returns cached notes with summaries ready for suggestion cards
 */
export async function getRelevantNotes(
  destination: string,
  activityType: string,
  limit = 3
) {
  // Build search query
  const query = `${destination} ${activityType}`;

  // First, check cache for recent notes (within last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const cachedNotes = await prisma.xiaohongshuCache.findMany({
    where: {
      query: { contains: destination },
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  // If we have enough cached notes, return them
  if (cachedNotes.length >= limit) {
    console.log(`[Xiaohongshu] Using ${cachedNotes.length} cached notes for "${query}"`);
    return cachedNotes;
  }

  // Otherwise, fetch fresh notes from web scraping
  const notes = await searchXiaohongshuNotes(query, {
    pageSize: limit * 2,
  });

  if (notes.length === 0) {
    console.log(`[Xiaohongshu] No notes found for "${query}"`);
    return cachedNotes;
  }

  // Cache and return top notes
  const cachedResults = await Promise.all(
    notes.slice(0, limit).map((note) => getCachedNote(note, query))
  );

  return cachedResults;
}

/**
 * Convert cached Xiaohongshu note to SuggestionCard format
 */
export async function noteToSuggestionCard(
  cachedNote: any,
  itemType: string,
  defaultDayIndex?: number
) {
  // Extract quotes using LLM
  const quotes = await extractQuotes(cachedNote.title, cachedNote.content);

  return {
    id: `xhs-${cachedNote.noteId}`,
    title: cachedNote.title,
    images: cachedNote.images,
    summary: cachedNote.summary,
    quotes,
    sourceLinks: [
      {
        url: cachedNote.noteUrl,
        label: 'View on Xiaohongshu',
      },
    ],
    defaultDayIndex,
    itemType,
    duration: 'half day',
    photoQuery: `${cachedNote.title} ${cachedNote.location || ''}`,
    source: 'xiaohongshu',
    xiaohongshuMeta: {
      authorName: cachedNote.authorName,
      authorAvatar: cachedNote.authorAvatar,
      likes: cachedNote.likes,
      comments: cachedNote.comments,
    },
  };
}
