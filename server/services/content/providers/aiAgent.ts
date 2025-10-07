/**
 * AI Agent Content Provider
 * Generates activity recommendations directly using LLM knowledge
 * Acts as a fallback/supplement to social media content
 */

import OpenAI from 'openai';
import type { ContentProvider, TravelContent, SearchOptions } from '../base.js';

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

export class AIAgentProvider implements ContentProvider {
  platform = 'ai-agent' as const;

  async search(options: SearchOptions): Promise<TravelContent[]> {
    console.log(`[AIAgent] Generating 3 activities for ${options.destination}`);

    try {
      const prompt = this.buildPrompt(options);

      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a travel expert AI agent that recommends specific, actionable activities.
Your recommendations should be based on deep knowledge of destinations, popular attractions, and traveler preferences.
Always provide detailed, practical information that helps travelers make decisions.
Return valid JSON only.`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const result = response.choices[0]?.message?.content?.trim();
      if (!result) {
        console.log('[AIAgent] No response from LLM');
        return [];
      }

      const parsed = JSON.parse(result);
      const activities = parsed.activities || [];

      console.log(`[AIAgent] Generated ${activities.length} activities`);

      // Convert to TravelContent format
      return activities.map((activity: any, index: number) => this.activityToContent(activity, options, index));
    } catch (error) {
      console.error('[AIAgent] Failed to generate activities:', error);
      return [];
    }
  }

  private buildPrompt(options: SearchOptions): string {
    const { destination, activityType } = options;

    return `Generate 3 top activity recommendations for travelers visiting ${destination}.

${activityType ? `Focus on: ${activityType}` : 'Provide diverse activities (sightseeing, food, culture, etc.)'}

Requirements:
1. Recommend SPECIFIC activities with exact names (e.g., "Visit Colosseum" not "explore ancient sites")
2. Include practical details: location, duration, best time to visit
3. Provide insider tips that add value
4. Make descriptions engaging and inspiring (2-3 paragraphs)
5. Each activity should be distinct and worthwhile

Return JSON in this exact format:
{
  "activities": [
    {
      "title": "Visit the Colosseum",
      "location": "Piazza del Colosseo, Rome, Italy",
      "description": "Explore the iconic ancient amphitheater where gladiators once fought",
      "detailedDescription": "The Colosseum stands as Rome's most impressive monument and one of the most recognizable landmarks in the world. This massive stone amphitheater, completed in 80 AD, could hold up to 80,000 spectators who came to watch gladiatorial contests and public spectacles. Walking through its ancient corridors, you can almost hear the roar of the crowds and feel the weight of 2,000 years of history. The engineering and architecture are astounding - even today, modern stadiums are modeled after its design.\\n\\nFor the best experience, book a guided tour that includes access to the underground chambers and upper levels. These areas reveal the complex machinery used to create special effects and bring wild animals into the arena. Early morning or late afternoon visits offer the best lighting for photos and smaller crowds. Consider combining your visit with the nearby Roman Forum and Palatine Hill, all accessible with the same ticket.",
      "duration": "2-3 hours",
      "bestTime": "early morning or late afternoon",
      "tags": ["history", "architecture", "must-see", "unesco"],
      "tips": [
        "Book tickets online in advance to skip long queues",
        "Bring water as there's limited shade",
        "Underground tour requires separate ticket but worth it"
      ],
      "photoKeywords": "Colosseum Rome Italy ancient amphitheater sunset"
    }
  ]
}`;
  }

  private activityToContent(activity: any, options: SearchOptions, index: number): TravelContent {
    return {
      platformPostId: `ai-${Date.now()}-${index}`,
      platform: 'ai-agent',
      title: activity.title,
      content: activity.description || '',
      contentLang: 'en',
      summary: activity.description || '',
      images: [], // No images from AI
      videoUrl: null,
      tags: activity.tags || [],
      authorName: 'OtterlyGo AI',
      authorId: 'ai-agent',
      authorAvatar: undefined,
      likes: 0, // AI-generated content has no engagement
      comments: 0,
      shares: 0,
      postUrl: '', // No source URL
      location: activity.location || options.destination,
      publishedAt: new Date(),
      platformMeta: {
        aiGenerated: true,
        detailedDescription: activity.detailedDescription,
        duration: activity.duration,
        bestTime: activity.bestTime,
        tips: activity.tips || [],
        photoKeywords: activity.photoKeywords,
      },
      engagementScore: 0,
    };
  }

  calculateEngagementScore(_content: TravelContent): number {
    // AI-generated content has no real engagement
    return 0;
  }
}
