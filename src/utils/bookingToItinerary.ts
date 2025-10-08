import type { Booking, Trip, ItineraryItem, Day } from '../types';

/**
 * Converts a flight booking to an itinerary item (outbound flight)
 * Handles both enriched bookings (with outboundFlight/returnFlight) and legacy format
 */
export function bookingToItineraryItem(booking: Booking, isReturnFlight = false): ItineraryItem {
  // Determine which flight to use
  const flightData = isReturnFlight ? booking.returnFlight : booking.outboundFlight;

  // Use enriched flight data if available, otherwise fall back to legacy fields
  const origin = flightData?.origin || booking.origin;
  const destination = flightData?.destination || booking.destination;
  const airline = flightData?.airline || booking.airline;
  const flightNumber = flightData?.flightNumber || booking.flightNumber;
  const duration = flightData?.duration || '2h';

  // Extract departure time from enriched data or departDate
  let departTime: string;
  if (flightData?.departTime) {
    const departDate = new Date(flightData.departTime);
    const departHour = departDate.getHours();
    const departMinute = departDate.getMinutes();
    departTime = `${departHour.toString().padStart(2, '0')}:${departMinute.toString().padStart(2, '0')}`;
  } else {
    const departDateStr = isReturnFlight ? booking.returnDate : booking.departDate;
    const departDate = new Date(departDateStr || booking.departDate);
    const departHour = departDate.getHours();
    const departMinute = departDate.getMinutes();
    departTime = `${departHour.toString().padStart(2, '0')}:${departMinute.toString().padStart(2, '0')}`;
  }

  // Extract arrival time from enriched data
  let endTime: string | undefined;
  if (flightData?.arriveTime) {
    const arriveDate = new Date(flightData.arriveTime);
    const arriveHour = arriveDate.getHours();
    const arriveMinute = arriveDate.getMinutes();
    endTime = `${arriveHour.toString().padStart(2, '0')}:${arriveMinute.toString().padStart(2, '0')}`;
  }

  // For round-trip, split the cost between outbound and return
  const cost = booking.returnFlight
    ? Math.round(booking.totalPrice / 2)
    : booking.totalPrice;

  return {
    id: crypto.randomUUID(),
    title: `Flight: ${origin} → ${destination}`,
    type: 'transport',
    description: `${airline} ${flightNumber}\n${booking.passengers.length} passenger${booking.passengers.length > 1 ? 's' : ''}\nBooking Reference: ${booking.pnr}${isReturnFlight ? ' (Return)' : ''}`,
    startTime: departTime,
    endTime,
    duration,
    cost,
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
  // Use enriched flight data if available, otherwise fall back to legacy fields
  const origin = booking.outboundFlight?.origin || booking.origin;
  const destination = booking.outboundFlight?.destination || booking.destination;

  // Use departure time from enriched data if available
  let departDate: Date;
  if (booking.outboundFlight?.departTime) {
    departDate = new Date(booking.outboundFlight.departTime);
  } else {
    departDate = new Date(booking.departDate);
  }

  return {
    date: departDate.toISOString(),
    location: `${origin} to ${destination}`,
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
 * - For round-trip bookings, adds both outbound and return flights to their respective days
 *
 * Returns the updated trip and the day index where the outbound flight was added
 */
export function addBookingToTrip(
  trip: Trip,
  booking: Booking
): { updatedTrip: Trip; dayIndex: number } {
  // Clone the trip to avoid mutation
  let updatedTrip = { ...trip, days: [...trip.days] };

  // Helper function to add a flight item to a specific date
  const addFlightToDate = (
    currentTrip: Trip,
    flightItem: ItineraryItem,
    flightDate: Date
  ): { trip: Trip; dayIndex: number } => {
    const trip = { ...currentTrip, days: [...currentTrip.days] };

    // Try to find existing day matching the flight date
    let dayIndex = findDayIndexForDate(trip, flightDate);

    if (dayIndex !== null) {
      // Add to existing day
      const existingDay = trip.days[dayIndex];
      trip.days[dayIndex] = {
        ...existingDay,
        items: [flightItem, ...existingDay.items], // Add flight at the beginning
      };
    } else {
      // No matching day found - create a new one
      const origin = booking.outboundFlight?.origin || booking.origin;
      const destination = booking.outboundFlight?.destination || booking.destination;

      const newDay: Day = {
        date: flightDate.toISOString(),
        location: `${origin} to ${destination}`,
        items: [flightItem],
      };

      if (trip.days.length === 0) {
        // No days at all - add as first day
        trip.days.push(newDay);
        dayIndex = 0;
      } else if (!trip.startDate || !trip.endDate) {
        // Draft trip with no dates - add to the beginning
        trip.days.unshift(newDay);
        dayIndex = 0;
      } else {
        // Trip has dates - insert in chronological order
        const newDayTime = flightDate.getTime();
        let insertIndex = trip.days.length;

        for (let i = 0; i < trip.days.length; i++) {
          const dayTime = new Date(trip.days[i].date).getTime();
          if (newDayTime < dayTime) {
            insertIndex = i;
            break;
          }
        }

        trip.days.splice(insertIndex, 0, newDay);
        dayIndex = insertIndex;
      }
    }

    return { trip, dayIndex };
  };

  // Add outbound flight
  const departDate = booking.outboundFlight?.departTime
    ? new Date(booking.outboundFlight.departTime)
    : new Date(booking.departDate);
  const outboundItem = bookingToItineraryItem(booking, false);

  const outboundResult = addFlightToDate(updatedTrip, outboundItem, departDate);
  updatedTrip = outboundResult.trip;
  const outboundDayIndex = outboundResult.dayIndex;

  // Add return flight if this is a round-trip booking
  if (booking.returnFlight) {
    const returnDate = booking.returnFlight.departTime
      ? new Date(booking.returnFlight.departTime)
      : booking.returnDate
      ? new Date(booking.returnDate)
      : null;

    if (returnDate) {
      const returnItem = bookingToItineraryItem(booking, true);
      const returnResult = addFlightToDate(updatedTrip, returnItem, returnDate);
      updatedTrip = returnResult.trip;
    }
  }

  // Update trip dates if this booking extends the trip
  if (updatedTrip.startDate && updatedTrip.endDate) {
    const tripStart = new Date(updatedTrip.startDate);
    const tripEnd = new Date(updatedTrip.endDate);
    const flightDate = departDate;

    // For return date, use enriched data if available
    const returnDateStr = booking.returnFlight?.departTime || booking.returnDate;
    const returnDate = returnDateStr ? new Date(returnDateStr) : null;

    if (flightDate < tripStart) {
      updatedTrip.startDate = flightDate.toISOString();
    }

    if (returnDate && returnDate > tripEnd) {
      updatedTrip.endDate = returnDate.toISOString();
    } else if (!returnDate && flightDate > tripEnd) {
      updatedTrip.endDate = flightDate.toISOString();
    }
  } else if (!updatedTrip.startDate || !updatedTrip.endDate) {
    // Set initial dates for draft trip - use enriched data if available
    const departDateStr = booking.outboundFlight?.departTime || booking.departDate;
    const returnDateStr = booking.returnFlight?.departTime || booking.returnDate;
    updatedTrip.startDate = departDateStr;
    updatedTrip.endDate = returnDateStr || departDateStr;
  }

  return { updatedTrip, dayIndex: outboundDayIndex };
}
