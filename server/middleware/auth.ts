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
      console.log('[AUTH] No token found in cookies');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('[AUTH] Token found, verifying...');
    console.log('[AUTH] Token preview:', token.substring(0, 20) + '...');
    console.log('[AUTH] JWT_SECRET preview:', JWT_SECRET.substring(0, 10) + '...');

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    console.log('[AUTH] Token verified successfully for user:', decoded.id);

    // Add user info to request
    req.userId = decoded.id;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.error('[AUTH] JWT verification error:', error.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      console.error('[AUTH] Token expired:', error.message);
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('[AUTH] Unknown error verifying token:', error);
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
