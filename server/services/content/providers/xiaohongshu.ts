/**
 * Xiaohongshu (小红书) Content Provider
 * Scrapes public search results and uses fallback sample data
 */

import type { ContentProvider, TravelContent, SearchOptions } from '../base.js';

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
  image_list?: string[];
  tag_list?: string[];
  note_url: string;
  time?: number;
  location?: string;
}

export class XiaohongshuProvider implements ContentProvider {
  platform: 'xiaohongshu' = 'xiaohongshu';

  async search(options: SearchOptions): Promise<TravelContent[]> {
    try {
      console.log(`[Xiaohongshu] Searching for: "${options.query}"`);

      const notes = await this.searchNotes(options.query, options.limit);

      return notes.map((note) => this.mapToTravelContent(note));
    } catch (error) {
      console.error('[Xiaohongshu] Search error:', error);
      // Return empty array - aggregator will try other providers
      return [];
    }
  }

  calculateEngagementScore(content: TravelContent): number {
    // Xiaohongshu typically has 1k-100k likes
    const normalizedLikes = Math.min(content.likes / 100, 1000);
    const normalizedComments = Math.min(content.comments / 10, 1000);
    return Math.round((normalizedLikes + normalizedComments) / 2);
  }

  isHighQuality(content: TravelContent): boolean {
    return content.likes >= 1000 && content.comments >= 50;
  }

  /**
   * Search Xiaohongshu notes using web scraping
   * Falls back to sample data if scraping fails
   */
  private async searchNotes(query: string, limit = 10): Promise<XiaohongshuNote[]> {
    try {
      const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(query)}`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
      });

      if (!response.ok) {
        console.warn('[Xiaohongshu] Search failed, using fallback sample data');
        return this.getSampleNotes(query);
      }

      const html = await response.text();
      const notes = this.parseHTML(html, query);

      if (notes.length === 0) {
        console.warn('[Xiaohongshu] No notes found, using fallback sample data');
        return this.getSampleNotes(query);
      }

      console.log(`[Xiaohongshu] Found ${notes.length} notes`);
      return notes.slice(0, limit);
    } catch (error) {
      console.error('[Xiaohongshu] Fetch error:', error);
      return this.getSampleNotes(query);
    }
  }

  /**
   * Parse Xiaohongshu HTML (best effort)
   */
  private parseHTML(html: string, query: string): XiaohongshuNote[] {
    try {
      // Try to extract embedded JSON from script tags
      const scriptMatch = html.match(
        /<script>window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?})<\/script>/
      );

      if (scriptMatch) {
        const data = JSON.parse(scriptMatch[1]);
        const notes = data?.note?.noteDetailMap || data?.note?.search?.notes || [];

        return Object.values(notes)
          .slice(0, 10)
          .map((note: any) => ({
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
   */
  private getSampleNotes(query: string): XiaohongshuNote[] {
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
   * Map Xiaohongshu note to unified TravelContent
   */
  private mapToTravelContent(note: XiaohongshuNote): TravelContent {
    return {
      platformPostId: note.note_id,
      platform: 'xiaohongshu',
      title: note.title,
      content: note.desc,
      contentLang: 'zh',
      images: note.image_list || [],
      tags: note.tag_list || [],
      authorName: note.user.nickname,
      authorId: note.user.user_id,
      authorAvatar: note.user.avatar,
      likes: parseInt(note.interact_info.liked_count) || 0,
      comments: parseInt(note.interact_info.comment_count) || 0,
      shares: 0,
      postUrl: note.note_url,
      location: note.location,
      publishedAt: note.time ? new Date(note.time * 1000) : undefined,
    };
  }
}
