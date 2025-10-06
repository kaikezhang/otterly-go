import type { Trip, SuggestionCard } from '../types';

// Get API URL from environment or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ConversationEngine {
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

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

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: this.conversationHistory.slice(0, -1),
          currentTrip,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle specific error codes
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check server configuration.');
        }
        if (response.status === 429) {
          throw new Error(errorData.message || 'Rate limit exceeded. Please wait a moment and try again.');
        }
        if (response.status === 402) {
          throw new Error('Insufficient OpenAI credits. Please contact support.');
        }

        throw new Error(errorData.message || 'Failed to get response from server.');
      }

      const data = await response.json();
      const assistantMessage = data.message || '';

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
      console.error('Error calling API:', error);

      // Provide specific error messages
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('Network')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        }
        throw error;
      }

      throw new Error('Failed to get response. Please try again.');
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

export function getConversationEngine(): ConversationEngine {
  if (!engineInstance) {
    engineInstance = new ConversationEngine();
  }

  return engineInstance;
}

export function resetConversationEngine() {
  engineInstance = null;
}
