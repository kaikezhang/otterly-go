import type { Trip, ChatMessage } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface TripResponse {
  id: string;
  userId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  tripData: Trip;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface TripListResponse {
  trips: TripResponse[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Create a new trip in the database
 */
export async function createTrip(
  userId: string,
  trip: Trip,
  messages: ChatMessage[]
): Promise<TripResponse> {
  const response = await fetch(`${API_URL}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      title: `${trip.destination} Trip`, // Generate a title
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      tripData: trip,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create trip' }));
    throw new Error(error.error || 'Failed to create trip');
  }

  return response.json();
}

/**
 * Update an existing trip
 */
export async function updateTrip(
  tripId: string,
  tripData?: Trip,
  messages?: ChatMessage[]
): Promise<TripResponse> {
  const response = await fetch(`${API_URL}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(tripData && {
        title: `${tripData.destination} Trip`,
        destination: tripData.destination,
        startDate: tripData.startDate,
        endDate: tripData.endDate,
        tripData,
      }),
      ...(messages && { messages }),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update trip' }));
    throw new Error(error.error || 'Failed to update trip');
  }

  return response.json();
}

/**
 * Get a single trip by ID
 */
export async function getTrip(tripId: string): Promise<TripResponse> {
  const response = await fetch(`${API_URL}/api/trips/${tripId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch trip' }));
    throw new Error(error.error || 'Failed to fetch trip');
  }

  return response.json();
}

/**
 * List all trips for a user
 */
export async function listTrips(
  userId: string,
  page = 1,
  limit = 10
): Promise<TripListResponse> {
  const params = new URLSearchParams({
    userId,
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(`${API_URL}/api/trips?${params}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to list trips' }));
    throw new Error(error.error || 'Failed to list trips');
  }

  return response.json();
}

/**
 * Delete a trip
 */
export async function deleteTrip(tripId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/trips/${tripId}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete trip' }));
    throw new Error(error.error || 'Failed to delete trip');
  }
}

/**
 * Generate or retrieve a user ID (temporary solution until authentication is implemented)
 * In Milestone 2.1, this will be replaced with proper authentication
 */
export function getUserId(): string {
  const STORAGE_KEY = 'otterly-go-user-id';
  let userId = localStorage.getItem(STORAGE_KEY);

  if (!userId) {
    // Generate a simple UUID-like ID
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(STORAGE_KEY, userId);
  }

  return userId;
}
