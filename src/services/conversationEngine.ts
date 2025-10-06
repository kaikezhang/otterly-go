import type { Trip, SuggestionCard, QuickReply } from '../types';
import { geocodeLocation } from './mapApi';
import type { UsageWarningData } from '../components/UsageWarning';

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
    quickReplies?: QuickReply[];
    usageWarning?: UsageWarningData;
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
        credentials: 'include', // Important: Include cookies for authentication
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
          // Auth error - throw special error that triggers logout
          const error: any = new Error('Authentication failed. Please log in again.');
          error.requiresLogout = true;
          throw error;
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
      const usageWarning = data.usageWarning; // Extract usage warning from API response

      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      // Parse the JSON response
      try {
        // Strip markdown code blocks if present (```json ... ```)
        let cleanedMessage = assistantMessage.trim();
        if (cleanedMessage.startsWith('```')) {
          // Remove opening ```json and closing ```
          cleanedMessage = cleanedMessage
            .replace(/^```(?:json)?\n?/, '')
            .replace(/\n?```$/, '')
            .trim();
        }

        const parsed = JSON.parse(cleanedMessage);
        console.log('[ConversationEngine] Parsed response:', parsed);

        switch (parsed.type) {
          case 'message':
            // Add default quick replies if AI forgot to include them
            let quickReplies = parsed.quickReplies;
            if (!quickReplies || quickReplies.length === 0) {
              console.warn('AI did not provide quick replies, adding defaults');
              quickReplies = [
                { text: 'Let me type my answer', action: 'custom' as const }
              ];
            }
            console.log('[ConversationEngine] Returning message with quickReplies:', quickReplies);
            return {
              message: parsed.content,
              quickReplies,
              usageWarning,
            };

          case 'itinerary':
            return {
              message: parsed.content,
              trip: await this.enrichTrip(parsed.trip),
              usageWarning,
            };

          case 'suggestion':
            return {
              message: parsed.content,
              suggestion: this.enrichSuggestion(parsed.suggestion),
              usageWarning,
            };

          case 'update':
            return {
              message: parsed.content,
              tripUpdate: parsed.updates,
              usageWarning,
            };

          default:
            console.warn('[ConversationEngine] Unknown response type:', parsed.type);
            return { message: assistantMessage, usageWarning };
        }
      } catch (error) {
        console.error('[ConversationEngine] Failed to parse JSON response:', error);
        console.error('[ConversationEngine] Raw message:', assistantMessage);
        // If not valid JSON, treat as regular message
        return { message: assistantMessage, usageWarning };
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

  private async enrichTrip(trip: any): Promise<Trip> {
    // Get trip destination for proximity bias
    const destination = trip.destination;
    let proximityBias: { lng: number; lat: number } | undefined;

    // Try to geocode destination first for proximity bias
    try {
      const destLocation = await geocodeLocation(destination);
      proximityBias = { lng: destLocation.lng, lat: destLocation.lat };
    } catch (error) {
      console.warn(`Could not geocode destination "${destination}":`, error);
    }

    // Enrich days and items with geocoding
    const enrichedDays = await Promise.all(
      trip.days.map(async (day: any) => {
        const enrichedItems = await Promise.all(
          day.items.map(async (item: any) => {
            const enrichedItem = {
              id: crypto.randomUUID(),
              ...item,
            };

            // Auto-geocode item if no location exists
            if (!item.location) {
              try {
                let query: string;

                // Priority 1: Use locationHint from LLM (most accurate)
                if (item.locationHint) {
                  query = item.locationHint;
                  // Ensure destination is included if not already present
                  if (!query.toLowerCase().includes(destination.toLowerCase())) {
                    query = `${query}, ${destination}`;
                  }
                }
                // Priority 2: Extract from description
                else if (item.description) {
                  const desc = item.description.toLowerCase();
                  const locationMatch = desc.match(/(?:in|at|near|visit|explore)\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+)?)/i);
                  if (locationMatch) {
                    query = `${locationMatch[1]}, ${destination}`;
                  } else {
                    query = `${item.title}, ${destination}`;
                  }
                }
                // Priority 3: Fallback to title + destination
                else {
                  query = `${item.title}, ${destination}`;
                }

                const location = await geocodeLocation(query, proximityBias);
                enrichedItem.location = location;
                console.log(`Geocoded "${item.title}" → ${location.address}`);
              } catch (error) {
                console.warn(`Could not geocode "${item.title}":`, error);
                // Continue without location - graceful degradation
              }
            }

            return enrichedItem;
          })
        );

        return {
          ...day,
          items: enrichedItems,
        };
      })
    );

    return {
      id: crypto.randomUUID(),
      ...trip,
      days: enrichedDays,
    };
  }

  private enrichSuggestion(suggestion: any): SuggestionCard {
    return {
      id: crypto.randomUUID(),
      ...suggestion,
    };
  }

  getInitialGreeting(): { message: string; quickReplies?: QuickReply[] } {
    return {
      message: "Hey there! 👋 Where are you thinking of traveling?",
      quickReplies: [
        { text: "Peru", action: "confirm" },
        { text: "Japan", action: "confirm" },
        { text: "Italy", action: "confirm" },
        { text: "Type my own", action: "custom" }
      ]
    };
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
