import { Duffel } from '@duffel/api';
import {
  FlightProvider,
  SearchCriteria,
  Flight,
  FlightDetails,
  BookingRequest,
  Booking,
  BookingStatus,
  CancelResult,
} from './types';

export class DuffelProvider implements FlightProvider {
  private client: Duffel | null = null;
  private useMockData: boolean;

  constructor() {
    const apiKey = process.env.DUFFEL_API_KEY;

    if (apiKey && apiKey !== 'your-duffel-api-key') {
      this.client = new Duffel({
        token: apiKey,
      });
      this.useMockData = false;
    } else {
      console.warn('Duffel API key not configured - using mock data');
      this.useMockData = true;
    }
  }

  async search(criteria: SearchCriteria): Promise<Flight[]> {
    if (this.useMockData) {
      return this.getMockFlights(criteria);
    }

    try {
      // Real Duffel API implementation
      const response = await this.client!.offerRequests.create({
        slices: [
          {
            origin: criteria.origin,
            destination: criteria.destination,
            departure_date: criteria.departDate.toISOString().split('T')[0],
          },
          ...(criteria.returnDate
            ? [
                {
                  origin: criteria.destination,
                  destination: criteria.origin,
                  departure_date: criteria.returnDate.toISOString().split('T')[0],
                },
              ]
            : []),
        ],
        passengers: Array(criteria.passengers).fill({ type: 'adult' }),
        cabin_class: criteria.class,
      });

      return this.mapDuffelOffers(response.data.offers);
    } catch (error) {
      console.error('Duffel API error:', error);
      // Fallback to mock data on error
      return this.getMockFlights(criteria);
    }
  }

  async getDetails(flightId: string): Promise<FlightDetails> {
    if (this.useMockData) {
      return this.getMockFlightDetails(flightId);
    }

    try {
      const offer = await this.client!.offers.get(flightId);
      return this.mapDuffelOfferDetails(offer.data);
    } catch (error) {
      console.error('Duffel API error:', error);
      return this.getMockFlightDetails(flightId);
    }
  }

  async createBooking(request: BookingRequest): Promise<Booking> {
    if (this.useMockData) {
      return this.getMockBooking(request);
    }

    try {
      const order = await this.client!.orders.create({
        selected_offers: [request.offerId],
        passengers: request.passengers.map((p) => ({
          given_name: p.firstName,
          family_name: p.lastName,
          born_on: p.dateOfBirth.toISOString().split('T')[0],
          ...(p.passportNumber && {
            identity_documents: [
              {
                unique_identifier: p.passportNumber,
                expires_on: p.passportExpiry?.toISOString().split('T')[0],
                issuing_country_code: p.passportCountry,
              },
            ],
          }),
        })),
        payments: [
          {
            type: 'balance',
            amount: (request as any).totalPrice?.toString() || '0',
            currency: 'USD',
          },
        ],
      });

      return this.mapDuffelOrder(order.data);
    } catch (error) {
      console.error('Duffel API error:', error);
      return this.getMockBooking(request);
    }
  }

  async getBooking(pnr: string): Promise<BookingStatus> {
    if (this.useMockData) {
      return {
        bookingId: pnr,
        pnr,
        status: 'confirmed',
        flightStatus: 'scheduled',
      };
    }

    try {
      const order = await this.client!.orders.get(pnr);
      return {
        bookingId: order.data.id,
        pnr: order.data.booking_reference,
        status: this.mapDuffelOrderStatus(order.data.metadata?.status),
        flightStatus: 'scheduled',
      };
    } catch (error) {
      console.error('Duffel API error:', error);
      throw error;
    }
  }

  async cancelBooking(pnr: string): Promise<CancelResult> {
    if (this.useMockData) {
      return {
        success: true,
        message: 'Mock booking cancelled',
      };
    }

    try {
      await this.client!.orderCancellations.create({
        order_id: pnr,
      });
      return { success: true };
    } catch (error) {
      console.error('Duffel API error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Cancellation failed',
      };
    }
  }

  // Helper methods
  private getMockFlights(criteria: SearchCriteria): Flight[] {
    const { origin, destination, departDate } = criteria;
    const basePrice = 400 + Math.random() * 600;

    // Helper to create datetime from date + time
    const createDateTime = (date: Date, hours: number, minutes: number): string => {
      const dt = new Date(date);
      dt.setHours(hours, minutes, 0, 0);
      return dt.toISOString();
    };

    return [
      {
        id: `mock-flight-1-${Date.now()}`,
        origin,
        destination,
        departTime: createDateTime(departDate, 8, 0), // 8:00 AM
        arriveTime: createDateTime(departDate, 17, 30), // 5:30 PM same day
        duration: '9h 30m',
        stops: 0,
        airline: 'United Airlines',
        flightNumber: 'UA 123',
        price: Math.round(basePrice),
        currency: 'USD',
        badge: 'Best Value',
        provider: 'duffel',
        offerId: `mock-offer-1-${Date.now()}`,
      },
      {
        id: `mock-flight-2-${Date.now()}`,
        origin,
        destination,
        departTime: createDateTime(departDate, 11, 0), // 11:00 AM
        arriveTime: createDateTime(departDate, 23, 45), // 11:45 PM same day
        duration: '12h 45m',
        stops: 1,
        airline: 'Delta',
        flightNumber: 'DL 456',
        price: Math.round(basePrice * 0.8),
        currency: 'USD',
        badge: 'Cheapest',
        provider: 'duffel',
        offerId: `mock-offer-2-${Date.now()}`,
      },
      {
        id: `mock-flight-3-${Date.now()}`,
        origin,
        destination,
        departTime: createDateTime(departDate, 14, 0), // 2:00 PM
        arriveTime: createDateTime(departDate, 21, 15), // 9:15 PM same day
        duration: '7h 15m',
        stops: 0,
        airline: 'American Airlines',
        flightNumber: 'AA 789',
        price: Math.round(basePrice * 1.2),
        currency: 'USD',
        badge: 'Fastest',
        provider: 'duffel',
        offerId: `mock-offer-3-${Date.now()}`,
      },
    ];
  }

  private getMockFlightDetails(flightId: string): FlightDetails {
    return {
      id: flightId,
      origin: 'JFK',
      destination: 'NRT',
      segments: [
        {
          origin: 'JFK',
          destination: 'NRT',
          departTime: '08:00 AM',
          arriveTime: '05:30 PM',
          duration: '9h 30m',
          airline: 'United Airlines',
          flightNumber: 'UA 123',
          aircraft: 'Boeing 787',
        },
      ],
      price: {
        basePrice: 745,
        taxes: 86,
        fees: 50,
        total: 881,
        currency: 'USD',
      },
      baggage: {
        carryOn: '1 personal item + 1 carry-on',
        checked: '2 checked bags included',
      },
      amenities: ['WiFi', 'In-flight entertainment', 'Meals included'],
    };
  }

  private getMockBooking(request: BookingRequest): Booking {
    const pnr = `MOCK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    return {
      id: `booking-${Date.now()}`,
      pnr,
      provider: 'duffel',
      providerBookingId: `duffel-${pnr}`,
      status: 'confirmed',
      origin: 'JFK',
      destination: 'NRT',
      departDate: new Date(),
      airline: 'United Airlines',
      flightNumber: 'UA 123',
      passengers: request.passengers,
      price: {
        basePrice: 745,
        taxes: 86,
        fees: 50,
        total: 881,
        currency: 'USD',
      },
      confirmationEmail: request.contactEmail,
    };
  }

  private mapDuffelOffers(offers: any[]): Flight[] {
    return offers.map((offer: any) => {
      const slice = offer.slices[0];
      const segment = slice.segments[0];

      return {
        id: offer.id,
        origin: slice.origin.iata_code,
        destination: slice.destination.iata_code,
        departTime: segment.departing_at, // Keep as ISO string
        arriveTime: segment.arriving_at, // Keep as ISO string
        duration: slice.duration,
        stops: slice.segments.length - 1,
        airline: segment.marketing_carrier.name,
        flightNumber: segment.marketing_carrier_flight_number,
        price: parseFloat(offer.total_amount),
        currency: offer.total_currency,
        provider: 'duffel',
        offerId: offer.id,
      };
    });
  }

  private mapDuffelOfferDetails(offer: any): FlightDetails {
    const slice = offer.slices[0];

    return {
      id: offer.id,
      origin: slice.origin.iata_code,
      destination: slice.destination.iata_code,
      segments: slice.segments.map((seg: any) => ({
        origin: seg.origin.iata_code,
        destination: seg.destination.iata_code,
        departTime: new Date(seg.departing_at).toLocaleTimeString(),
        arriveTime: new Date(seg.arriving_at).toLocaleTimeString(),
        duration: seg.duration,
        airline: seg.marketing_carrier.name,
        flightNumber: seg.marketing_carrier_flight_number,
        aircraft: seg.aircraft?.name,
      })),
      price: {
        basePrice: parseFloat(offer.base_amount),
        taxes: parseFloat(offer.tax_amount),
        fees: 0,
        total: parseFloat(offer.total_amount),
        currency: offer.total_currency,
      },
      baggage: {
        carryOn: '1 carry-on',
        checked: offer.passenger_identity_documents_required ? '1 checked bag' : 'None',
      },
    };
  }

  private mapDuffelOrder(order: any): Booking {
    const slice = order.slices[0];
    const segment = slice.segments[0];

    return {
      id: order.id,
      pnr: order.booking_reference,
      provider: 'duffel',
      providerBookingId: order.id,
      status: order.metadata?.status || 'confirmed',
      origin: slice.origin.iata_code,
      destination: slice.destination.iata_code,
      departDate: new Date(segment.departing_at),
      airline: segment.marketing_carrier.name,
      flightNumber: segment.marketing_carrier_flight_number,
      passengers: order.passengers.map((p: any) => ({
        firstName: p.given_name,
        lastName: p.family_name,
        dateOfBirth: new Date(p.born_on),
      })),
      price: {
        basePrice: parseFloat(order.base_amount),
        taxes: parseFloat(order.tax_amount),
        fees: 0,
        total: parseFloat(order.total_amount),
        currency: order.total_currency,
      },
    };
  }

  private mapDuffelOrderStatus(status: string | undefined): BookingStatus['status'] {
    switch (status) {
      case 'confirmed':
        return 'confirmed';
      case 'cancelled':
        return 'cancelled';
      case 'ticketed':
        return 'ticketed';
      default:
        return 'pending';
    }
  }
}
