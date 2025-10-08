# Flight Booking UI Implementation Plan

This document provides a comprehensive guide for implementing the frontend UI components for the flight booking integration.

## ✅ What's Already Implemented

The following backend components are complete and tested:

- **Database Schema**: 4 new Prisma models (FlightSearch, FlightBooking, PriceAlert, PassengerProfile)
- **API Endpoints**: 5 RESTful endpoints for search, details, create, get, and cancel
- **Flight Provider**: Duffel API integration with mock data fallback
- **Caching System**: Database-backed caching with 15-minute TTL
- **Type Definitions**: Complete TypeScript types in `src/types/index.ts` and `server/services/flightApi/types.ts`
- **Agent Router**: Basic routing logic in `src/services/agentRouter.ts`

**API Endpoints Available:**
```
POST   /api/booking/search       - Search for flights
GET    /api/booking/flights/:id  - Get flight details
POST   /api/booking/create       - Create a booking
GET    /api/booking/:pnr         - Get booking status
DELETE /api/booking/:pnr         - Cancel booking
```

---

## 🎯 What Needs to Be Built

### 1. Frontend API Client
### 2. UI Components
### 3. Chat Integration
### 4. Agent Routing System
### 5. State Management

---

## Phase 1: Frontend API Client

**File**: `src/services/bookingApi.ts`

Create API client functions to call the booking endpoints.

```typescript
import { Flight, FlightDetails, Booking, SearchCriteria, Passenger } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const bookingApi = {
  /**
   * Search for flights
   */
  async searchFlights(criteria: SearchCriteria): Promise<{ flights: Flight[]; count: number }> {
    const response = await fetch(`${API_BASE}/api/booking/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(criteria),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Flight search failed');
    }

    return response.json();
  },

  /**
   * Get flight details
   */
  async getFlightDetails(flightId: string): Promise<FlightDetails> {
    const response = await fetch(`${API_BASE}/api/booking/flights/${flightId}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch flight details');
    }

    const data = await response.json();
    return data.flight;
  },

  /**
   * Create a booking
   */
  async createBooking(params: {
    offerId: string;
    flightId: string;
    tripId?: string;
    passengers: Passenger[];
    contactEmail: string;
    totalPrice: number;
  }): Promise<Booking> {
    const response = await fetch(`${API_BASE}/api/booking/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking creation failed');
    }

    const data = await response.json();
    return data.booking;
  },

  /**
   * Get booking status
   */
  async getBooking(pnr: string): Promise<Booking> {
    const response = await fetch(`${API_BASE}/api/booking/${pnr}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Booking not found');
    }

    const data = await response.json();
    return data.booking;
  },

  /**
   * Cancel booking
   */
  async cancelBooking(pnr: string): Promise<{ success: boolean; refund?: { amount: number; currency: string } }> {
    const response = await fetch(`${API_BASE}/api/booking/${pnr}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Cancellation failed');
    }

    return response.json();
  },
};
```

---

## Phase 2: UI Components

### Component 1: Flight Search Form

**File**: `src/components/FlightSearchForm.tsx`

A form component for entering flight search criteria.

```typescript
import React, { useState } from 'react';
import { SearchCriteria } from '../types';

interface FlightSearchFormProps {
  onSearch: (criteria: SearchCriteria) => void;
  isLoading: boolean;
}

export function FlightSearchForm({ onSearch, isLoading }: FlightSearchFormProps) {
  const [formData, setFormData] = useState<SearchCriteria>({
    origin: '',
    destination: '',
    departDate: '',
    returnDate: '',
    passengers: 1,
    class: 'economy',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold">Search Flights</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">From (IATA code)</label>
          <input
            type="text"
            maxLength={3}
            placeholder="e.g. JFK"
            value={formData.origin}
            onChange={(e) => setFormData({ ...formData, origin: e.target.value.toUpperCase() })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">To (IATA code)</label>
          <input
            type="text"
            maxLength={3}
            placeholder="e.g. LAX"
            value={formData.destination}
            onChange={(e) => setFormData({ ...formData, destination: e.target.value.toUpperCase() })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Depart Date</label>
          <input
            type="date"
            value={formData.departDate}
            onChange={(e) => setFormData({ ...formData, departDate: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Return Date (Optional)</label>
          <input
            type="date"
            value={formData.returnDate}
            onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Passengers</label>
          <input
            type="number"
            min={1}
            max={9}
            value={formData.passengers}
            onChange={(e) => setFormData({ ...formData, passengers: parseInt(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Class</label>
          <select
            value={formData.class}
            onChange={(e) => setFormData({ ...formData, class: e.target.value as any })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="economy">Economy</option>
            <option value="business">Business</option>
            <option value="first">First Class</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isLoading ? 'Searching...' : 'Search Flights'}
      </button>
    </form>
  );
}
```

### Component 2: Flight Results Card

**File**: `src/components/FlightCard.tsx`

Displays a single flight option with price, duration, and airline info.

```typescript
import React from 'react';
import { Flight } from '../types';

interface FlightCardProps {
  flight: Flight;
  onSelect: (flight: Flight) => void;
  onViewDetails: (flight: Flight) => void;
}

export function FlightCard({ flight, onSelect, onViewDetails }: FlightCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
      {flight.badge && (
        <div className="inline-block px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded mb-2">
          {flight.badge}
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-2xl font-bold">{flight.departTime}</div>
          <div className="text-gray-600">{flight.origin}</div>
        </div>

        <div className="text-center flex-1 px-4">
          <div className="text-sm text-gray-500">{flight.duration}</div>
          <div className="border-t border-gray-300 my-2"></div>
          <div className="text-xs text-gray-500">
            {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold">{flight.arriveTime}</div>
          <div className="text-gray-600">{flight.destination}</div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm font-medium">{flight.airline}</div>
          <div className="text-xs text-gray-500">{flight.flightNumber}</div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold">
            ${flight.price}
            <span className="text-sm font-normal text-gray-500"> {flight.currency}</span>
          </div>
          <div className="space-x-2 mt-2">
            <button
              onClick={() => onViewDetails(flight)}
              className="text-sm text-blue-600 hover:underline"
            >
              View Details
            </button>
            <button
              onClick={() => onSelect(flight)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Component 3: Flight Details Modal

**File**: `src/components/FlightDetailsModal.tsx`

Shows detailed flight information including segments, baggage, amenities.

```typescript
import React from 'react';
import { FlightDetails } from '../types';

interface FlightDetailsModalProps {
  details: FlightDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onBook?: () => void;
}

export function FlightDetailsModal({ details, isOpen, onClose, onBook }: FlightDetailsModalProps) {
  if (!isOpen || !details) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Flight Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Flight Segments */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Flight Itinerary</h3>
            {details.segments.map((segment, idx) => (
              <div key={idx} className="border rounded-lg p-4 mb-2">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="text-xl font-bold">{segment.departTime}</div>
                    <div className="text-gray-600">{segment.origin}</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-sm text-gray-500">{segment.duration}</div>
                    <div className="border-t my-1"></div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{segment.arriveTime}</div>
                    <div className="text-gray-600">{segment.destination}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {segment.airline} • {segment.flightNumber}
                  {segment.aircraft && ` • ${segment.aircraft}`}
                </div>
              </div>
            ))}
          </div>

          {/* Price Breakdown */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Price Breakdown</h3>
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Fare</span>
                <span className="font-medium">${details.price.basePrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taxes</span>
                <span className="font-medium">${details.price.taxes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fees</span>
                <span className="font-medium">${details.price.fees}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${details.price.total} {details.price.currency}</span>
              </div>
            </div>
          </div>

          {/* Baggage */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Baggage Allowance</h3>
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start">
                <span className="mr-2">✈️</span>
                <div>
                  <div className="font-medium">Carry-on</div>
                  <div className="text-sm text-gray-600">{details.baggage.carryOn}</div>
                </div>
              </div>
              <div className="flex items-start">
                <span className="mr-2">🧳</span>
                <div>
                  <div className="font-medium">Checked Bags</div>
                  <div className="text-sm text-gray-600">{details.baggage.checked}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Amenities */}
          {details.amenities && details.amenities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {details.amenities.map((amenity, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            Close
          </button>
          {onBook && (
            <button
              onClick={onBook}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Book This Flight
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Component 4: Booking Form

**File**: `src/components/BookingForm.tsx`

Form for collecting passenger information to complete a booking.

```typescript
import React, { useState } from 'react';
import { Flight, Passenger } from '../types';

interface BookingFormProps {
  flight: Flight;
  onSubmit: (passengers: Passenger[], contactEmail: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function BookingForm({ flight, onSubmit, onCancel, isLoading }: BookingFormProps) {
  const [contactEmail, setContactEmail] = useState('');
  const [passengers, setPassengers] = useState<Passenger[]>([
    {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      passportNumber: '',
      passportExpiry: '',
      passportCountry: '',
    },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(passengers, contactEmail);
  };

  const updatePassenger = (index: number, field: keyof Passenger, value: string) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Passenger Information</h2>

      {/* Flight Summary */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="text-sm text-gray-600 mb-1">Selected Flight</div>
        <div className="font-semibold">
          {flight.origin} → {flight.destination}
        </div>
        <div className="text-sm text-gray-600">
          {flight.airline} {flight.flightNumber} • {flight.departTime}
        </div>
        <div className="text-lg font-bold mt-2">${flight.price} {flight.currency}</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Email *
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>

        {/* Passenger Details */}
        {passengers.map((passenger, idx) => (
          <div key={idx} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Passenger {idx + 1}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input
                  type="text"
                  value={passenger.firstName}
                  onChange={(e) => updatePassenger(idx, 'firstName', e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input
                  type="text"
                  value={passenger.lastName}
                  onChange={(e) => updatePassenger(idx, 'lastName', e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth *</label>
                <input
                  type="date"
                  value={passenger.dateOfBirth}
                  onChange={(e) => updatePassenger(idx, 'dateOfBirth', e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Passport Number</label>
                <input
                  type="text"
                  value={passenger.passportNumber}
                  onChange={(e) => updatePassenger(idx, 'passportNumber', e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Passport Expiry</label>
                <input
                  type="date"
                  value={passenger.passportExpiry}
                  onChange={(e) => updatePassenger(idx, 'passportExpiry', e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Passport Country</label>
                <input
                  type="text"
                  value={passenger.passportCountry}
                  onChange={(e) => updatePassenger(idx, 'passportCountry', e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                  placeholder="e.g. US"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Component 5: Booking Confirmation

**File**: `src/components/BookingConfirmation.tsx`

Shows booking confirmation with PNR and details.

```typescript
import React from 'react';
import { Booking } from '../types';

interface BookingConfirmationProps {
  booking: Booking;
  onClose: () => void;
  onAddToTrip?: () => void;
}

export function BookingConfirmation({ booking, onClose, onAddToTrip }: BookingConfirmationProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-3xl font-bold text-green-600 mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600">Your flight has been successfully booked</p>
      </div>

      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <div className="text-center mb-4">
          <div className="text-sm text-gray-600">Booking Reference (PNR)</div>
          <div className="text-3xl font-bold text-blue-600">{booking.pnr}</div>
        </div>

        <div className="border-t border-blue-200 pt-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Flight</span>
            <span className="font-medium">{booking.airline} {booking.flightNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Route</span>
            <span className="font-medium">{booking.origin} → {booking.destination}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Departure</span>
            <span className="font-medium">{new Date(booking.departDate).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Passengers</span>
            <span className="font-medium">{booking.passengers.length}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-blue-200">
            <span>Total Paid</span>
            <span>${booking.price.total} {booking.price.currency}</span>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <span className="mr-2 text-yellow-600">📧</span>
          <div className="text-sm">
            <div className="font-medium">Confirmation Email Sent</div>
            <div className="text-gray-600">
              A confirmation email has been sent to {booking.confirmationEmail}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center space-x-3">
        {onAddToTrip && (
          <button
            onClick={onAddToTrip}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add to Trip Itinerary
          </button>
        )}
        <button
          onClick={onClose}
          className="px-6 py-2 border rounded-md hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}
```

---

## Phase 3: Chat Integration

### Update `src/pages/Home.tsx`

Add flight booking state and integrate with chat.

```typescript
// Add to existing Home.tsx

const [flightSearchResults, setFlightSearchResults] = useState<Flight[]>([]);
const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
const [bookingMode, setBookingMode] = useState(false);
const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);

// Flight search handler
const handleFlightSearch = async (criteria: SearchCriteria) => {
  try {
    const { flights } = await bookingApi.searchFlights(criteria);
    setFlightSearchResults(flights);
    setBookingMode(true);

    // Add flight results to chat as a message
    addMessage({
      role: 'assistant',
      content: `Found ${flights.length} flights from ${criteria.origin} to ${criteria.destination}. Select a flight to book.`,
      flightResults: flights, // Custom field for rendering flight cards
    });
  } catch (error) {
    console.error('Flight search failed:', error);
    addMessage({
      role: 'assistant',
      content: 'Sorry, I couldn\'t find any flights. Please try different search criteria.',
    });
  }
};

// Book flight handler
const handleBookFlight = async (flight: Flight, passengers: Passenger[], contactEmail: string) => {
  try {
    const booking = await bookingApi.createBooking({
      offerId: flight.offerId!,
      flightId: flight.id,
      tripId: trip?.id,
      passengers,
      contactEmail,
      totalPrice: flight.price,
    });

    setCurrentBooking(booking);

    // Add booking confirmation to chat
    addMessage({
      role: 'assistant',
      content: `Great! Your flight has been booked. Your confirmation number is ${booking.pnr}.`,
      booking, // Custom field for rendering booking confirmation
    });
  } catch (error) {
    console.error('Booking failed:', error);
    addMessage({
      role: 'assistant',
      content: 'Sorry, the booking failed. Please try again.',
    });
  }
};
```

### Update Chat Message Rendering

Extend the chat message component to render flight cards and bookings.

```typescript
// In Chat.tsx message rendering

{message.flightResults && (
  <div className="space-y-3 mt-3">
    {message.flightResults.map((flight) => (
      <FlightCard
        key={flight.id}
        flight={flight}
        onSelect={(f) => {
          setSelectedFlight(f);
          setShowBookingForm(true);
        }}
        onViewDetails={async (f) => {
          const details = await bookingApi.getFlightDetails(f.id);
          setFlightDetails(details);
          setShowDetailsModal(true);
        }}
      />
    ))}
  </div>
)}

{message.booking && (
  <BookingConfirmation
    booking={message.booking}
    onClose={() => {/* handle close */}}
    onAddToTrip={trip ? () => {/* Add flight to itinerary */} : undefined}
  />
)}
```

---

## Phase 4: Agent Routing

### Update Agent Router

Enhance `src/services/agentRouter.ts` to detect flight booking intents.

```typescript
export function detectBookingIntent(message: string): boolean {
  const bookingKeywords = [
    'book flight', 'find flight', 'search flight',
    'fly to', 'flight to', 'book ticket',
    'plane ticket', 'airline', 'flights',
    'book a flight', 'i want to fly', 'i need a flight',
  ];

  const lowerMessage = message.toLowerCase();
  return bookingKeywords.some((keyword) => lowerMessage.includes(keyword));
}

export function extractFlightCriteria(message: string): Partial<SearchCriteria> | null {
  // Simple extraction logic - can be enhanced with NLP
  const criteria: Partial<SearchCriteria> = {};

  // Extract cities/airports (simplified - use a proper parser in production)
  const fromMatch = message.match(/from\s+([A-Z]{3})/i);
  const toMatch = message.match(/to\s+([A-Z]{3})/i);

  if (fromMatch) criteria.origin = fromMatch[1].toUpperCase();
  if (toMatch) criteria.destination = toMatch[1].toUpperCase();

  // Extract dates (simplified)
  const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) criteria.departDate = dateMatch[1];

  return Object.keys(criteria).length > 0 ? criteria : null;
}
```

### Integrate Agent Routing in Chat

```typescript
// In conversationEngine.ts or Home.tsx

const handleUserMessage = async (userMessage: string) => {
  // Check if user wants to book flights
  if (detectBookingIntent(userMessage)) {
    const criteria = extractFlightCriteria(userMessage);

    if (criteria && criteria.origin && criteria.destination) {
      // Auto-search with extracted criteria
      await handleFlightSearch({
        origin: criteria.origin,
        destination: criteria.destination,
        departDate: criteria.departDate || '',
        passengers: 1,
        class: 'economy',
      });
    } else {
      // Show flight search form
      addMessage({
        role: 'assistant',
        content: 'I can help you book a flight! Please provide your travel details.',
        showFlightSearchForm: true, // Custom flag to render form
      });
    }
    return;
  }

  // Continue with normal trip planning flow
  // ...
};
```

---

## Phase 5: State Management

### Option 1: Extend Zustand Store

Add booking state to the existing `useStore.ts`:

```typescript
interface BookingState {
  flightSearchResults: Flight[];
  selectedFlight: Flight | null;
  currentBooking: Booking | null;
  bookingMode: boolean;
}

interface BookingActions {
  setFlightSearchResults: (flights: Flight[]) => void;
  setSelectedFlight: (flight: Flight | null) => void;
  setCurrentBooking: (booking: Booking | null) => void;
  toggleBookingMode: () => void;
  clearBookingState: () => void;
}

// Add to store
export const useStore = create<StoreState & BookingState & BookingActions>()(
  persist(
    (set) => ({
      // ... existing state ...

      flightSearchResults: [],
      selectedFlight: null,
      currentBooking: null,
      bookingMode: false,

      setFlightSearchResults: (flights) => set({ flightSearchResults: flights }),
      setSelectedFlight: (flight) => set({ selectedFlight: flight }),
      setCurrentBooking: (booking) => set({ currentBooking: booking }),
      toggleBookingMode: () => set((state) => ({ bookingMode: !state.bookingMode })),
      clearBookingState: () => set({
        flightSearchResults: [],
        selectedFlight: null,
        currentBooking: null,
        bookingMode: false,
      }),
    }),
    { name: 'otterly-go-storage' }
  )
);
```

---

## Implementation Steps

### Step 1: Create API Client ✅
- Create `src/services/bookingApi.ts`
- Test all 5 API endpoints
- Add error handling

### Step 2: Build Individual Components ✅
1. `FlightSearchForm.tsx`
2. `FlightCard.tsx`
3. `FlightDetailsModal.tsx`
4. `BookingForm.tsx`
5. `BookingConfirmation.tsx`

### Step 3: Integrate with Chat ✅
- Update `Home.tsx` with booking handlers
- Extend chat message types
- Add flight card rendering in `Chat.tsx`
- Add booking confirmation rendering

### Step 4: Enhance Agent Router ✅
- Improve intent detection in `agentRouter.ts`
- Add NLP-based extraction (or use simple regex)
- Integrate routing in conversation engine

### Step 5: Update Types ✅
- Ensure `src/types/index.ts` has all necessary types
- Add custom message fields (flightResults, booking, etc.)
- Update ChatMessage interface

### Step 6: State Management ✅
- Extend Zustand store with booking state
- Add actions for managing flight searches and bookings
- Test persistence

### Step 7: Testing ✅
- Test flight search flow end-to-end
- Test booking creation
- Test booking confirmation display
- Test adding booking to trip itinerary
- Test error scenarios

---

## Advanced Features (Future Enhancements)

### 1. Price Alerts
- UI for setting price alert preferences
- Notification system when prices drop

### 2. Passenger Profiles
- Save passenger information for quick rebooking
- Manage multiple travelers

### 3. Booking Management Dashboard
- View all bookings
- Cancel/modify bookings
- Download tickets

### 4. Multi-city Flights
- Support for complex itineraries
- Layover management

### 5. Real Duffel Integration
- Replace mock data with real API calls
- Handle payment processing
- Integrate webhooks for booking updates

---

## Testing Checklist

- [ ] Flight search returns results
- [ ] Flight details modal displays correctly
- [ ] Booking form validates input
- [ ] Booking creation succeeds
- [ ] Booking confirmation shows PNR
- [ ] Flight can be added to trip itinerary
- [ ] Error handling works for all scenarios
- [ ] Mobile responsive design
- [ ] Accessibility (keyboard navigation, screen readers)
- [ ] Performance (loading states, optimistic updates)

---

## API Integration Notes

**All endpoints require authentication via JWT cookie.**

Make sure to:
- Use `credentials: 'include'` in all fetch requests
- Handle 401 Unauthorized errors (redirect to login)
- Handle 400 Bad Request errors (validation issues)
- Handle 500 Server errors (show user-friendly message)

**Mock Data Mode:**
- The backend uses mock flight data when `DUFFEL_API_KEY` is not configured
- This allows full UI testing without needing a Duffel account
- Mock data returns 3 flights per search with randomized prices

---

## File Structure Summary

```
src/
├── components/
│   ├── FlightSearchForm.tsx       (NEW)
│   ├── FlightCard.tsx              (NEW)
│   ├── FlightDetailsModal.tsx     (NEW)
│   ├── BookingForm.tsx             (NEW)
│   └── BookingConfirmation.tsx     (NEW)
├── services/
│   ├── bookingApi.ts               (NEW)
│   └── agentRouter.ts              (UPDATE)
├── pages/
│   └── Home.tsx                    (UPDATE)
├── store/
│   └── useStore.ts                 (UPDATE)
└── types/
    └── index.ts                    (UPDATE)
```

---

## Next Steps After UI Implementation

1. **Merge PR #43** with backend code
2. **Implement UI components** following this plan
3. **Test end-to-end flow** with mock data
4. **Configure Duffel API** for real flight data (optional)
5. **Add Stripe payment integration** for actual bookings
6. **Implement booking email notifications**
7. **Add booking management dashboard**
8. **Create price alert system**

---

## Questions?

Refer to:
- `FLIGHT_BOOKING_TEST.md` for API testing
- `FLIGHT_BOOKING_PLAN.md` for full implementation details
- `server/routes/booking.ts` for API endpoint source
- `server/services/flightApi/` for provider implementation

