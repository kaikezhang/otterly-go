import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Mapbox API configuration
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

// In-memory cache for geocoding results (production should use Redis)
const geocodeCache = new Map<string, { lat: number; lng: number; address: string }>();
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

// Validation schemas
const geocodeRequestSchema = z.object({
  query: z.string().min(1).max(200),
  proximity: z
    .object({
      lng: z.number(),
      lat: z.number(),
    })
    .optional(),
});

const directionsRequestSchema = z.object({
  coordinates: z.array(
    z.object({
      lng: z.number(),
      lat: z.number(),
    })
  ).min(2).max(25), // Mapbox limit is 25 coordinates
  profile: z.enum(['driving', 'walking', 'cycling']).default('walking'),
});

/**
 * GET /api/map/geocode
 * Geocode a location query to coordinates
 */
router.get('/geocode', async (req, res) => {
  try {
    // Validate query parameters
    const { query, proximity } = geocodeRequestSchema.parse({
      query: req.query.query,
      proximity: req.query.proximity
        ? JSON.parse(req.query.proximity as string)
        : undefined,
    });

    // Check cache first
    const cacheKey = `${query}${proximity ? `-${proximity.lng},${proximity.lat}` : ''}`;
    if (geocodeCache.has(cacheKey)) {
      const cached = geocodeCache.get(cacheKey)!;
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Validate Mapbox token
    if (!MAPBOX_ACCESS_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'Mapbox API token not configured',
      });
    }

    // Build Mapbox Geocoding API URL
    const encodedQuery = encodeURIComponent(query);
    let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_ACCESS_TOKEN}`;

    // Add proximity bias if provided
    if (proximity) {
      url += `&proximity=${proximity.lng},${proximity.lat}`;
    }

    // Call Mapbox Geocoding API
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Location not found',
      });
    }

    // Extract first result
    const feature = data.features[0];
    const result = {
      lat: feature.center[1],
      lng: feature.center[0],
      address: feature.place_name,
    };

    // Cache the result
    geocodeCache.set(cacheKey, result);

    // Clean up old cache entries after TTL
    setTimeout(() => {
      geocodeCache.delete(cacheKey);
    }, CACHE_TTL);

    res.json({
      success: true,
      data: result,
      cached: false,
    });
  } catch (error) {
    console.error('Geocoding error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Geocoding failed',
    });
  }
});

/**
 * POST /api/map/directions
 * Get route polyline and distance/duration between coordinates
 */
router.post('/directions', async (req, res) => {
  try {
    // Validate request body
    const { coordinates, profile } = directionsRequestSchema.parse(req.body);

    // Validate Mapbox token
    if (!MAPBOX_ACCESS_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'Mapbox API token not configured',
      });
    }

    // Build coordinates string (lng,lat;lng,lat;...)
    const coordsString = coordinates
      .map((coord) => `${coord.lng},${coord.lat}`)
      .join(';');

    // Call Mapbox Directions API
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordsString}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No route found',
      });
    }

    const route = data.routes[0];

    res.json({
      success: true,
      data: {
        geometry: route.geometry, // GeoJSON LineString
        distance: route.distance, // meters
        duration: route.duration, // seconds
      },
    });
  } catch (error) {
    console.error('Directions error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Directions failed',
    });
  }
});

export default router;
