export type TravelPace = 'fast' | 'medium' | 'slow';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role?: 'user' | 'admin';
  subscriptionTier: 'free' | 'pro' | 'team';
  // Subscription fields (Milestone 4.1)
  subscriptionStatus?: string | null;
  subscriptionPeriodEnd?: string | null;
  tripCount?: number;
  // User preferences (Milestone 2.3)
  customName?: string | null;
  customPicture?: string | null;
  emailNotifications?: boolean;
  tripReminders?: boolean;
  publicProfile?: boolean;
  googleId?: string | null;
}

export type ItemType =
  | 'sight'
  | 'food'
  | 'museum'
  | 'hike'
  | 'experience'
  | 'transport'
  | 'rest';

export interface ItineraryItem {
  id: string;
  title: string;
  type: ItemType;
  description: string;
  notes?: string;
  duration?: string;
  startTime?: string; // Format: "HH:MM" (24-hour)
  endTime?: string; // Format: "HH:MM" (24-hour)
  locationHint?: string; // LLM-provided location (e.g., "Lima, Peru")
  location?: {
    lat: number;
    lng: number;
    address?: string; // Full formatted address
  };
  photoId?: string; // Optional photo from library
}

export interface Day {
  date: string; // ISO date string
  location?: string;
  items: ItineraryItem[];
}

export type TripStatus = 'draft' | 'planning' | 'upcoming' | 'active' | 'completed' | 'archived';

export interface Trip {
  id: string;
  destination: string;
  startDate: string | null; // ISO date string, nullable for draft trips
  endDate: string | null; // ISO date string, nullable for draft trips
  pace: TravelPace;
  interests: string[];
  mustSee: string[];
  days: Day[];
  coverPhotoId?: string; // Optional cover photo from library (deprecated - use coverPhotoUrl instead)
  coverPhotoUrl?: string; // Direct URL to cover photo
  coverPhotoAttribution?: {
    photographerName: string;
    photographerUrl: string;
    sourceUrl: string;
  };
  // Trip management fields (Milestone 3.5)
  status?: TripStatus;
  tags?: string[];
  displayOrder?: number;
  lastViewedAt?: string; // ISO date string
  archivedAt?: string | null; // ISO date string
  // Metadata
  userId?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Quote {
  zh: string; // Chinese original
  en: string; // English translation
}

export interface SourceLink {
  url: string;
  label: string; // e.g., "View note", "Xiaohongshu"
}

export interface XiaohongshuMeta {
  authorName: string;
  authorAvatar?: string;
  likes: number;
  comments: number;
}

export interface SuggestionCard {
  id: string;
  title: string;
  images: string[]; // URLs to images
  summary: string; // 2-3 sentence description
  quotes: Quote[]; // 1-2 quotes
  sourceLinks: SourceLink[]; // 1-3 source links
  defaultDayIndex?: number; // Suggested day to add to (0-based)
  itemType: ItemType;
  duration?: string;
  photoQuery?: string; // LLM-generated photo search query (Milestone 3.3)
  isAdded?: boolean; // Track if this suggestion has been added to itinerary
  addedToDayIndex?: number; // Which day it was added to
  source?: 'xiaohongshu' | 'generated'; // Source of the suggestion
  xiaohongshuMeta?: XiaohongshuMeta; // Metadata if sourced from Xiaohongshu
}

export interface QuickReply {
  text: string;
  action: 'info' | 'confirm' | 'alternative' | 'custom';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestionCard?: SuggestionCard;
  quickReplies?: QuickReply[];
  timestamp: number;
  hasItineraryChanges?: boolean; // Track if this message contains itinerary changes
  isNewItinerary?: boolean; // Track if this is a new itinerary generation vs update
}

export type ConversationState =
  | 'initial'
  | 'eliciting'
  | 'ready'
  | 'chatting';

export interface AppState {
  trip: Trip | null;
  messages: ChatMessage[];
  conversationState: ConversationState;
  isLoading: boolean;
}

// Trip filtering and sorting (Milestone 3.5)
export interface TripFilters {
  search?: string;
  status?: TripStatus | 'all' | 'past';
  tags?: string[];
  archived?: boolean;
  sort?: 'recent' | 'oldest' | 'name' | 'startDate' | 'endDate';
  order?: 'asc' | 'desc';
}

export interface TripStats {
  total: number;
  byStatus: Record<TripStatus, number>;
  destinationsCount: number;
  placesCount: number;
  totalDays: number;
  activitiesCount: number;
}
