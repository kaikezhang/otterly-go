import type { Flight, FlightDetails, Booking, SearchCriteria, Passenger } from '../types';

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
