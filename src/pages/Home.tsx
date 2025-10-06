import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Chat } from '../components/Chat';
import { ItineraryView } from '../components/ItineraryView';
import { MapView } from '../components/MapView';
import { getConversationEngine } from '../services/conversationEngine';
import type { ItineraryItem, QuickReply } from '../types';

export default function Home() {
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const {
    user,
    trip,
    messages,
    isLoading,
    isSyncing,
    isEditMode,
    hasUnsavedChanges,
    setTrip,
    addMessage,
    setConversationState,
    setIsLoading,
    addItemToDay,
    removeItemFromDay,
    updateTrip,
    saveTripToDatabase,
    logout,
    toggleEditMode,
    undo,
    redo,
    canUndo,
    canRedo,
    updateItemInDay,
    reorderItemsInDay,
    moveItemBetweenDays,
  } = useStore();

  const [error, setError] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'itinerary' | 'map'>('chat');

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserMenu]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Check if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Undo: Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo()) {
          undo();
        }
      }

      // Redo: Ctrl+Y (Windows/Linux) or Cmd+Shift+Z (Mac)
      if (
        ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z')
      ) {
        event.preventDefault();
        if (canRedo()) {
          redo();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, canUndo, canRedo]);

  // Initialize conversation on first load
  useEffect(() => {
    if (messages.length === 0) {
      const engine = getConversationEngine();
      const greeting = engine.getInitialGreeting();
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: greeting.message,
        quickReplies: greeting.quickReplies,
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
        quickReplies: response.quickReplies,
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

  const handleQuickReplyClick = (reply: QuickReply) => {
    // Send the quick reply text as a message
    handleSendMessage(reply.text);
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
          {hasUnsavedChanges && !isSyncing && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Edit Mode Controls */}
          {trip && (
            <div className="flex items-center gap-2">
              {isEditMode && (
                <>
                  <button
                    onClick={undo}
                    disabled={!canUndo()}
                    className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Undo (Ctrl+Z)"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={redo}
                    disabled={!canRedo()}
                    className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Redo (Ctrl+Y)"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                    </svg>
                  </button>
                </>
              )}
              <button
                onClick={toggleEditMode}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
                  isEditMode
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {isEditMode ? 'View Mode' : 'Edit Mode'}
              </button>
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
          {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-gray-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                    {(user.name || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-gray-700">{user.name}</span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    showUserMenu ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile & Settings
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
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

      {/* Mobile Tab Navigation (only on mobile when trip exists) */}
      {trip && (
        <div className="lg:hidden bg-white border-b border-gray-200 flex">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'chat'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab('itinerary')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'itinerary'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📋 Itinerary
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'map'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🗺️ Map
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: 3-panel layout | Mobile: Tab-based */}

        {/* Chat Area */}
        <div className={`${
          trip
            ? 'lg:w-1/3 lg:block' // Desktop: always visible, 1/3 width
            : 'w-full' // No trip: full width
        } ${
          trip && activeTab !== 'chat' ? 'hidden' : '' // Mobile: hide when other tabs active
        } border-r border-gray-200`}>
          <Chat
            messages={messages}
            onSendMessage={handleSendMessage}
            onAddSuggestionToDay={handleAddSuggestionToDay}
            onSkipSuggestion={handleSkipSuggestion}
            onQuickReplyClick={handleQuickReplyClick}
            isLoading={isLoading}
            maxDays={trip?.days.length || 0}
          />
        </div>

        {/* Itinerary View */}
        {trip && (
          <div className={`lg:w-1/3 lg:block ${
            activeTab !== 'itinerary' ? 'hidden' : 'w-full'
          } bg-white border-r border-gray-200`}>
            <ItineraryView
              trip={trip}
              isEditMode={isEditMode}
              onRemoveItem={handleRemoveItem}
              onRequestSuggestion={handleRequestSuggestion}
              onRequestReplace={handleRequestReplace}
              onUpdateItem={updateItemInDay}
              onReorderItems={reorderItemsInDay}
              onMoveItemBetweenDays={moveItemBetweenDays}
            />
          </div>
        )}

        {/* Map View */}
        {trip && showMap && (
          <div className={`lg:w-1/3 lg:block ${
            activeTab !== 'map' ? 'hidden' : 'w-full'
          } bg-gray-100 relative`}>
            <button
              onClick={() => setShowMap(false)}
              className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50 transition-colors"
              title="Hide map"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <MapView
              trip={trip}
              selectedDayIndex={selectedDayIndex}
            />
          </div>
        )}

        {/* Show Map Button (when hidden, desktop only) */}
        {trip && !showMap && (
          <button
            onClick={() => {
              setShowMap(true);
              setActiveTab('map');
            }}
            className="hidden lg:block fixed bottom-8 right-8 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors z-20"
            title="Show map"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
