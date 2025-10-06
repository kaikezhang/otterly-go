import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * Middleware to verify JWT token from cookie
 * Adds userId and userEmail to request object
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies.auth_token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Add user info to request
    req.userId = decoded.id;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Optional auth middleware - doesn't require authentication
 * but adds user info if token is present
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies.auth_token;

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.userId = decoded.id;
      req.userEmail = decoded.email;
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}
