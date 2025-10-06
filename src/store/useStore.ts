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

  // Auth actions
  setUser: (user: User | null) => void;
  login: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;

  // Trip actions
  setTrip: (trip: Trip | null) => void;
  addMessage: (message: ChatMessage) => void;
  setConversationState: (state: ConversationState) => void;
  setIsLoading: (loading: boolean) => void;
  addItemToDay: (dayIndex: number, item: ItineraryItem) => void;
  replaceItemInDay: (dayIndex: number, oldItemId: string, newItem: ItineraryItem) => void;
  removeItemFromDay: (dayIndex: number, itemId: string) => void;
  updateTrip: (updates: Partial<Trip>) => void;
  clearAll: () => void;

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
        })),

      clearAll: () =>
        set({
          trip: null,
          currentTripId: null,
          messages: [],
          conversationState: 'initial',
          isLoading: false,
          isSyncing: false,
        }),

      // Database sync actions
      saveTripToDatabase: async () => {
        const state = get();
        if (!state.trip || !state.user) return; // Require authenticated user

        set({ isSyncing: true });

        try {
          if (state.currentTripId) {
            // Update existing trip
            await updateTrip(state.currentTripId, state.trip, state.messages);
          } else {
            // Create new trip (no userId needed - backend uses authenticated user)
            const response = await createTrip(state.trip, state.messages);
            set({ currentTripId: response.id });
          }
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
        // Persist everything except loading states
        user: state.user,
        trip: state.trip,
        currentTripId: state.currentTripId,
        messages: state.messages,
        conversationState: state.conversationState,
        // Exclude: isAuthLoading, isLoading, isSyncing
      }),
    }
  )
);
