import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import jwt, { SignOptions } from 'jsonwebtoken';
import type { User } from '@prisma/client';

const router = Router();

// Lazy getters to ensure .env is loaded before accessing
const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';
const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Helper function to generate JWT token
 */
function generateToken(user: User): string {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name || '',
    picture: user.picture || '',
    subscriptionTier: user.subscriptionTier,
    role: user.role,
  };

  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() } as SignOptions);
}

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

/**
 * GET /api/auth/google/callback
 * Google OAuth callback URL
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false, // We're using JWT, not sessions
    failureRedirect: `${getFrontendUrl()}/login?error=auth_failed`,
  }),
  (req: Request, res: Response) => {
    try {
      const user = req.user as User;

      if (!user) {
        return res.redirect(`${getFrontendUrl()}/login?error=no_user`);
      }

      // Generate JWT token
      const token = generateToken(user);

      // Set JWT as httpOnly cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: 'localhost', // Allow cookie to work across localhost:3001 and localhost:5173
        path: '/',
      });

      // Redirect to frontend
      res.redirect(`${getFrontendUrl()}/auth/callback?success=true`);
    } catch (error) {
      console.error('Error in Google callback:', error);
      res.redirect(`${getFrontendUrl()}/login?error=callback_failed`);
    }
  }
);

/**
 * GET /api/auth/me
 * Get currently authenticated user
 */
router.get('/me', (req: Request, res: Response) => {
  try {
    const token = req.cookies.auth_token;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as any;

    res.json({
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      subscriptionTier: decoded.subscriptionTier,
      role: decoded.role,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token with latest user data from database
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const token = req.cookies.auth_token;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as any;

    // Fetch latest user data from database
    const { prisma } = await import('../db.js');
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new token with latest data
    const newToken = generateToken(user);

    // Set new JWT cookie
    res.cookie('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      domain: 'localhost',
      path: '/',
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      subscriptionTier: user.subscriptionTier,
      role: user.role,
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user by clearing auth cookie
 */
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

export default router;
