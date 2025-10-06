import OpenAI from 'openai';
import type { Trip, SuggestionCard } from '../types';

const SYSTEM_PROMPT = `You are OtterlyGo, a conversational travel planner assistant. Your role is to help users create realistic, balanced day-by-day travel itineraries through friendly conversation.

CONVERSATION FLOW:
1. Greet briefly and ask for a one-sentence trip description
2. Elicit minimal follow-ups: destination, dates (start & end), pace (fast/medium/slow), interests, must-see locations
3. Once you have enough info, generate a balanced day-by-day itinerary
4. Help users refine the plan based on their requests

GUIDELINES:
- Be concise, friendly, and practical
- Avoid over-stuffing days; include variety (culture/food/hikes/rest)
- For high-altitude or strenuous activities, mention acclimatization or difficulty
- When asked for suggestions/ideas, provide specific recommendations
- Always consider travel logistics and realistic timing

RESPONSE FORMAT:
Respond with JSON in one of these formats:

1. For conversation (questions, acknowledgments):
{
  "type": "message",
  "content": "Your response text here"
}

2. For itinerary generation:
{
  "type": "itinerary",
  "content": "Brief intro message",
  "trip": {
    "destination": "Peru",
    "startDate": "2024-06-15",
    "endDate": "2024-06-23",
    "pace": "medium",
    "interests": ["culture", "food", "light hiking"],
    "mustSee": ["Machu Picchu"],
    "days": [
      {
        "date": "2024-06-15",
        "location": "Lima",
        "items": [
          {
            "title": "Arrive in Lima",
            "type": "transport",
            "description": "Check into hotel and rest",
            "duration": "evening"
          },
          {
            "title": "Dinner in Miraflores",
            "type": "food",
            "description": "Explore the coastal neighborhood and try ceviche",
            "duration": "2 hours"
          }
        ]
      }
    ]
  }
}

3. For suggestion cards:
{
  "type": "suggestion",
  "content": "Here's a great option for an extra day after Machu Picchu:",
  "suggestion": {
    "title": "Rainbow Mountain (Vinicunca)",
    "images": [
      "https://images.unsplash.com/photo-1587595431973-160d0d94add1",
      "https://images.unsplash.com/photo-1531065208531-4036c0dba3ca"
    ],
    "summary": "Rainbow Mountain is a stunning natural wonder featuring vibrant mineral stripes at 5,200m altitude. It's a challenging but rewarding full-day trek from Cusco, best visited after acclimatizing. The views are otherworldly and well worth the early 3am start.",
    "quotes": [
      {
        "zh": "彩虹山真的太美了！建议一定要早起，人少景色更震撼。记得带防晒霜和氧气瓶。",
        "en": "Rainbow Mountain is absolutely stunning! Definitely go early when there are fewer people and the views are more dramatic. Remember to bring sunscreen and oxygen."
      },
      {
        "zh": "海拔很高，爬上去很累但值得。最后一段路最难，慢慢走就好。",
        "en": "The altitude is very high and the climb is exhausting, but it's worth it. The last section is the hardest—just take it slow."
      }
    ],
    "sourceLinks": [
      {
        "url": "https://www.xiaohongshu.com/explore/123",
        "label": "View note"
      }
    ],
    "defaultDayIndex": 5,
    "itemType": "hike",
    "duration": "full day"
  }
}

4. For itinerary updates:
{
  "type": "update",
  "content": "I've updated your itinerary with more food experiences in Lima.",
  "updates": {
    "days": [/* updated days array */]
  }
}`;

class ConversationEngine {
  private client: OpenAI;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }

  async sendMessage(
    userMessage: string,
    currentTrip: Trip | null
  ): Promise<{
    message: string;
    trip?: Trip;
    suggestion?: SuggestionCard;
    tripUpdate?: Partial<Trip>;
  }> {
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    const contextMessage = currentTrip
      ? `\n\nCurrent trip context: ${JSON.stringify(currentTrip)}`
      : '';

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...this.conversationHistory.slice(0, -1).map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          {
            role: 'user',
            content: userMessage + contextMessage,
          },
        ],
        temperature: 0.7,
      });

      const assistantMessage = response.choices[0]?.message?.content || '';

      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      // Parse the JSON response
      try {
        const parsed = JSON.parse(assistantMessage);

        switch (parsed.type) {
          case 'message':
            return { message: parsed.content };

          case 'itinerary':
            return {
              message: parsed.content,
              trip: this.enrichTrip(parsed.trip),
            };

          case 'suggestion':
            return {
              message: parsed.content,
              suggestion: this.enrichSuggestion(parsed.suggestion),
            };

          case 'update':
            return {
              message: parsed.content,
              tripUpdate: parsed.updates,
            };

          default:
            return { message: assistantMessage };
        }
      } catch {
        // If not valid JSON, treat as regular message
        return { message: assistantMessage };
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);

      // Provide specific error messages
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Incorrect API key')) {
          throw new Error('Invalid API key. Please check your OpenAI API key and try again.');
        }
        if (error.message.includes('429') || error.message.includes('rate_limit')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        if (error.message.includes('insufficient_quota')) {
          throw new Error('Your OpenAI account has insufficient credits. Please add credits at platform.openai.com.');
        }
        if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        }
      }

      throw new Error('Failed to get response from OpenAI. Please check your API key and try again.');
    }
  }

  private enrichTrip(trip: any): Trip {
    return {
      id: crypto.randomUUID(),
      ...trip,
      days: trip.days.map((day: any) => ({
        ...day,
        items: day.items.map((item: any) => ({
          id: crypto.randomUUID(),
          ...item,
        })),
      })),
    };
  }

  private enrichSuggestion(suggestion: any): SuggestionCard {
    return {
      id: crypto.randomUUID(),
      ...suggestion,
    };
  }

  getInitialGreeting(): string {
    return "Hi! I'm OtterlyGo, your travel planning assistant. Tell me about your trip in one sentence.";
  }

  reset() {
    this.conversationHistory = [];
  }
}

let engineInstance: ConversationEngine | null = null;
let currentApiKey: string | null = null;

export function getConversationEngine(apiKey?: string): ConversationEngine {
  const key = apiKey || import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key is required');
  }

  // Recreate engine if API key changed
  if (!engineInstance || currentApiKey !== key) {
    engineInstance = new ConversationEngine(key);
    currentApiKey = key;
  }

  return engineInstance;
}

export function resetConversationEngine() {
  engineInstance = null;
  currentApiKey = null;
}
