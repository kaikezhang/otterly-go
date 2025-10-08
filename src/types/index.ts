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
  cost?: number; // Cost in the trip's budget currency (Phase 1: MVP)
  costCategory?: BudgetCategory; // Category for budget tracking (Phase 2)
}

export interface Day {
  date: string; // ISO date string
  location?: string;
  items: ItineraryItem[];
}

export type TripStatus = 'draft' | 'planning' | 'upcoming' | 'active' | 'completed' | 'archived';

export type BudgetCategory = 'flights' | 'hotels' | 'food' | 'activities' | 'transport' | 'misc';

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
  // Budget fields (Phase 1: MVP, Phase 2: Categories)
  budget?: {
    total: number;
    currency: string; // ISO code (USD, EUR, JPY, etc.)
    categories?: Record<BudgetCategory, number>; // Phase 2: Budget allocation by category
  };
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
  detailedDescription?: string; // Longer, more appealing description (1-2 paragraphs)
  quotes: Quote[]; // 1-2 quotes
  sourceLinks: SourceLink[]; // 1-3 source links
  defaultDayIndex?: number; // Suggested day to add to (0-based)
  itemType: ItemType;
  duration?: string;
  photoQuery?: string; // LLM-generated photo search query (Milestone 3.3)
  isAdded?: boolean; // Track if this suggestion has been added to itinerary
  addedToDayIndex?: number; // Which day it was added to
  source?: 'xiaohongshu' | 'reddit' | 'multi-platform' | 'ai-generated' | 'generated'; // Source of the suggestion
  xiaohongshuMeta?: XiaohongshuMeta; // Metadata if sourced from Xiaohongshu (deprecated)
  platformMeta?: {
    authorName: string;
    authorAvatar?: string;
    likes: number;
    comments: number;
    shares: number;
    platform: string;
    contentLang: string;
    engagementScore: number;
    location?: string;
    bestTime?: string;
  }; // Unified platform metadata
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

// Flight Booking Types (Phase 7.1)

export type AgentType = 'planning' | 'booking';

export interface AgentContext {
  agent: AgentType;
  conversationId: string;
  state: string;
  metadata?: Record<string, any>;
  history?: ChatMessage[];
}

export type BookingResponseType =
  | 'search_flights'
  | 'flight_options'
  | 'passenger_form'
  | 'payment_required'
  | 'booking_confirmed'
  | 'message';

export interface Flight {
  id: string;
  origin: string;
  destination: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  stops: number;
  airline: string;
  flightNumber: string;
  price: number;
  currency: string;
  badge?: string; // 'Best Value', 'Fastest', 'Cheapest'
  provider: string; // 'duffel', 'kiwi'
  offerId?: string; // Provider-specific offer ID
}

export interface SearchCriteria {
  origin: string;
  destination: string;
  departDate: string; // ISO date
  returnDate?: string; // ISO date
  passengers: number;
  class: 'economy' | 'business' | 'first';
}

export interface Passenger {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date
  passportNumber?: string;
  passportExpiry?: string; // ISO date
  passportCountry?: string;
}

export interface BookingRequest {
  flightId: string;
  offerId: string;
  passengers: Passenger[];
  tripId?: string;
  totalPrice: number;
}

export interface Booking {
  id: string;
  userId: string;
  tripId?: string;
  pnr: string;
  provider: string;
  status: 'pending' | 'confirmed' | 'ticketed' | 'cancelled';
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  airline: string;
  flightNumber: string;
  passengers: Passenger[];
  totalPrice: number;
  currency: string;
  confirmationEmail?: string;
  ticketUrls?: string[];
  createdAt: string;
}

export interface BookingResponse {
  type: BookingResponseType;
  message: string;
  criteria?: SearchCriteria;
  flights?: Flight[];
  highlight?: string;
  fields?: string[];
  summary?: {
    flight: string;
    total: number;
    breakdown: Record<string, number>;
  };
  booking_id?: string;
  booking?: Booking;
  next_steps?: string[];
}

export interface PriceAlert {
  id: string;
  origin: string;
  destination: string;
  departDate?: string;
  returnDate?: string;
  targetPrice: number;
  currentPrice?: number;
  isActive: boolean;
}
