const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
}

interface GeocodeResponse {
  success: boolean;
  data?: GeocodeResult;
  error?: string;
  cached?: boolean;
}

interface DirectionsResult {
  geometry: GeoJSON.LineString;
  distance: number; // meters
  duration: number; // seconds
}

interface DirectionsResponse {
  success: boolean;
  data?: DirectionsResult;
  error?: string;
}

// Map common country names to ISO 3166-1 alpha-2 codes
const COUNTRY_CODE_MAP: Record<string, string> = {
  'china': 'cn',
  'united states': 'us',
  'usa': 'us',
  'japan': 'jp',
  'south korea': 'kr',
  'france': 'fr',
  'italy': 'it',
  'spain': 'es',
  'germany': 'de',
  'united kingdom': 'gb',
  'uk': 'gb',
  'canada': 'ca',
  'australia': 'au',
  'mexico': 'mx',
  'brazil': 'br',
  'india': 'in',
  'thailand': 'th',
  'vietnam': 'vn',
  'singapore': 'sg',
  'malaysia': 'my',
  'indonesia': 'id',
  'philippines': 'ph',
  'new zealand': 'nz',
  'switzerland': 'ch',
  'netherlands': 'nl',
  'portugal': 'pt',
  'greece': 'gr',
  'turkey': 'tr',
  'egypt': 'eg',
  'south africa': 'za',
  'argentina': 'ar',
  'chile': 'cl',
  'peru': 'pe',
  'colombia': 'co',
};

/**
 * Get ISO country code from country name
 */
function getCountryCode(country: string): string | undefined {
  return COUNTRY_CODE_MAP[country.toLowerCase()];
}

/**
 * Geocode a location query to coordinates
 * @param query - Location name or address
 * @param proximity - Optional proximity bias for results
 * @param country - Optional country name to restrict results
 */
export async function geocodeLocation(
  query: string,
  proximity?: { lng: number; lat: number },
  country?: string
): Promise<GeocodeResult> {
  const params = new URLSearchParams({
    query,
  });

  if (proximity) {
    params.append('proximity', JSON.stringify(proximity));
  }

  if (country) {
    const countryCode = getCountryCode(country);
    if (countryCode) {
      params.append('country', countryCode);
    }
  }

  const response = await fetch(`${API_URL}/api/map/geocode?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.statusText}`);
  }

  const data: GeocodeResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Geocoding failed');
  }

  return data.data;
}

/**
 * Get route polyline and distance/duration between coordinates
 * @param coordinates - Array of waypoints
 * @param profile - Travel mode (walking, driving, cycling)
 */
export async function getDirections(
  coordinates: Array<{ lng: number; lat: number }>,
  profile: 'walking' | 'driving' | 'cycling' = 'walking'
): Promise<DirectionsResult> {
  const response = await fetch(`${API_URL}/api/map/directions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ coordinates, profile }),
  });

  if (!response.ok) {
    throw new Error(`Directions failed: ${response.statusText}`);
  }

  const data: DirectionsResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Directions failed');
  }

  return data.data;
}

/**
 * Batch geocode multiple location queries
 * @param queries - Array of location names
 * @param proximity - Optional proximity bias for all results
 */
export async function batchGeocodeLocations(
  queries: string[],
  proximity?: { lng: number; lat: number }
): Promise<Map<string, GeocodeResult>> {
  const results = new Map<string, GeocodeResult>();

  // Geocode sequentially to avoid rate limiting
  for (const query of queries) {
    try {
      const result = await geocodeLocation(query, proximity);
      results.set(query, result);
    } catch (error) {
      console.error(`Failed to geocode "${query}":`, error);
      // Continue with other queries
    }
  }

  return results;
}

/**
 * Calculate total distance and duration for a day's route
 * @param coordinates - Array of waypoints for the day
 * @param profile - Travel mode
 */
export async function calculateDayRoute(
  coordinates: Array<{ lng: number; lat: number }>,
  profile: 'walking' | 'driving' | 'cycling' = 'walking'
): Promise<{ distance: number; duration: number; distanceKm: string; durationHours: string }> {
  if (coordinates.length < 2) {
    return {
      distance: 0,
      duration: 0,
      distanceKm: '0 km',
      durationHours: '0 min',
    };
  }

  try {
    const result = await getDirections(coordinates, profile);

    const distanceKm = (result.distance / 1000).toFixed(1);
    const durationMinutes = Math.round(result.duration / 60);
    const durationHours =
      durationMinutes >= 60
        ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
        : `${durationMinutes} min`;

    return {
      distance: result.distance,
      duration: result.duration,
      distanceKm: `${distanceKm} km`,
      durationHours,
    };
  } catch (error) {
    console.error('Failed to calculate route:', error);
    return {
      distance: 0,
      duration: 0,
      distanceKm: 'N/A',
      durationHours: 'N/A',
    };
  }
}
