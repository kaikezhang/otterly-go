import express from 'express';
import OpenAI from 'openai';
import { chatRateLimiter } from '../middleware/rateLimit.js';
import { validateRequest, chatRequestSchema } from '../middleware/validation.js';
import type { ChatRequest } from '../middleware/validation.js';

const router = express.Router();

// Lazy initialize OpenAI client to ensure env vars are loaded
let openai: OpenAI;
function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

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

// POST /api/chat - Proxy to OpenAI
router.post(
  '/',
  chatRateLimiter,
  validateRequest(chatRequestSchema),
  async (req, res) => {
    try {
      const { message, conversationHistory = [], currentTrip } = req.body as ChatRequest;

      // Build context message if trip exists
      const contextMessage = currentTrip
        ? `\n\nCurrent trip context: ${JSON.stringify(currentTrip)}`
        : '';

      // Build messages array for OpenAI
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: message + contextMessage,
        },
      ];

      // Call OpenAI API
      const response = await getOpenAIClient().chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
      });

      const assistantMessage = response.choices[0]?.message?.content || '';

      // Return the response
      res.json({
        message: assistantMessage,
        usage: response.usage, // Include token usage for monitoring
      });

    } catch (error) {
      console.error('OpenAI API error:', error);

      // Handle specific OpenAI errors
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Incorrect API key')) {
          return res.status(401).json({
            error: 'Invalid API key',
            message: 'The OpenAI API key is invalid. Please check server configuration.',
          });
        }
        if (error.message.includes('429') || error.message.includes('rate_limit')) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'OpenAI rate limit exceeded. Please try again in a moment.',
          });
        }
        if (error.message.includes('insufficient_quota')) {
          return res.status(402).json({
            error: 'Insufficient quota',
            message: 'The OpenAI account has insufficient credits.',
          });
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get response from OpenAI. Please try again.',
      });
    }
  }
);

export default router;
