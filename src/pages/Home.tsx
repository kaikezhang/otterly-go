import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Chat } from '../components/Chat';
import { ItineraryView } from '../components/ItineraryView';
import { MapView } from '../components/MapView';
import { ConfirmModal } from '../components/ConfirmModal';
import { TripHeader } from '../components/TripHeader';
import { TripSettingsModal } from '../components/TripSettingsModal';
import { ShareButton } from '../components/ShareButton';
import UsageWarning, { type UsageWarningData } from '../components/UsageWarning';
import { getConversationEngine } from '../services/conversationEngine';
import { getTripCoverPhoto } from '../services/photoApi';
import { getTrip } from '../services/tripApi';
import type { ItineraryItem, QuickReply } from '../types';

export default function Home() {
  const navigate = useNavigate();
  const { id: tripId } = useParams<{ id: string }>();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const {
    user,
    trip,
    messages,
    isLoading,
    isSyncing,
    isEditMode,
    hasUnsavedChanges,
    hasHydrated,
    currentTripId,
    setTrip,
    addMessage,
    markSuggestionAdded,
    setConversationState,
    setIsLoading,
    addItemToDay,
    removeItemFromDay,
    updateTrip,
    saveTripToDatabase,
    loadTripFromDatabase,
    logout,
    toggleEditMode,
    undo,
    redo,
    canUndo,
    canRedo,
    updateItemInDay,
    reorderItemsInDay,
    moveItemBetweenDays,
    duplicateDay,
    archiveTrip,
    duplicateTrip: duplicateTripAction,
    deleteTrip,
  } = useStore();

  const [error, setError] = useState<string | null>(null);
  const [usageWarning, setUsageWarning] = useState<UsageWarningData | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedDayIndex, _setSelectedDayIndex] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'itinerary' | 'map'>('chat');
  const [showStartOverModal, setShowStartOverModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  // Load trip from database when navigating to /trip/:id
  useEffect(() => {
    if (hasHydrated && tripId && tripId !== 'new' && tripId !== currentTripId) {
      const loadTrip = async () => {
        try {
          setIsLoading(true);
          const tripData = await getTrip(tripId);
          loadTripFromDatabase(tripData);
        } catch (err) {
          console.error('Failed to load trip:', err);
          setError('Failed to load trip. Redirecting to dashboard...');
          setTimeout(() => navigate('/dashboard'), 2000);
        } finally {
          setIsLoading(false);
        }
      };
      loadTrip();
    }
  }, [hasHydrated, tripId, currentTripId, loadTripFromDatabase, setIsLoading, navigate]);

  // Clear state and initialize when navigating to /trip/new
  useEffect(() => {
    if (hasHydrated && (!tripId || tripId === 'new')) {
      // Prevent double execution (React StrictMode in dev)
      if (hasInitialized.current) {
        return;
      }
      hasInitialized.current = true;

      // Clear any existing state (same as Start Over button)
      useStore.getState().clearAll();

      // Add initial greeting after clearing
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

    // Reset flag when navigating away from new trip
    return () => {
      if (tripId && tripId !== 'new') {
        hasInitialized.current = false;
      }
    };
  }, [hasHydrated, tripId, addMessage, setConversationState]);

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

      // Set usage warning if present
      if (response.usageWarning) {
        setUsageWarning(response.usageWarning);
      }

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

        // Auto-fetch cover photo (no database write needed)
        getTripCoverPhoto(response.trip.destination)
          .then(photo => {
            if (photo) {
              // Store photo data directly in trip object
              updateTrip({ ...response.trip, coverPhotoUrl: photo.urls.regular, coverPhotoAttribution: photo.attribution });
            }
          })
          .catch(error => console.error('Failed to fetch cover photo:', error));
      } else if (response.tripUpdate) {
        updateTrip(response.tripUpdate);
      }
    } catch (err) {
      // Check if this is an auth error that requires logout
      if (err instanceof Error && (err as any).requiresLogout) {
        logout();
        navigate('/login');
        return;
      }

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

    // Mark suggestion as added in the store
    markSuggestionAdded(suggestionId, dayIndex);

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
    await logout();
    setShowLogoutModal(false);
  };

  const handleStartOver = async () => {
    // Clear trip data but keep user auth
    useStore.getState().clearAll();
    // Wait for state to be persisted to localStorage
    await new Promise(resolve => setTimeout(resolve, 100));
    // Navigate to new trip page
    setShowStartOverModal(false);
    window.location.href = '/trip/new';
  };

  const handleArchive = async () => {
    if (!currentTripId) return;
    try {
      await archiveTrip(currentTripId);
      setShowArchiveModal(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to archive trip:', error);
      setError('Failed to archive trip. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!currentTripId) return;
    try {
      await deleteTrip(currentTripId);
      setShowDeleteModal(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to delete trip:', error);
      setError('Failed to delete trip. Please try again.');
    }
  };

  const handleDuplicate = async () => {
    if (!currentTripId) return;
    try {
      const duplicatedTrip = await duplicateTripAction(currentTripId);
      navigate(`/trip/${duplicatedTrip.id}`);
    } catch (error) {
      console.error('Failed to duplicate trip:', error);
      setError('Failed to duplicate trip. Please try again.');
    }
  };

  // Main App Screen
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Trip Header (when trip exists) */}
      {trip && (
        <TripHeader
          trip={trip}
          onUpdate={updateTrip}
          onShare={() => setShowShareModal(true)}
          onDuplicate={handleDuplicate}
          onArchive={() => setShowArchiveModal(true)}
          onDelete={() => setShowDeleteModal(true)}
          onSettings={() => setShowSettingsModal(true)}
        />
      )}

      {/* Simple Header (when no trip) */}
      {!trip && (
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">🦦 OtterlyGo</h1>
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
            {/* Start Over Button - only show if there are messages */}
            {messages.length > 0 && (
              <button
                onClick={() => setShowStartOverModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
                title="Start a new trip"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Start Over</span>
              </button>
            )}
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
                        setShowLogoutModal(true);
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
      )}

      {/* Edit Mode & View Controls (when trip exists) */}
      {trip && (
        <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Edit Mode Undo/Redo */}
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
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-all ${
                isEditMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md ring-2 ring-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {isEditMode ? '✓ Editing' : 'Edit Mode'}
            </button>
            <button
              onClick={() => {
                setShowMap(!showMap);
                if (!showMap) setActiveTab('map');
              }}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
                showMap
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={showMap ? 'Hide Map' : 'Show Map'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              {showMap ? 'Hide Map' : 'Show Map'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Sync Status */}
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
            <button
              onClick={() => setShowStartOverModal(true)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

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

      {/* Usage Warning Banner */}
      {usageWarning && (
        <div className="px-4 pt-4 max-w-7xl mx-auto w-full">
          <UsageWarning
            warning={usageWarning}
            onDismiss={() => setUsageWarning(null)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: 3-panel layout | Mobile: Tab-based */}

        {/* Chat Area */}
        <div className={`${
          trip
            ? showMap
              ? 'lg:w-1/3' // Desktop with map: 1/3 width
              : 'lg:w-1/2' // Desktop without map: 1/2 width
            : 'w-full' // No trip: full width
        } ${
          trip && activeTab !== 'chat' ? 'hidden' : '' // Mobile: hide when other tabs active
        } border-r border-gray-200 transition-all duration-300 ease-in-out lg:block`}>
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
          <div className={`${
            showMap
              ? 'lg:w-1/3' // Desktop with map: 1/3 width
              : 'lg:w-1/2' // Desktop without map: 1/2 width
          } ${
            activeTab !== 'itinerary' ? 'hidden' : 'w-full'
          } bg-white border-r border-gray-200 transition-all duration-300 ease-in-out lg:block`}>
            <ItineraryView
              trip={trip}
              isEditMode={isEditMode}
              onRemoveItem={handleRemoveItem}
              onRequestSuggestion={handleRequestSuggestion}
              onRequestReplace={handleRequestReplace}
              onUpdateItem={updateItemInDay}
              onReorderItems={reorderItemsInDay}
              onMoveItemBetweenDays={moveItemBetweenDays}
              onDuplicateDay={duplicateDay}
              isSyncing={isSyncing}
              currentTripId={currentTripId}
            />
          </div>
        )}

        {/* Map View */}
        {trip && (showMap || activeTab === 'map') && (
          <div className={`lg:w-1/3 ${
            activeTab !== 'map' ? 'hidden' : 'w-full'
          } bg-gray-100 transition-all duration-300 ease-in-out lg:block`}>
            <MapView
              trip={trip}
              selectedDayIndex={selectedDayIndex}
              isVisible={showMap || activeTab === 'map'}
            />
          </div>
        )}
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showStartOverModal}
        title="Start Over?"
        message="This will clear your current trip and start a fresh conversation. Your saved trips will not be affected."
        confirmText="Start Over"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleStartOver}
        onCancel={() => setShowStartOverModal(false)}
      />

      <ConfirmModal
        isOpen={showLogoutModal}
        title="Sign Out?"
        message="Are you sure you want to sign out? Your trips are saved and will be available when you sign in again."
        confirmText="Sign Out"
        cancelText="Cancel"
        variant="primary"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Trip Settings Modal */}
      {trip && (
        <TripSettingsModal
          isOpen={showSettingsModal}
          trip={trip}
          onClose={() => setShowSettingsModal(false)}
          onUpdate={updateTrip}
        />
      )}

      {/* Share Modal - ShareButton manages its own modal state */}
      {trip && currentTripId && showShareModal && (
        <ShareButton
          tripId={currentTripId}
          tripTitle={trip.title || trip.destination}
          isSyncing={isSyncing}
          currentTripId={currentTripId}
        />
      )}

      {/* Archive Confirmation */}
      <ConfirmModal
        isOpen={showArchiveModal}
        title="Archive Trip?"
        message="This will archive your trip. You can restore it later from the Dashboard."
        confirmText="Archive"
        cancelText="Cancel"
        variant="primary"
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveModal(false)}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Trip?"
        message="This will permanently delete your trip and all its data. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
