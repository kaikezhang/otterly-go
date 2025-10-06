const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Photo {
  id: string;
  source: 'unsplash' | 'pexels' | 'custom';
  sourcePhotoId: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  attribution: {
    photographerName: string;
    photographerUrl: string;
    sourceUrl: string;
  };
  tags: string[];
}

export interface TripPhoto {
  id: string;
  tripId: string;
  itemId?: string;
  photoId: string;
  displayContext: 'cover' | 'header' | 'suggestion' | 'gallery';
  order: number;
  photo: Photo;
}

interface PhotoSearchResponse {
  success: boolean;
  data?: Photo[];
  error?: string;
  cached?: boolean;
}

interface PhotoAssociationResponse {
  success: boolean;
  data?: TripPhoto;
  error?: string;
}

interface TripPhotosResponse {
  success: boolean;
  data?: {
    coverPhoto: Photo | null;
    photos: TripPhoto[];
  };
  error?: string;
}

/**
 * Search for stock photos via Unsplash API
 * @param query - Search query (e.g., "ramen", "temple", "beach")
 * @param options - Optional search parameters
 */
export async function searchPhotos(
  query: string,
  options?: {
    destination?: string;
    activityType?: string;
    limit?: number;
  }
): Promise<Photo[]> {
  const params = new URLSearchParams({
    query,
    limit: (options?.limit || 10).toString(),
  });

  if (options?.destination) {
    params.append('destination', options.destination);
  }

  if (options?.activityType) {
    params.append('activityType', options.activityType);
  }

  const response = await fetch(`${API_URL}/api/photos/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Photo search failed: ${response.statusText}`);
  }

  const data: PhotoSearchResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Photo search failed');
  }

  return data.data;
}

/**
 * Get relevant photo for an activity
 * Uses activity title and optional location hint for better results
 * @param activityTitle - The activity title (e.g., "Visit Machu Picchu")
 * @param destination - Trip destination for context
 */
export async function getPhotoForActivity(
  activityTitle: string,
  destination?: string
): Promise<Photo | null> {
  try {
    // Extract key terms from activity title (remove common words)
    const cleanQuery = activityTitle
      .toLowerCase()
      .replace(/^(visit|explore|discover|try|enjoy|go to|see)\s+/i, '')
      .trim();

    const photos = await searchPhotos(cleanQuery, {
      destination,
      limit: 1,
    });

    return photos.length > 0 ? photos[0] : null;
  } catch (error) {
    console.error('Failed to get photo for activity:', error);
    return null;
  }
}

/**
 * Get trip cover photo based on destination
 * @param destination - Trip destination (e.g., "Japan", "Peru")
 */
export async function getTripCoverPhoto(destination: string): Promise<Photo | null> {
  try {
    const photos = await searchPhotos(destination, {
      limit: 1,
    });

    return photos.length > 0 ? photos[0] : null;
  } catch (error) {
    console.error('Failed to get trip cover photo:', error);
    return null;
  }
}

/**
 * Associate a photo with a trip or itinerary item
 * @param tripId - Trip ID
 * @param photoId - Photo ID from photo library
 * @param context - Display context (cover, header, suggestion, gallery)
 * @param itemId - Optional itinerary item ID
 */
export async function associatePhotoWithTrip(
  tripId: string,
  photoId: string,
  context: 'cover' | 'header' | 'suggestion' | 'gallery',
  itemId?: string
): Promise<TripPhoto> {
  const response = await fetch(`${API_URL}/api/photos/trips/${tripId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      photoId,
      displayContext: context,
      itemId,
      order: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`Photo association failed: ${response.statusText}`);
  }

  const data: PhotoAssociationResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Photo association failed');
  }

  return data.data;
}

/**
 * Get all photos associated with a trip
 * @param tripId - Trip ID
 */
export async function getTripPhotos(tripId: string): Promise<{
  coverPhoto: Photo | null;
  photos: TripPhoto[];
}> {
  const response = await fetch(`${API_URL}/api/photos/trips/${tripId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to get trip photos: ${response.statusText}`);
  }

  const data: TripPhotosResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to get trip photos');
  }

  return data.data;
}

/**
 * Remove a photo association from a trip
 * @param tripId - Trip ID
 * @param photoId - Photo ID to remove
 */
export async function removePhotoFromTrip(
  tripId: string,
  photoId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/api/photos/trips/${tripId}/${photoId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to remove photo: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to remove photo');
  }
}

/**
 * Set trip cover photo
 * Convenience function to associate a photo as the trip cover
 * @param tripId - Trip ID
 * @param photoId - Photo ID to set as cover
 */
export async function setTripCoverPhoto(
  tripId: string,
  photoId: string
): Promise<TripPhoto> {
  return associatePhotoWithTrip(tripId, photoId, 'cover');
}

/**
 * Auto-select and set cover photo for a trip
 * Searches for destination and sets the first result as cover
 * @param tripId - Trip ID
 * @param destination - Trip destination
 */
export async function autoSetTripCoverPhoto(
  tripId: string,
  destination: string
): Promise<TripPhoto | null> {
  try {
    const coverPhoto = await getTripCoverPhoto(destination);

    if (!coverPhoto) {
      return null;
    }

    return await setTripCoverPhoto(tripId, coverPhoto.id);
  } catch (error) {
    console.error('Failed to auto-set trip cover photo:', error);
    return null;
  }
}
