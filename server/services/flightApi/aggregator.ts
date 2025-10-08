import { prisma } from '../../db.js';
import { DuffelProvider } from './duffel';
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

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class FlightAggregator implements FlightProvider {
  private provider: FlightProvider;

  constructor() {
    // For MVP, only using Duffel. Can expand to multi-provider later
    this.provider = new DuffelProvider();
  }

  async search(criteria: SearchCriteria): Promise<Flight[]> {
    // Check cache first
    const cached = await this.getCachedSearch(criteria);
    if (cached) {
      console.log('Returning cached flight search results');
      return cached;
    }

    try {
      // Search via provider
      const flights = await this.provider.search(criteria);

      // Cache results (fire and forget)
      this.cacheSearch(criteria, flights).catch((err) =>
        console.error('Failed to cache flight search:', err)
      );

      return flights;
    } catch (error) {
      console.error('Flight search error:', error);
      throw error;
    }
  }

  async getDetails(flightId: string): Promise<FlightDetails> {
    return this.provider.getDetails(flightId);
  }

  async createBooking(request: BookingRequest): Promise<Booking> {
    try {
      const booking = await this.provider.createBooking(request);

      // Save to database
      await this.saveBookingToDatabase(booking, request);

      return booking;
    } catch (error) {
      console.error('Booking creation error:', error);
      throw error;
    }
  }

  async getBooking(pnr: string): Promise<BookingStatus> {
    return this.provider.getBooking(pnr);
  }

  async cancelBooking(pnr: string): Promise<CancelResult> {
    const result = await this.provider.cancelBooking(pnr);

    if (result.success) {
      // Update database status
      await prisma.flightBooking
        .updateMany({
          where: { pnr },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date(),
          },
        })
        .catch((err) => console.error('Failed to update booking status:', err));
    }

    return result;
  }

  // Cache methods
  private async getCachedSearch(criteria: SearchCriteria): Promise<Flight[] | null> {
    try {
      const cached = await prisma.flightSearch.findFirst({
        where: {
          origin: criteria.origin,
          destination: criteria.destination,
          departDate: criteria.departDate,
          returnDate: criteria.returnDate,
          passengers: criteria.passengers,
          class: criteria.class,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (cached) {
        return cached.results as any as Flight[];
      }

      return null;
    } catch (error) {
      console.error('Cache lookup error:', error);
      return null;
    }
  }

  private async cacheSearch(criteria: SearchCriteria, flights: Flight[]): Promise<void> {
    try {
      await prisma.flightSearch.create({
        data: {
          userId: 'system', // Will be replaced with actual user ID in routes
          origin: criteria.origin,
          destination: criteria.destination,
          departDate: criteria.departDate,
          returnDate: criteria.returnDate,
          passengers: criteria.passengers,
          class: criteria.class,
          results: flights as any,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        },
      });
    } catch (error) {
      console.error('Cache save error:', error);
    }
  }

  private async saveBookingToDatabase(
    booking: Booking,
    request: BookingRequest
  ): Promise<void> {
    try {
      await prisma.flightBooking.create({
        data: {
          userId: request.userId,
          tripId: request.tripId,
          pnr: booking.pnr,
          provider: booking.provider,
          providerBookingId: booking.providerBookingId,
          origin: booking.origin,
          destination: booking.destination,
          departDate: booking.departDate,
          returnDate: booking.returnDate,
          airline: booking.airline,
          flightNumber: booking.flightNumber,
          passengers: booking.passengers as any,
          seatAssignments: null,
          basePrice: booking.price.basePrice,
          taxes: booking.price.taxes,
          fees: booking.price.fees,
          totalPrice: booking.price.total,
          currency: booking.price.currency,
          commission: booking.price.total * 0.02, // 2% commission
          status: booking.status.toUpperCase() as any,
          paymentStatus: 'PENDING',
          confirmationEmail: booking.confirmationEmail,
          ticketUrls: booking.ticketUrls as any,
          metadata: {},
        },
      });
    } catch (error) {
      console.error('Database save error:', error);
      throw error;
    }
  }
}
