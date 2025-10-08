import type { Booking, Trip, ItineraryItem, Day } from '../types';

/**
 * Converts a flight booking to an itinerary item
 */
export function bookingToItineraryItem(booking: Booking): ItineraryItem {
  const departDate = new Date(booking.departDate);
  const departHour = departDate.getHours();
  const departMinute = departDate.getMinutes();
  const departTime = `${departHour.toString().padStart(2, '0')}:${departMinute.toString().padStart(2, '0')}`;

  // Calculate approximate flight duration (simplified - in reality would come from flight data)
  const returnDate = booking.returnDate ? new Date(booking.returnDate) : null;
  const durationHours = returnDate
    ? Math.round((returnDate.getTime() - departDate.getTime()) / (1000 * 60 * 60))
    : 2; // Default 2 hours if no return date

  return {
    id: crypto.randomUUID(),
    title: `Flight: ${booking.origin} → ${booking.destination}`,
    type: 'transport',
    description: `${booking.airline} ${booking.flightNumber}\n${booking.passengers.length} passenger${booking.passengers.length > 1 ? 's' : ''}\nBooking Reference: ${booking.pnr}`,
    startTime: departTime,
    duration: `${durationHours}h`,
    notes: `Confirmation email sent to ${booking.confirmationEmail || 'your email'}`,
    cost: booking.totalPrice,
    costCategory: 'flights',
  };
}

/**
 * Finds the day index in the trip that matches the flight departure date
 * Returns null if no matching day is found
 */
export function findDayIndexForDate(trip: Trip, targetDate: Date): number | null {
  const targetDateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

  for (let i = 0; i < trip.days.length; i++) {
    const dayDateStr = trip.days[i].date.split('T')[0]; // YYYY-MM-DD
    if (dayDateStr === targetDateStr) {
      return i;
    }
  }

  return null;
}

/**
 * Creates a new day for the booking if it doesn't exist in the trip
 */
export function createDayForBooking(booking: Booking): Day {
  const departDate = new Date(booking.departDate);

  return {
    date: departDate.toISOString(),
    location: `${booking.origin} to ${booking.destination}`,
    items: [],
  };
}

/**
 * Adds a booking to the trip itinerary
 *
 * Logic:
 * - If the trip has a day matching the flight departure date, add the flight to that day
 * - If no matching day exists:
 *   - If trip has dates, create a new day and insert it in chronological order
 *   - If trip has no dates (draft trip), add to the first day or create a new first day
 *
 * Returns the updated trip and the day index where the booking was added
 */
export function addBookingToTrip(
  trip: Trip,
  booking: Booking
): { updatedTrip: Trip; dayIndex: number } {
  const departDate = new Date(booking.departDate);
  const flightItem = bookingToItineraryItem(booking);

  // Clone the trip to avoid mutation
  const updatedTrip = { ...trip, days: [...trip.days] };

  // Try to find existing day matching the departure date
  let dayIndex = findDayIndexForDate(updatedTrip, departDate);

  if (dayIndex !== null) {
    // Add to existing day
    const existingDay = updatedTrip.days[dayIndex];
    updatedTrip.days[dayIndex] = {
      ...existingDay,
      items: [flightItem, ...existingDay.items], // Add flight at the beginning
    };
  } else {
    // No matching day found - create a new one
    const newDay = createDayForBooking(booking);
    newDay.items.push(flightItem);

    if (updatedTrip.days.length === 0) {
      // No days at all - add as first day
      updatedTrip.days.push(newDay);
      dayIndex = 0;
    } else if (!updatedTrip.startDate || !updatedTrip.endDate) {
      // Draft trip with no dates - add to the beginning
      updatedTrip.days.unshift(newDay);
      dayIndex = 0;
    } else {
      // Trip has dates - insert in chronological order
      const newDayTime = new Date(newDay.date).getTime();
      let insertIndex = updatedTrip.days.length;

      for (let i = 0; i < updatedTrip.days.length; i++) {
        const dayTime = new Date(updatedTrip.days[i].date).getTime();
        if (newDayTime < dayTime) {
          insertIndex = i;
          break;
        }
      }

      updatedTrip.days.splice(insertIndex, 0, newDay);
      dayIndex = insertIndex;
    }
  }

  // Update trip dates if this booking extends the trip
  if (updatedTrip.startDate && updatedTrip.endDate) {
    const tripStart = new Date(updatedTrip.startDate);
    const tripEnd = new Date(updatedTrip.endDate);
    const flightDate = departDate;
    const returnDate = booking.returnDate ? new Date(booking.returnDate) : null;

    if (flightDate < tripStart) {
      updatedTrip.startDate = flightDate.toISOString();
    }

    if (returnDate && returnDate > tripEnd) {
      updatedTrip.endDate = returnDate.toISOString();
    } else if (!returnDate && flightDate > tripEnd) {
      updatedTrip.endDate = flightDate.toISOString();
    }
  } else if (!updatedTrip.startDate || !updatedTrip.endDate) {
    // Set initial dates for draft trip
    updatedTrip.startDate = booking.departDate;
    updatedTrip.endDate = booking.returnDate || booking.departDate;
  }

  return { updatedTrip, dayIndex };
}
