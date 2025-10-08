import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { FlightAggregator } from '../services/flightApi/aggregator';

const router = express.Router();
const flightService = new FlightAggregator();

// Validation schemas
const searchSchema = z.object({
  origin: z.string().length(3), // IATA code
  destination: z.string().length(3),
  departDate: z.string(), // ISO date
  returnDate: z.string().optional(),
  passengers: z.number().int().min(1).max(9).default(1),
  class: z.enum(['economy', 'business', 'first']).default('economy'),
});

const bookingSchema = z.object({
  offerId: z.string(),
  flightId: z.string(),
  tripId: z.string().optional(),
  passengers: z.array(
    z.object({
      firstName: z.string(),
      lastName: z.string(),
      dateOfBirth: z.string(), // ISO date
      passportNumber: z.string().optional(),
      passportExpiry: z.string().optional(),
      passportCountry: z.string().optional(),
    })
  ),
  contactEmail: z.string().email(),
  totalPrice: z.number(),
});

// POST /api/booking/search - Search for flights
router.post('/search', authenticateToken, async (req, res) => {
  try {
    const validated = searchSchema.parse(req.body);

    const criteria = {
      origin: validated.origin,
      destination: validated.destination,
      departDate: new Date(validated.departDate),
      returnDate: validated.returnDate ? new Date(validated.returnDate) : undefined,
      passengers: validated.passengers,
      class: validated.class,
    };

    const flights = await flightService.search(criteria);

    res.json({
      success: true,
      flights,
      count: flights.length,
    });
  } catch (error) {
    console.error('Flight search error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to search flights',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/booking/flights/:id - Get flight details
router.get('/flights/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const details = await flightService.getDetails(id);

    res.json({
      success: true,
      flight: details,
    });
  } catch (error) {
    console.error('Flight details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch flight details',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/booking/create - Create a flight booking
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const validated = bookingSchema.parse(req.body);
    const user = (req as any).user;

    const bookingRequest = {
      offerId: validated.offerId,
      passengers: validated.passengers.map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: new Date(p.dateOfBirth),
        passportNumber: p.passportNumber,
        passportExpiry: p.passportExpiry ? new Date(p.passportExpiry) : undefined,
        passportCountry: p.passportCountry,
      })),
      tripId: validated.tripId,
      contactEmail: validated.contactEmail,
    };

    const booking = await flightService.createBooking(bookingRequest);

    // TODO: Send confirmation email
    // TODO: Add to trip itinerary if tripId provided

    res.json({
      success: true,
      booking: {
        ...booking,
        departDate: booking.departDate.toISOString(),
        returnDate: booking.returnDate?.toISOString(),
      },
      message: 'Booking created successfully',
    });
  } catch (error) {
    console.error('Booking creation error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create booking',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/booking/:pnr - Get booking status by PNR
router.get('/:pnr', authenticateToken, async (req, res) => {
  try {
    const { pnr } = req.params;
    const status = await flightService.getBooking(pnr);

    res.json({
      success: true,
      booking: status,
    });
  } catch (error) {
    console.error('Booking status error:', error);
    res.status(404).json({
      success: false,
      error: 'Booking not found',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/booking/:pnr - Cancel a booking
router.delete('/:pnr', authenticateToken, async (req, res) => {
  try {
    const { pnr } = req.params;
    const result = await flightService.cancelBooking(pnr);

    if (result.success) {
      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        refund: result.refundAmount
          ? {
              amount: result.refundAmount,
              currency: result.refundCurrency,
            }
          : null,
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to cancel booking',
        message: result.message,
      });
    }
  } catch (error) {
    console.error('Booking cancellation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel booking',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
