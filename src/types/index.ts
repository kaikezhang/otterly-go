export type TravelPace = 'fast' | 'medium' | 'slow';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  subscriptionTier: 'free' | 'premium';
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

export interface Trip {
  id: string;
  destination: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
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
}

export interface Quote {
  zh: string; // Chinese original
  en: string; // English translation
}

export interface SourceLink {
  url: string;
  label: string; // e.g., "View note", "Xiaohongshu"
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
