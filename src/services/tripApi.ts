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

export interface ShareLinkResponse {
  shareToken: string;
  shareUrl: string;
}

export interface SharedTripResponse extends TripResponse {
  isShared: true;
  owner: {
    name: string;
    picture?: string;
  };
  viewCount: number;
}

/**
 * Create a new trip in the database
 */
export async function createTrip(
  trip: Trip,
  messages: ChatMessage[]
): Promise<TripResponse> {
  const response = await fetch(`${API_URL}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Include auth cookies
    body: JSON.stringify({
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
    credentials: 'include', // Include auth cookies
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
  const response = await fetch(`${API_URL}/api/trips/${tripId}`, {
    credentials: 'include', // Include auth cookies
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch trip' }));
    throw new Error(error.error || 'Failed to fetch trip');
  }

  return response.json();
}

/**
 * List all trips for the authenticated user
 */
export async function listTrips(
  page = 1,
  limit = 10
): Promise<TripListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(`${API_URL}/api/trips?${params}`, {
    credentials: 'include', // Include auth cookies
  });

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
    credentials: 'include', // Include auth cookies
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete trip' }));
    throw new Error(error.error || 'Failed to delete trip');
  }
}

/**
 * Generate or retrieve a shareable link for a trip
 */
export async function generateShareLink(tripId: string): Promise<ShareLinkResponse> {
  const response = await fetch(`${API_URL}/api/trips/${tripId}/share`, {
    method: 'POST',
    credentials: 'include', // Include auth cookies
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to generate share link' }));
    throw new Error(error.error || 'Failed to generate share link');
  }

  return response.json();
}

/**
 * Revoke a share link for a trip
 */
export async function revokeShareLink(tripId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/trips/${tripId}/share`, {
    method: 'DELETE',
    credentials: 'include', // Include auth cookies
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({ error: 'Failed to revoke share link' }));
    throw new Error(error.error || 'Failed to revoke share link');
  }
}

/**
 * Get a shared trip by its public share token (no auth required)
 */
export async function getSharedTrip(shareToken: string): Promise<SharedTripResponse> {
  const response = await fetch(`${API_URL}/api/share/${shareToken}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch shared trip' }));
    throw new Error(error.error || 'Failed to fetch shared trip');
  }

  return response.json();
}
