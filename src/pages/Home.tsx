import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { Chat } from '../components/Chat';
import { ItineraryView } from '../components/ItineraryView';
import { getConversationEngine } from '../services/conversationEngine';
import type { ItineraryItem } from '../types';

export default function Home() {
  const {
    user,
    trip,
    messages,
    isLoading,
    isSyncing,
    setTrip,
    addMessage,
    setConversationState,
    setIsLoading,
    addItemToDay,
    removeItemFromDay,
    updateTrip,
    saveTripToDatabase,
    logout,
  } = useStore();

  const [error, setError] = useState<string | null>(null);

  // Initialize conversation on first load
  useEffect(() => {
    if (messages.length === 0) {
      const engine = getConversationEngine();
      const greeting = engine.getInitialGreeting();
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: greeting,
        timestamp: Date.now(),
      });
      setConversationState('eliciting');
    }
  }, [messages.length, addMessage, setConversationState]);

  // Auto-save trip to database whenever it changes
  useEffect(() => {
    if (trip) {
      // Debounce the save operation
      const timeoutId = setTimeout(() => {
        saveTripToDatabase().catch((error) => {
          console.error('Auto-save failed:', error);
          // Don't show error to user - localStorage backup exists
        });
      }, 1000); // Wait 1 second after last change

      return () => clearTimeout(timeoutId);
    }
  }, [trip, messages, saveTripToDatabase]);

  const handleSendMessage = async (userMessage: string) => {
    setError(null);

    // Add user message
    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: userMessage,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setIsLoading(true);

    try {
      const engine = getConversationEngine();
      const response = await engine.sendMessage(userMessage, trip);

      // Create assistant message
      const assistantMsg = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: response.message,
        suggestionCard: response.suggestion,
        timestamp: Date.now(),
      };
      addMessage(assistantMsg);

      // Handle trip creation/update
      if (response.trip) {
        setTrip(response.trip);
        setConversationState('ready');
      } else if (response.tripUpdate) {
        updateTrip(response.tripUpdate);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      const errorMsg = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      };
      addMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuggestionToDay = (suggestionId: string, dayIndex: number) => {
    // Find the suggestion in messages
    const message = messages.find((m) => m.suggestionCard?.id === suggestionId);
    if (!message?.suggestionCard) return;

    const { suggestionCard } = message;

    // Create itinerary item from suggestion
    const item: ItineraryItem = {
      id: crypto.randomUUID(),
      title: suggestionCard.title,
      type: suggestionCard.itemType,
      description: suggestionCard.summary,
      duration: suggestionCard.duration,
    };

    addItemToDay(dayIndex, item);

    // Add confirmation message
    const confirmMsg = {
      id: crypto.randomUUID(),
      role: 'assistant' as const,
      content: `Added "${suggestionCard.title}" to Day ${dayIndex + 1}!`,
      timestamp: Date.now(),
    };
    addMessage(confirmMsg);
  };

  const handleSkipSuggestion = () => {
    const confirmMsg = {
      id: crypto.randomUUID(),
      role: 'assistant' as const,
      content: 'No problem! Let me know if you need other suggestions.',
      timestamp: Date.now(),
    };
    addMessage(confirmMsg);
  };

  const handleRemoveItem = (dayIndex: number, itemId: string) => {
    removeItemFromDay(dayIndex, itemId);
  };

  const handleRequestSuggestion = (dayIndex: number) => {
    const message = `Can you suggest an activity for Day ${dayIndex + 1}?`;
    handleSendMessage(message);
  };

  const handleRequestReplace = (dayIndex: number, itemId: string) => {
    if (!trip) return;
    const item = trip.days[dayIndex].items.find((i) => i.id === itemId);
    if (!item) return;

    const message = `Can you suggest a replacement for "${item.title}" on Day ${
      dayIndex + 1
    }?`;
    handleSendMessage(message);
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await logout();
    }
  };

  // Main App Screen
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">🦦 OtterlyGo</h1>
          {trip && (
            <span className="text-sm text-gray-500">• {trip.destination}</span>
          )}
          {isSyncing && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              {user.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm text-gray-700">{user.name}</span>
            </div>
          )}
          <button
            onClick={() => {
              if (confirm('Clear all data and start over?')) {
                useStore.getState().clearAll();
                window.location.reload();
              }
            }}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Start Over
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className={`${trip ? 'w-2/3' : 'w-full'} border-r border-gray-200`}>
          <Chat
            messages={messages}
            onSendMessage={handleSendMessage}
            onAddSuggestionToDay={handleAddSuggestionToDay}
            onSkipSuggestion={handleSkipSuggestion}
            isLoading={isLoading}
            maxDays={trip?.days.length || 0}
          />
        </div>

        {/* Itinerary View */}
        {trip && (
          <div className="w-1/3 bg-white">
            <ItineraryView
              trip={trip}
              onRemoveItem={handleRemoveItem}
              onRequestSuggestion={handleRequestSuggestion}
              onRequestReplace={handleRequestReplace}
            />
          </div>
        )}
      </div>
    </div>
  );
}
