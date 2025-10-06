import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Chat } from './components/Chat';
import { ItineraryView } from './components/ItineraryView';
import { getConversationEngine } from './services/conversationEngine';
import type { ItineraryItem } from './types';

function App() {
  const {
    trip,
    messages,
    isLoading,
    setTrip,
    addMessage,
    setConversationState,
    setIsLoading,
    addItemToDay,
    removeItemFromDay,
    updateTrip,
  } = useStore();

  const [apiKey, setApiKey] = useState('');
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for API key in environment or local storage
  useEffect(() => {
    const envKey = import.meta.env.VITE_OPENAI_API_KEY;
    const storedKey = localStorage.getItem('openai_api_key');

    if (envKey) {
      setApiKeyConfigured(true);
      setApiKey(envKey);
    } else if (storedKey) {
      setApiKeyConfigured(true);
      setApiKey(storedKey);
    }
  }, []);

  // Initialize conversation on first load
  useEffect(() => {
    if (apiKeyConfigured && messages.length === 0) {
      const engine = getConversationEngine(apiKey);
      const greeting = engine.getInitialGreeting();
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: greeting,
        timestamp: Date.now(),
      });
      setConversationState('eliciting');
    }
  }, [apiKeyConfigured, messages.length, apiKey, addMessage, setConversationState]);

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
      const engine = getConversationEngine(apiKey);
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

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey.trim());
      setApiKeyConfigured(true);
    }
  };

  // API Key Configuration Screen
  if (!apiKeyConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🦦 OtterlyGo</h1>
            <p className="text-gray-600">Your conversational travel planner</p>
          </div>

          <form onSubmit={handleApiKeySubmit} className="space-y-4">
            <div>
              <label
                htmlFor="api-key"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                OpenAI API Key
              </label>
              <input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Get your API key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  platform.openai.com/api-keys
                </a>
              </p>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
            >
              Start Planning
            </button>
          </form>
        </div>
      </div>
    );
  }

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
        </div>
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

export default App;
