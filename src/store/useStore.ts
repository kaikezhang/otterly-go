import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Trip,
  ChatMessage,
  ConversationState,
  ItineraryItem,
} from '../types';
import { createTrip, updateTrip, getUserId, type TripResponse } from '../services/tripApi';

interface StoreState {
  trip: Trip | null;
  currentTripId: string | null; // Database ID of current trip
  messages: ChatMessage[];
  conversationState: ConversationState;
  isLoading: boolean;
  isSyncing: boolean; // True when syncing to database

  // Actions
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
      trip: null,
      currentTripId: null,
      messages: [],
      conversationState: 'initial',
      isLoading: false,
      isSyncing: false,

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
        if (!state.trip) return;

        set({ isSyncing: true });

        try {
          const userId = getUserId();

          if (state.currentTripId) {
            // Update existing trip
            await updateTrip(state.currentTripId, state.trip, state.messages);
          } else {
            // Create new trip
            const response = await createTrip(userId, state.trip, state.messages);
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
    }
  )
);
