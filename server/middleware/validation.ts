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

// Schema for quick replies in AI responses
export const quickReplySchema = z.object({
  text: z.string().min(1).max(100),
  action: z.enum(['info', 'confirm', 'alternative', 'custom']),
});

// Schema for AI response validation
export const aiResponseSchema = z.discriminatedUnion('type', [
  // Message response with optional quick replies
  z.object({
    type: z.literal('message'),
    content: z.string(),
    quickReplies: z.array(quickReplySchema).min(1).max(6).optional(),
  }),
  // Itinerary response
  z.object({
    type: z.literal('itinerary'),
    content: z.string(),
    trip: z.any(), // Trip object
  }),
  // Suggestion card response
  z.object({
    type: z.literal('suggestion'),
    content: z.string(),
    suggestion: z.any(), // SuggestionCard object
  }),
  // Update response
  z.object({
    type: z.literal('update'),
    content: z.string(),
    updates: z.any(), // Partial trip updates
  }),
]);

export type AIResponse = z.infer<typeof aiResponseSchema>;

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
  // Filtering and search (Milestone 3.5)
  search: z.string().optional(),
  status: z.enum(['draft', 'planning', 'upcoming', 'active', 'completed', 'archived', 'all', 'past']).optional(),
  archived: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  tags: z.string().transform(val => val.split(',')).optional(), // Comma-separated tags
  // Sorting
  sort: z.enum(['recent', 'oldest', 'name', 'startDate', 'endDate']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export type TripListQuery = z.infer<typeof tripListQuerySchema>;

// Schema for bulk operations (Milestone 3.5)
export const bulkOperationSchema = z.object({
  operation: z.enum(['archive', 'delete', 'duplicate', 'complete']),
  tripIds: z.array(z.string().min(1)).min(1).max(50), // Max 50 trips per bulk operation
});

export type BulkOperationRequest = z.infer<typeof bulkOperationSchema>;

// Schema for user registration
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  name: z.string().min(1).max(100).optional(),
});

export type RegisterRequest = z.infer<typeof registerSchema>;

// Schema for user login
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof loginSchema>;

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
      // Validate query params (don't try to reassign req.query as it's read-only)
      schema.parse(req.query);
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
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  };
}
