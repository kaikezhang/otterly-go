export type TravelPace = 'fast' | 'medium' | 'slow';

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
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestionCard?: SuggestionCard;
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
