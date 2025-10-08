import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Trip,
  ChatMessage,
  ConversationState,
  ItineraryItem,
  User,
  Flight,
  Booking,
} from '../types';
import {
  createTrip,
  updateTrip,
  deleteTrip as deleteTripAPI,
  listTrips,
  type TripResponse,
} from '../services/tripApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface StoreState {
  // Hydration state
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;

  // Auth state
  user: User | null;
  isAuthLoading: boolean;

  // Multi-trip state (Milestone 3.5 Part 2)
  trips: Trip[]; // All user trips (cached)
  tripsLoaded: boolean; // Track if trips have been fetched from API

  // Current trip state
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

  // Itinerary change tracking (for highlighting new/modified items)
  changedItemIds: Set<string>; // IDs of items that changed since last view
  lastViewedItineraryTime: number | null; // Timestamp when user last viewed itinerary

  // Auth actions
  setUser: (user: User | null) => void;
  login: () => void; // Google OAuth login
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshAuth: () => Promise<void>;

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
  duplicateDay: (dayIndex: number) => void;

  // Database sync actions
  saveTripToDatabase: () => Promise<void>;
  loadTripFromDatabase: (tripResponse: TripResponse) => void;
  setCurrentTripId: (id: string | null) => void;

  // Multi-trip management actions (Milestone 3.5 Part 2)
  loadAllTrips: () => Promise<void>;
  loadTrip: (id: string) => Promise<void>;
  switchTrip: (id: string) => void;
  deleteTrip: (id: string) => Promise<void>;
  archiveTrip: (id: string) => Promise<void>;
  duplicateTrip: (id: string) => Promise<Trip>;
  invalidateTripsCache: () => void;

  // Itinerary change tracking actions
  markItineraryViewed: () => void;
  markItemsAsChanged: (itemIds: string[]) => void;
  clearChangedItems: () => void;

  // Budget actions (Phase 1: MVP, Phase 2: Categories)
  setBudget: (total: number, currency: string, categories?: Record<string, number>) => void;
  updateItemCost: (dayIndex: number, itemId: string, cost: number | undefined, category?: string) => void;

  // Booking state (Phase 7.1)
  flightSearchResults: Flight[];
  returnFlightSearchResults: Flight[]; // For round-trip bookings
  searchCriteria: SearchCriteria | null; // Store criteria to determine round-trip
  selectedFlight: Flight | null;
  selectedReturnFlight: Flight | null; // For round-trip bookings
  currentBooking: Booking | null;
  bookingMode: boolean;

  // Booking actions
  setFlightSearchResults: (flights: Flight[]) => void;
  setReturnFlightSearchResults: (flights: Flight[]) => void;
  setSearchCriteria: (criteria: SearchCriteria | null) => void;
  setSelectedFlight: (flight: Flight | null) => void;
  setSelectedReturnFlight: (flight: Flight | null) => void;
  setCurrentBooking: (booking: Booking | null) => void;
  toggleBookingMode: () => void;
  clearBookingState: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Hydration state
      hasHydrated: false,
      setHasHydrated: (hydrated: boolean) => set({ hasHydrated: hydrated }),

      // Auth state
      user: null,
      isAuthLoading: false,

      // Multi-trip state
      trips: [],
      tripsLoaded: false,

      // Current trip state
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

      // Itinerary change tracking
      changedItemIds: new Set(),
      lastViewedItineraryTime: null,

      // Auth actions
      setUser: (user) => set({ user }),

      login: () => {
        // Redirect to backend Google OAuth endpoint
        window.location.href = `${API_URL}/api/auth/google`;
      },

      loginWithEmail: async (email: string, password: string) => {
        try {
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies
            body: JSON.stringify({ email, password }),
          });

          if (response.ok) {
            const user = await response.json();
            set({ user });
            return { success: true };
          } else {
            const error = await response.json();
            return { success: false, error: error.error || 'Login failed' };
          }
        } catch (error) {
          console.error('Login failed:', error);
          return { success: false, error: 'Network error. Please try again.' };
        }
      },

      register: async (email: string, password: string, name?: string) => {
        try {
          const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies
            body: JSON.stringify({ email, password, name }),
          });

          if (response.ok) {
            const user = await response.json();
            set({ user });
            return { success: true };
          } else {
            const error = await response.json();
            return { success: false, error: error.error || 'Registration failed' };
          }
        } catch (error) {
          console.error('Registration failed:', error);
          return { success: false, error: 'Network error. Please try again.' };
        }
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
            // If auth fails, clear the invalid cookie
            if (response.status === 401) {
              await fetch(`${API_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include',
              });
            }
            set({ user: null, isAuthLoading: false });
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          set({ user: null, isAuthLoading: false });
        }
      },

      refreshAuth: async () => {
        try {
          const response = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          });

          if (response.ok) {
            const user = await response.json();
            set({ user });
          } else {
            console.error('Failed to refresh auth token');
          }
        } catch (error) {
          console.error('Error refreshing auth token:', error);
        }
      },

      // Trip actions
      setTrip: (trip) => {
        if (!trip) {
          set({ trip: null, changedItemIds: new Set() });
          return;
        }

        const state = get();
        const oldTrip = state.trip;

        // If there's an existing trip, detect changes
        if (oldTrip) {
          const newChangedItemIds = new Set<string>();

          // Build maps for efficient lookup
          const oldItemsMap = new Map<string, ItineraryItem>();
          oldTrip.days.forEach(day => {
            day.items.forEach(item => {
              oldItemsMap.set(item.id, item);
            });
          });

          const newItemsMap = new Map<string, ItineraryItem>();
          trip.days.forEach(day => {
            day.items.forEach(item => {
              newItemsMap.set(item.id, item);
            });
          });

          // Find new or modified items
          newItemsMap.forEach((newItem, id) => {
            const oldItem = oldItemsMap.get(id);
            if (!oldItem) {
              // New item
              newChangedItemIds.add(id);
            } else {
              // Check if item was modified by comparing key fields
              if (
                oldItem.title !== newItem.title ||
                oldItem.description !== newItem.description ||
                oldItem.type !== newItem.type ||
                oldItem.duration !== newItem.duration ||
                oldItem.startTime !== newItem.startTime ||
                oldItem.endTime !== newItem.endTime ||
                oldItem.notes !== newItem.notes
              ) {
                newChangedItemIds.add(id);
              }
            }
          });

          set({ trip, changedItemIds: newChangedItemIds });
        } else {
          // First time setting a trip, no changes to highlight
          set({ trip, changedItemIds: new Set() });
        }
      },

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
        set((state) => {
          if (!state.trip) return state;

          const newTrip = { ...state.trip, ...updates };

          // Detect changed items when days are updated
          const newChangedItemIds = new Set<string>();

          if (updates.days) {
            // Build maps for efficient lookup
            const oldItemsMap = new Map<string, ItineraryItem>();
            state.trip.days.forEach(day => {
              day.items.forEach(item => {
                oldItemsMap.set(item.id, item);
              });
            });

            const newItemsMap = new Map<string, ItineraryItem>();
            newTrip.days.forEach(day => {
              day.items.forEach(item => {
                newItemsMap.set(item.id, item);
              });
            });

            // Find new or modified items
            newItemsMap.forEach((newItem, id) => {
              const oldItem = oldItemsMap.get(id);
              if (!oldItem) {
                // New item
                newChangedItemIds.add(id);
              } else {
                // Check if item was modified by comparing key fields
                if (
                  oldItem.title !== newItem.title ||
                  oldItem.description !== newItem.description ||
                  oldItem.type !== newItem.type ||
                  oldItem.duration !== newItem.duration ||
                  oldItem.startTime !== newItem.startTime ||
                  oldItem.endTime !== newItem.endTime ||
                  oldItem.notes !== newItem.notes
                ) {
                  newChangedItemIds.add(id);
                }
              }
            });
          }

          return {
            trip: newTrip,
            hasUnsavedChanges: true,
            changedItemIds: newChangedItemIds,
          };
        }),

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

      duplicateDay: (dayIndex) =>
        set((state) => {
          if (!state.trip) return state;

          // Push current state to history before making changes
          get().pushHistory();

          const newTrip = { ...state.trip };
          newTrip.days = [...newTrip.days];

          // Deep clone the day to duplicate
          const dayToDuplicate = newTrip.days[dayIndex];
          const duplicatedDay = {
            ...dayToDuplicate,
            items: dayToDuplicate.items.map((item) => ({
              ...item,
              id: crypto.randomUUID(), // Generate new IDs for items
            })),
          };

          // Insert duplicated day right after the original
          newTrip.days.splice(dayIndex + 1, 0, duplicatedDay);

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

      // Multi-trip management actions (Milestone 3.5 Part 2)
      loadAllTrips: async () => {
        const state = get();
        if (!state.user) return;

        try {
          const response = await listTrips();
          // Extract tripData from each TripResponse
          const trips = response.trips.map(tr => tr.tripData);
          set({
            trips,
            tripsLoaded: true,
          });
        } catch (error) {
          console.error('Failed to load trips:', error);
        }
      },

      loadTrip: async (id: string) => {
        try {
          set({ isLoading: true });
          const tripResponse = await import('../services/tripApi').then(m => m.getTrip(id));
          get().loadTripFromDatabase(tripResponse);

          // Update trips cache
          const state = get();
          const tripIndex = state.trips.findIndex(t => t.id === id);
          if (tripIndex >= 0) {
            const newTrips = [...state.trips];
            newTrips[tripIndex] = tripResponse.tripData;
            set({ trips: newTrips });
          }
        } catch (error) {
          console.error('Failed to load trip:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      switchTrip: (id: string) => {
        const state = get();
        const trip = state.trips.find(t => t.id === id);
        if (trip) {
          set({
            trip,
            currentTripId: id,
            conversationState: 'ready',
          });
        }
      },

      deleteTrip: async (id: string) => {
        try {
          await deleteTripAPI(id);

          // Remove from cache
          const state = get();
          set({
            trips: state.trips.filter(t => t.id !== id),
          });

          // Clear current trip if it's the deleted one
          if (state.currentTripId === id) {
            get().clearAll();
          }
        } catch (error) {
          console.error('Failed to delete trip:', error);
          throw error;
        }
      },

      archiveTrip: async (id: string) => {
        try {
          const state = get();
          const trip = state.trips.find(t => t.id === id);
          if (!trip) return;

          // Update trip with archived status
          const updatedTrip = {
            ...trip,
            status: 'archived' as const,
            archivedAt: new Date().toISOString(),
          };

          await updateTrip(id, updatedTrip, []);

          // Update cache
          const tripIndex = state.trips.findIndex(t => t.id === id);
          if (tripIndex >= 0) {
            const newTrips = [...state.trips];
            newTrips[tripIndex] = updatedTrip;
            set({ trips: newTrips });
          }

          // Clear current trip if it's the archived one
          if (state.currentTripId === id) {
            get().clearAll();
          }
        } catch (error) {
          console.error('Failed to archive trip:', error);
          throw error;
        }
      },

      duplicateTrip: async (id: string) => {
        try {
          const state = get();
          const tripToDuplicate = state.trips.find(t => t.id === id);
          if (!tripToDuplicate) throw new Error('Trip not found');

          // Create a copy without ID and dates
          const duplicatedTrip: Trip = {
            ...tripToDuplicate,
            id: '', // Will be assigned by backend
            title: `${tripToDuplicate.title || tripToDuplicate.destination} (Copy)`,
            startDate: null,
            endDate: null,
            status: 'draft',
            archivedAt: null,
            createdAt: undefined,
            updatedAt: undefined,
          };

          // Create the trip in the database
          const response = await createTrip(duplicatedTrip, []);

          // Add to cache
          const newTrip = { ...duplicatedTrip, id: response.id };
          set({
            trips: [newTrip, ...state.trips],
          });

          return newTrip;
        } catch (error) {
          console.error('Failed to duplicate trip:', error);
          throw error;
        }
      },

      invalidateTripsCache: () => {
        set({ tripsLoaded: false });
      },

      // Itinerary change tracking actions
      markItineraryViewed: () => {
        set({
          changedItemIds: new Set(),
          lastViewedItineraryTime: Date.now(),
        });
      },

      markItemsAsChanged: (itemIds: string[]) => {
        set((state) => {
          const newChangedItemIds = new Set(state.changedItemIds);
          itemIds.forEach(id => newChangedItemIds.add(id));
          return { changedItemIds: newChangedItemIds };
        });
      },

      clearChangedItems: () => {
        set({ changedItemIds: new Set() });
      },

      // Budget actions (Phase 1: MVP, Phase 2: Categories)
      setBudget: (total: number, currency: string, categories?: Record<string, number>) =>
        set((state) => {
          if (!state.trip) return state;
          return {
            trip: {
              ...state.trip,
              budget: { total, currency, ...(categories && { categories }) },
            },
            hasUnsavedChanges: true,
          };
        }),

      updateItemCost: (dayIndex: number, itemId: string, cost: number | undefined, category?: string) =>
        set((state) => {
          if (!state.trip) return state;

          const newTrip = { ...state.trip };
          newTrip.days = [...newTrip.days];
          const day = newTrip.days[dayIndex];
          const itemIndex = day.items.findIndex((item) => item.id === itemId);

          if (itemIndex === -1) return state;

          const newItems = [...day.items];
          newItems[itemIndex] = {
            ...newItems[itemIndex],
            cost,
            ...(category && { costCategory: category as any })
          };
          newTrip.days[dayIndex] = { ...day, items: newItems };

          return { trip: newTrip, hasUnsavedChanges: true };
        }),

      // Booking state (Phase 7.1)
      flightSearchResults: [],
      returnFlightSearchResults: [],
      searchCriteria: null,
      selectedFlight: null,
      selectedReturnFlight: null,
      currentBooking: null,
      bookingMode: false,

      // Booking actions
      setFlightSearchResults: (flights) => set({ flightSearchResults: flights }),
      setReturnFlightSearchResults: (flights) => set({ returnFlightSearchResults: flights }),
      setSearchCriteria: (criteria) => set({ searchCriteria: criteria }),
      setSelectedFlight: (flight) => set({ selectedFlight: flight }),
      setSelectedReturnFlight: (flight) => set({ selectedReturnFlight: flight }),
      setCurrentBooking: (booking) => set({ currentBooking: booking }),
      toggleBookingMode: () => set((state) => ({ bookingMode: !state.bookingMode })),
      clearBookingState: () => set({
        flightSearchResults: [],
        returnFlightSearchResults: [],
        searchCriteria: null,
        selectedFlight: null,
        selectedReturnFlight: null,
        currentBooking: null,
        bookingMode: false,
      }),
    }),
    {
      name: 'otterly-go-storage',
      partialize: (state) => ({
        // Persist everything except loading states and history
        user: state.user,
        trips: state.trips, // Cache all trips
        tripsLoaded: state.tripsLoaded,
        trip: state.trip,
        currentTripId: state.currentTripId,
        messages: state.messages,
        conversationState: state.conversationState,
        isEditMode: state.isEditMode,
        // Exclude: isAuthLoading, isLoading, isSyncing, history, historyIndex, hasUnsavedChanges, hasHydrated
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
