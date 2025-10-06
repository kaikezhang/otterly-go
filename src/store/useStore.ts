import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Trip,
  ChatMessage,
  ConversationState,
  ItineraryItem,
  User,
} from '../types';
import { createTrip, updateTrip, type TripResponse } from '../services/tripApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface StoreState {
  // Auth state
  user: User | null;
  isAuthLoading: boolean;

  // Trip state
  trip: Trip | null;
  currentTripId: string | null; // Database ID of current trip
  messages: ChatMessage[];
  conversationState: ConversationState;
  isLoading: boolean;
  isSyncing: boolean; // True when syncing to database

  // Edit mode state (Milestone 3.2)
  isEditMode: boolean;
  history: Trip[]; // History stack for undo/redo
  historyIndex: number; // Current position in history (-1 means no history)
  hasUnsavedChanges: boolean;

  // Auth actions
  setUser: (user: User | null) => void;
  login: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;

  // Trip actions
  setTrip: (trip: Trip | null) => void;
  addMessage: (message: ChatMessage) => void;
  markSuggestionAdded: (suggestionId: string, dayIndex: number) => void;
  setConversationState: (state: ConversationState) => void;
  setIsLoading: (loading: boolean) => void;
  addItemToDay: (dayIndex: number, item: ItineraryItem) => void;
  replaceItemInDay: (dayIndex: number, oldItemId: string, newItem: ItineraryItem) => void;
  removeItemFromDay: (dayIndex: number, itemId: string) => void;
  updateTrip: (updates: Partial<Trip>) => void;
  clearAll: () => void;

  // Edit mode actions (Milestone 3.2)
  toggleEditMode: () => void;
  pushHistory: () => void; // Save current trip state to history
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  updateItemInDay: (dayIndex: number, itemId: string, updates: Partial<ItineraryItem>) => void;
  reorderItemsInDay: (dayIndex: number, startIndex: number, endIndex: number) => void;
  moveItemBetweenDays: (fromDayIndex: number, toDayIndex: number, itemId: string, toIndex: number) => void;

  // Database sync actions
  saveTripToDatabase: () => Promise<void>;
  loadTripFromDatabase: (tripResponse: TripResponse) => void;
  setCurrentTripId: (id: string | null) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Auth state
      user: null,
      isAuthLoading: false,

      // Trip state
      trip: null,
      currentTripId: null,
      messages: [],
      conversationState: 'initial',
      isLoading: false,
      isSyncing: false,

      // Edit mode state
      isEditMode: false,
      history: [],
      historyIndex: -1,
      hasUnsavedChanges: false,

      // Auth actions
      setUser: (user) => set({ user }),

      login: () => {
        // Redirect to backend Google OAuth endpoint
        window.location.href = `${API_URL}/api/auth/google`;
      },

      logout: async () => {
        try {
          await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include', // Include cookies
          });
          set({ user: null });
          // Clear trip data on logout
          get().clearAll();
        } catch (error) {
          console.error('Logout failed:', error);
        }
      },

      checkAuth: async () => {
        set({ isAuthLoading: true });
        try {
          const response = await fetch(`${API_URL}/api/auth/me`, {
            credentials: 'include', // Include cookies
          });

          if (response.ok) {
            const user = await response.json();
            set({ user, isAuthLoading: false });
          } else {
            set({ user: null, isAuthLoading: false });
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          set({ user: null, isAuthLoading: false });
        }
      },

      // Trip actions
      setTrip: (trip) => set({ trip }),

      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      markSuggestionAdded: (suggestionId, dayIndex) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.suggestionCard?.id === suggestionId
              ? {
                  ...msg,
                  suggestionCard: {
                    ...msg.suggestionCard,
                    isAdded: true,
                    addedToDayIndex: dayIndex,
                  },
                }
              : msg
          ),
        })),

      setConversationState: (conversationState) => set({ conversationState }),

      setIsLoading: (isLoading) => set({ isLoading }),

      addItemToDay: (dayIndex, item) =>
        set((state) => {
          if (!state.trip) return state;
          const newTrip = { ...state.trip };
          newTrip.days = [...newTrip.days];
          newTrip.days[dayIndex] = {
            ...newTrip.days[dayIndex],
            items: [...newTrip.days[dayIndex].items, item],
          };
          return { trip: newTrip };
        }),

      replaceItemInDay: (dayIndex, oldItemId, newItem) =>
        set((state) => {
          if (!state.trip) return state;
          const newTrip = { ...state.trip };
          newTrip.days = [...newTrip.days];
          const day = newTrip.days[dayIndex];
          const itemIndex = day.items.findIndex((item) => item.id === oldItemId);
          if (itemIndex === -1) return state;

          const newItems = [...day.items];
          newItems[itemIndex] = newItem;
          newTrip.days[dayIndex] = { ...day, items: newItems };
          return { trip: newTrip };
        }),

      removeItemFromDay: (dayIndex, itemId) =>
        set((state) => {
          if (!state.trip) return state;
          const newTrip = { ...state.trip };
          newTrip.days = [...newTrip.days];
          newTrip.days[dayIndex] = {
            ...newTrip.days[dayIndex],
            items: newTrip.days[dayIndex].items.filter((item) => item.id !== itemId),
          };
          return { trip: newTrip };
        }),

      updateTrip: (updates) =>
        set((state) => ({
          trip: state.trip ? { ...state.trip, ...updates } : null,
          hasUnsavedChanges: true,
        })),

      // Edit mode actions
      toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),

      pushHistory: () =>
        set((state) => {
          if (!state.trip) return state;

          // Remove any future history if we're not at the end
          const newHistory = state.history.slice(0, state.historyIndex + 1);

          // Add current trip to history
          newHistory.push(JSON.parse(JSON.stringify(state.trip))); // Deep clone

          // Limit history to last 20 entries
          const trimmedHistory = newHistory.slice(-20);

          return {
            history: trimmedHistory,
            historyIndex: trimmedHistory.length - 1,
          };
        }),

      undo: () =>
        set((state) => {
          if (state.historyIndex <= 0) return state;

          const newIndex = state.historyIndex - 1;
          const previousTrip = state.history[newIndex];

          return {
            trip: JSON.parse(JSON.stringify(previousTrip)), // Deep clone
            historyIndex: newIndex,
            hasUnsavedChanges: true,
          };
        }),

      redo: () =>
        set((state) => {
          if (state.historyIndex >= state.history.length - 1) return state;

          const newIndex = state.historyIndex + 1;
          const nextTrip = state.history[newIndex];

          return {
            trip: JSON.parse(JSON.stringify(nextTrip)), // Deep clone
            historyIndex: newIndex,
            hasUnsavedChanges: true,
          };
        }),

      canUndo: () => {
        const state = get();
        return state.historyIndex > 0;
      },

      canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },

      updateItemInDay: (dayIndex, itemId, updates) =>
        set((state) => {
          if (!state.trip) return state;

          // Push current state to history before making changes
          get().pushHistory();

          const newTrip = { ...state.trip };
          newTrip.days = [...newTrip.days];
          const day = newTrip.days[dayIndex];
          const itemIndex = day.items.findIndex((item) => item.id === itemId);

          if (itemIndex === -1) return state;

          const newItems = [...day.items];
          newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
          newTrip.days[dayIndex] = { ...day, items: newItems };

          return { trip: newTrip, hasUnsavedChanges: true };
        }),

      reorderItemsInDay: (dayIndex, startIndex, endIndex) =>
        set((state) => {
          if (!state.trip) return state;

          // Push current state to history before making changes
          get().pushHistory();

          const newTrip = { ...state.trip };
          newTrip.days = [...newTrip.days];
          const day = newTrip.days[dayIndex];
          const newItems = [...day.items];

          // Reorder items
          const [removed] = newItems.splice(startIndex, 1);
          newItems.splice(endIndex, 0, removed);

          newTrip.days[dayIndex] = { ...day, items: newItems };

          return { trip: newTrip, hasUnsavedChanges: true };
        }),

      moveItemBetweenDays: (fromDayIndex, toDayIndex, itemId, toIndex) =>
        set((state) => {
          if (!state.trip) return state;

          // Push current state to history before making changes
          get().pushHistory();

          const newTrip = { ...state.trip };
          newTrip.days = [...newTrip.days];

          // Find and remove item from source day
          const fromDay = newTrip.days[fromDayIndex];
          const itemIndex = fromDay.items.findIndex((item) => item.id === itemId);
          if (itemIndex === -1) return state;

          const item = fromDay.items[itemIndex];
          const newFromItems = [...fromDay.items];
          newFromItems.splice(itemIndex, 1);
          newTrip.days[fromDayIndex] = { ...fromDay, items: newFromItems };

          // Add item to destination day
          const toDay = newTrip.days[toDayIndex];
          const newToItems = [...toDay.items];
          newToItems.splice(toIndex, 0, item);
          newTrip.days[toDayIndex] = { ...toDay, items: newToItems };

          return { trip: newTrip, hasUnsavedChanges: true };
        }),

      clearAll: () =>
        set({
          trip: null,
          currentTripId: null,
          messages: [],
          conversationState: 'initial',
          isLoading: false,
          isSyncing: false,
          isEditMode: false,
          history: [],
          historyIndex: -1,
          hasUnsavedChanges: false,
        }),

      // Database sync actions
      saveTripToDatabase: async () => {
        const state = get();
        if (!state.trip || !state.user) return; // Require authenticated user

        set({ isSyncing: true, hasUnsavedChanges: true });

        try {
          if (state.currentTripId) {
            // Update existing trip
            await updateTrip(state.currentTripId, state.trip, state.messages);
          } else {
            // Create new trip (no userId needed - backend uses authenticated user)
            const response = await createTrip(state.trip, state.messages);
            // Update both currentTripId and trip.id with the database ID
            set({
              currentTripId: response.id,
              trip: { ...state.trip, id: response.id }
            });
          }
          set({ hasUnsavedChanges: false });
        } catch (error) {
          console.error('Failed to save trip to database:', error);
          // Don't throw - continue with local storage
        } finally {
          set({ isSyncing: false });
        }
      },

      loadTripFromDatabase: (tripResponse: TripResponse) => {
        set({
          trip: tripResponse.tripData,
          currentTripId: tripResponse.id,
          messages: tripResponse.messages,
        });
      },

      setCurrentTripId: (id: string | null) => set({ currentTripId: id }),
    }),
    {
      name: 'otterly-go-storage',
      partialize: (state) => ({
        // Persist everything except loading states and history
        user: state.user,
        trip: state.trip,
        currentTripId: state.currentTripId,
        messages: state.messages,
        conversationState: state.conversationState,
        isEditMode: state.isEditMode,
        // Exclude: isAuthLoading, isLoading, isSyncing, history, historyIndex, hasUnsavedChanges
      }),
    }
  )
);
