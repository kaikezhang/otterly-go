import type { Trip, TripStatus } from '../types';

/**
 * Calculate trip status based on trip data
 *
 * Status priority (from highest to lowest):
 * 1. Archived - User explicitly archived
 * 2. Active - Currently happening (today within date range)
 * 3. Completed - Trip ended (past end date)
 * 4. Upcoming - Dates set, trip starts in 1-30 days
 * 5. Planning - Itinerary started, no dates set
 * 6. Draft - No itinerary yet, just created
 */
export function calculateTripStatus(trip: Trip): TripStatus {
  // If status is explicitly set to 'archived', respect it
  if (trip.status === 'archived' || trip.archivedAt) {
    return 'archived';
  }

  // Check if trip has dates
  if (trip.startDate && trip.endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for date comparison

    const startDate = new Date(trip.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(trip.endDate);
    endDate.setHours(0, 0, 0, 0);

    // Active: Currently happening (today within date range)
    if (today >= startDate && today <= endDate) {
      return 'active';
    }

    // Completed: Trip ended (past end date)
    if (today > endDate) {
      return 'completed';
    }

    // Upcoming: Trip starts in the future (1-30 days or more)
    if (today < startDate) {
      return 'upcoming';
    }
  }

  // Check if trip has itinerary content
  const hasItinerary = trip.days && trip.days.length > 0 &&
    trip.days.some(day => day.items && day.items.length > 0);

  // Planning: Itinerary started, no dates set
  if (hasItinerary && (!trip.startDate || !trip.endDate)) {
    return 'planning';
  }

  // Draft: No itinerary yet, just created
  return 'draft';
}

/**
 * Get status badge color classes
 */
export const STATUS_STYLES: Record<TripStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  planning: 'bg-yellow-100 text-yellow-800',
  upcoming: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-purple-100 text-purple-800',
  archived: 'bg-gray-50 text-gray-500',
};

/**
 * Get status display labels
 */
export const STATUS_LABELS: Record<TripStatus, string> = {
  draft: 'Draft',
  planning: 'Planning',
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};
