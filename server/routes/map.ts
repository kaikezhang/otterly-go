import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';

const router = Router();

// Mapbox API configuration
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

// Cache TTL: 30 days (stored in database)
const CACHE_TTL_DAYS = 30;

// Validation schemas
const geocodeRequestSchema = z.object({
  query: z.string().min(1).max(200),
  proximity: z
    .object({
      lng: z.number(),
      lat: z.number(),
    })
    .optional(),
  country: z.string().length(2).optional(), // ISO 3166-1 alpha-2 country code
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
 * Geocode a location query to coordinates (with database caching)
 */
router.get('/geocode', async (req, res) => {
  try {
    // Validate query parameters
    const { query, proximity, country } = geocodeRequestSchema.parse({
      query: req.query.query,
      proximity: req.query.proximity
        ? JSON.parse(req.query.proximity as string)
        : undefined,
      country: req.query.country,
    });

    // Build cache lookup parameters
    const proximityString = proximity ? `${proximity.lng},${proximity.lat}` : '';
    const cacheKey = `${query}|${proximityString}|${country || ''}`;

    // Check database cache first
    const cached = await prisma.geocodeCache.findUnique({
      where: {
        cacheKey,
      },
    });

    // Return cached result if not expired
    if (cached && cached.expiresAt > new Date()) {
      // Increment usage count
      await prisma.geocodeCache.update({
        where: { id: cached.id },
        data: { usageCount: { increment: 1 } },
      });

      return res.json({
        success: true,
        data: {
          lat: cached.lat,
          lng: cached.lng,
          address: cached.address,
        },
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

    // Add country restriction if provided (ISO 3166-1 alpha-2)
    if (country) {
      url += `&country=${country.toLowerCase()}`;
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

    // Store in database cache (upsert to handle expired entries)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    await prisma.geocodeCache.upsert({
      where: {
        cacheKey,
      },
      create: {
        cacheKey,
        query,
        proximity: proximityString || null,
        country: country || null,
        lat: result.lat,
        lng: result.lng,
        address: result.address,
        usageCount: 1,
        expiresAt,
      },
      update: {
        lat: result.lat,
        lng: result.lng,
        address: result.address,
        expiresAt, // Refresh expiration
        usageCount: { increment: 1 },
      },
    });

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
