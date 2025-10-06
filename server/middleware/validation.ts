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
