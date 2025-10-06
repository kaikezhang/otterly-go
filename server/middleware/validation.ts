import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// Schema for chat request
export const chatRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).optional(),
  currentTrip: z.any().nullable().optional(), // Trip object or null
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

// Schema for creating a trip
export const createTripSchema = z.object({
  title: z.string().min(1).max(200),
  destination: z.string().min(1).max(200),
  startDate: z.string().min(1), // ISO date string (e.g., "2025-11-01" or "2025-11-01T00:00:00Z")
  endDate: z.string().min(1), // ISO date string
  tripData: z.any(), // Full Trip object from frontend
  messages: z.array(z.any()).optional(), // Conversation messages
});

export type CreateTripRequest = z.infer<typeof createTripSchema>;

// Schema for updating a trip
export const updateTripSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  destination: z.string().min(1).max(200).optional(),
  startDate: z.string().min(1).optional(), // ISO date string
  endDate: z.string().min(1).optional(), // ISO date string
  tripData: z.any().optional(), // Updated Trip object
  messages: z.array(z.any()).optional(), // Updated conversation messages
});

export type UpdateTripRequest = z.infer<typeof updateTripSchema>;

// Schema for query parameters
export const tripListQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type TripListQuery = z.infer<typeof tripListQuerySchema>;

// Validation middleware factory
export function validateRequest<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.issues,
        });
      } else {
        res.status(400).json({
          error: 'Invalid request',
        });
      }
    }
  };
}

// Query parameter validation middleware factory
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.issues,
        });
      } else {
        res.status(400).json({
          error: 'Invalid query parameters',
        });
      }
    }
  };
}
