/**
 * Auto-Insert Service (Milestone 5.1)
 * Automatically insert parsed bookings into trips with conflict detection
 */

import { prisma } from '../db.js';
import type { ParsedBooking } from '@prisma/client';

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingItems?: Array<{
    itemId: string;
    title: string;
    startTime: Date | null;
    endTime: Date | null;
  }>;
}

/**
 * Detect if a booking conflicts with existing itinerary items in a trip
 */
export async function detectConflicts(
  tripId: string,
  startDateTime: Date | null,
  endDateTime: Date | null
): Promise<ConflictInfo> {
  if (!startDateTime) {
    return { hasConflict: false };
  }

  // Fetch trip data
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { dataJson: true },
  });

  if (!trip) {
    return { hasConflict: false };
  }

  const tripData = trip.dataJson as any;
  const conflictingItems: ConflictInfo['conflictingItems'] = [];

  // Check each day's items for conflicts
  if (tripData.days && Array.isArray(tripData.days)) {
    for (const day of tripData.days) {
      if (day.items && Array.isArray(day.items)) {
        for (const item of day.items) {
          const itemStart = item.startTime ? new Date(item.startTime) : null;
          const itemEnd = item.endTime ? new Date(item.endTime) : null;

          // Check for time overlap
          if (itemStart && startDateTime) {
            const bookingEnd = endDateTime || new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour

            const overlap =
              (startDateTime >= itemStart && startDateTime < (itemEnd || itemStart)) ||
              (bookingEnd > itemStart && bookingEnd <= (itemEnd || itemStart)) ||
              (startDateTime <= itemStart && bookingEnd >= (itemEnd || itemStart));

            if (overlap) {
              conflictingItems.push({
                itemId: item.id,
                title: item.title,
                startTime: itemStart,
                endTime: itemEnd,
              });
            }
          }
        }
      }
    }
  }

  return {
    hasConflict: conflictingItems.length > 0,
    conflictingItems: conflictingItems.length > 0 ? conflictingItems : undefined,
  };
}

/**
 * Find the best trip to insert a booking into
 * Based on date overlap with trip start/end dates
 */
export async function findBestTrip(
  userId: string,
  startDateTime: Date | null
): Promise<string | null> {
  if (!startDateTime) {
    return null;
  }

  // Get all user trips
  const trips = await prisma.trip.findMany({
    where: {
      userId,
      status: { in: ['draft', 'planning', 'upcoming', 'active'] }, // Exclude completed/archived
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
    },
    orderBy: { startDate: 'asc' },
  });

  // Find trip where booking date falls within trip dates
  for (const trip of trips) {
    if (trip.startDate && trip.endDate) {
      if (startDateTime >= trip.startDate && startDateTime <= trip.endDate) {
        return trip.id;
      }
    }
  }

  // If no exact match, find closest upcoming trip
  const upcomingTrips = trips.filter((t) => t.startDate && t.startDate > startDateTime);
  if (upcomingTrips.length > 0) {
    return upcomingTrips[0].id;
  }

  // Fall back to most recent trip
  if (trips.length > 0) {
    return trips[trips.length - 1].id;
  }

  return null;
}

/**
 * Convert booking type to itinerary item type
 */
function getItemType(bookingType: string): string {
  const typeMap: Record<string, string> = {
    flight: 'flight',
    hotel: 'accommodation',
    car_rental: 'transportation',
    restaurant: 'dining',
    activity: 'activity',
  };

  return typeMap[bookingType] || 'other';
}

/**
 * Insert a parsed booking into a trip
 */
export async function insertBookingIntoTrip(
  bookingId: string,
  tripId: string
): Promise<{ success: boolean; conflictDetected: boolean; error?: string }> {
  try {
    // Fetch booking
    const booking = await prisma.parsedBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return { success: false, conflictDetected: false, error: 'Booking not found' };
    }

    // Detect conflicts
    const conflictInfo = await detectConflicts(tripId, booking.startDateTime, booking.endDateTime);

    // Fetch trip
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { dataJson: true },
    });

    if (!trip) {
      return { success: false, conflictDetected: false, error: 'Trip not found' };
    }

    const tripData = trip.dataJson as any;

    // Create itinerary item from booking
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: booking.title,
      type: getItemType(booking.bookingType),
      description: booking.description || '',
      location: booking.location || '',
      startTime: booking.startDateTime?.toISOString() || null,
      endTime: booking.endDateTime?.toISOString() || null,
      duration: null,
      cost: null,
      notes: booking.confirmationNumber
        ? `Confirmation #: ${booking.confirmationNumber}`
        : null,
      metadata: {
        source: 'email_import',
        bookingId: booking.id,
        confidence: booking.confidence,
        parsedData: booking.parsedDataJson,
      },
    };

    // Find the right day to insert into
    if (!tripData.days || !Array.isArray(tripData.days)) {
      tripData.days = [];
    }

    let inserted = false;

    if (booking.startDateTime) {
      // Find day that matches the booking date
      for (const day of tripData.days) {
        const dayDate = day.date ? new Date(day.date) : null;

        if (dayDate) {
          const bookingDate = new Date(booking.startDateTime);
          bookingDate.setHours(0, 0, 0, 0);
          dayDate.setHours(0, 0, 0, 0);

          if (bookingDate.getTime() === dayDate.getTime()) {
            // Insert into this day (at the end or sorted by time)
            if (!day.items) day.items = [];

            // Insert sorted by start time
            const insertIndex = day.items.findIndex((item: any) => {
              const itemStart = item.startTime ? new Date(item.startTime) : null;
              return itemStart && itemStart > booking.startDateTime!;
            });

            if (insertIndex === -1) {
              day.items.push(newItem);
            } else {
              day.items.splice(insertIndex, 0, newItem);
            }

            inserted = true;
            break;
          }
        }
      }
    }

    // If no matching day found, add to first day or create new day
    if (!inserted) {
      if (tripData.days.length === 0) {
        tripData.days.push({
          date: booking.startDateTime?.toISOString() || new Date().toISOString(),
          items: [newItem],
        });
      } else {
        // Add to first day
        if (!tripData.days[0].items) tripData.days[0].items = [];
        tripData.days[0].items.push(newItem);
      }
    }

    // Update trip in database
    await prisma.trip.update({
      where: { id: tripId },
      data: { dataJson: tripData },
    });

    // Update booking status
    await prisma.parsedBooking.update({
      where: { id: bookingId },
      data: {
        status: 'added_to_trip',
        tripId,
        conflictDetected: conflictInfo.hasConflict,
      },
    });

    return {
      success: true,
      conflictDetected: conflictInfo.hasConflict,
    };
  } catch (error) {
    console.error('Insert booking error:', error);
    return {
      success: false,
      conflictDetected: false,
      error: 'Failed to insert booking',
    };
  }
}

/**
 * Auto-insert a booking into the best matching trip
 */
export async function autoInsertBooking(
  bookingId: string
): Promise<{ success: boolean; tripId?: string; conflictDetected: boolean; error?: string }> {
  try {
    const booking = await prisma.parsedBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return { success: false, conflictDetected: false, error: 'Booking not found' };
    }

    // Find best trip
    const tripId = await findBestTrip(booking.userId, booking.startDateTime);

    if (!tripId) {
      return {
        success: false,
        conflictDetected: false,
        error: 'No suitable trip found',
      };
    }

    // Insert into trip
    const result = await insertBookingIntoTrip(bookingId, tripId);

    return {
      ...result,
      tripId,
    };
  } catch (error) {
    console.error('Auto-insert error:', error);
    return {
      success: false,
      conflictDetected: false,
      error: 'Failed to auto-insert booking',
    };
  }
}
