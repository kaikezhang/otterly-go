// Flight API Types and Provider Interface

export interface SearchCriteria {
  origin: string;
  destination: string;
  departDate: Date;
  returnDate?: Date;
  passengers: number;
  class: 'economy' | 'business' | 'first';
}

export interface Passenger {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  passportNumber?: string;
  passportExpiry?: Date;
  passportCountry?: string;
}

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
  badge?: string;
  provider: string;
  offerId: string;
  details?: any; // Provider-specific flight details
}

export interface FlightDetails {
  id: string;
  origin: string;
  destination: string;
  segments: FlightSegment[];
  price: PriceBreakdown;
  baggage: BaggageInfo;
  amenities?: string[];
}

export interface FlightSegment {
  origin: string;
  destination: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  airline: string;
  flightNumber: string;
  aircraft?: string;
}

export interface PriceBreakdown {
  basePrice: number;
  taxes: number;
  fees: number;
  total: number;
  currency: string;
}

export interface BaggageInfo {
  carryOn: string;
  checked: string;
}

export interface BookingRequest {
  offerId: string;
  passengers: Passenger[];
  tripId?: string;
  contactEmail: string;
  userId: string;
}

export interface Booking {
  id: string;
  pnr: string;
  provider: string;
  providerBookingId: string;
  status: 'pending' | 'confirmed' | 'ticketed' | 'cancelled';
  origin: string;
  destination: string;
  departDate: Date;
  returnDate?: Date;
  airline: string;
  flightNumber: string;
  passengers: Passenger[];
  price: PriceBreakdown;
  confirmationEmail?: string;
  ticketUrls?: string[];
}

export interface BookingStatus {
  bookingId: string;
  pnr: string;
  status: 'pending' | 'confirmed' | 'ticketed' | 'cancelled' | 'completed';
  flightStatus?: 'scheduled' | 'boarding' | 'departed' | 'arrived' | 'delayed' | 'cancelled';
}

export interface CancelResult {
  success: boolean;
  refundAmount?: number;
  refundCurrency?: string;
  message?: string;
}

// Provider Interface
export interface FlightProvider {
  search(criteria: SearchCriteria): Promise<Flight[]>;
  getDetails(flightId: string): Promise<FlightDetails>;
  createBooking(request: BookingRequest): Promise<Booking>;
  getBooking(pnr: string): Promise<BookingStatus>;
  cancelBooking(pnr: string): Promise<CancelResult>;
}
