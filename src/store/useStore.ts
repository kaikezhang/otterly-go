import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Trip,
  ChatMessage,
  ConversationState,
  ItineraryItem,
} from '../types';

interface StoreState {
  trip: Trip | null;
  messages: ChatMessage[];
  conversationState: ConversationState;
  isLoading: boolean;

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
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      trip: null,
      messages: [],
      conversationState: 'initial',
      isLoading: false,

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
          messages: [],
          conversationState: 'initial',
          isLoading: false,
        }),
    }),
    {
      name: 'otterly-go-storage',
    }
  )
);
