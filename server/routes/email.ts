import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import {
  getEmailPreferences,
  updateEmailPreferences,
  unsubscribeAll,
} from '../services/emailService.js';

const router = Router();

/**
 * GET /api/email/preferences
 * Get current user's email preferences (requires auth)
 */
router.get('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const preferences = await getEmailPreferences(req.userId);

    res.json({
      welcomeEmails: preferences.welcomeEmails,
      tripConfirmations: preferences.tripConfirmations,
      tripReminders: preferences.tripReminders,
      weatherAlerts: preferences.weatherAlerts,
      sharedTripNotifications: preferences.sharedTripNotifications,
      weeklyDigest: preferences.weeklyDigest,
      marketingEmails: preferences.marketingEmails,
      productUpdates: preferences.productUpdates,
      timezone: preferences.timezone,
    });
  } catch (error) {
    console.error('Error fetching email preferences:', error);
    res.status(500).json({
      error: 'Failed to fetch email preferences',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/email/preferences
 * Update current user's email preferences (requires auth)
 */
const updatePreferencesSchema = z.object({
  welcomeEmails: z.boolean().optional(),
  tripConfirmations: z.boolean().optional(),
  tripReminders: z.boolean().optional(),
  weatherAlerts: z.boolean().optional(),
  sharedTripNotifications: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  productUpdates: z.boolean().optional(),
  timezone: z.string().optional(),
});

router.put('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate request body
    const validation = updatePreferencesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.errors,
      });
    }

    const updates = validation.data;
    const preferences = await updateEmailPreferences(req.userId, updates);

    res.json({
      welcomeEmails: preferences.welcomeEmails,
      tripConfirmations: preferences.tripConfirmations,
      tripReminders: preferences.tripReminders,
      weatherAlerts: preferences.weatherAlerts,
      sharedTripNotifications: preferences.sharedTripNotifications,
      weeklyDigest: preferences.weeklyDigest,
      marketingEmails: preferences.marketingEmails,
      productUpdates: preferences.productUpdates,
      timezone: preferences.timezone,
    });
  } catch (error) {
    console.error('Error updating email preferences:', error);
    res.status(500).json({
      error: 'Failed to update email preferences',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/email/unsubscribe
 * Unsubscribe from all emails using token (no auth required)
 */
router.get('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Unsubscribe token is required' });
    }

    await unsubscribeAll(token);

    // Return HTML page for user-friendly unsubscribe confirmation
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed - OtterlyGo</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    h1 {
      color: #333;
      margin-bottom: 20px;
    }
    p {
      color: #666;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
    }
    .button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>✅ You've been unsubscribed</h1>
    <p>You won't receive any more emails from OtterlyGo.</p>
    <p>We're sorry to see you go! If you change your mind, you can always update your email preferences in your account settings.</p>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">Back to OtterlyGo</a>
  </div>
</body>
</html>
    `);
  } catch (error) {
    console.error('Error unsubscribing:', error);

    // Return error HTML page
    res.status(500).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - OtterlyGo</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    h1 {
      color: #333;
      margin-bottom: 20px;
    }
    p {
      color: #666;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>❌ Oops!</h1>
    <p>We couldn't process your unsubscribe request. The link may be invalid or expired.</p>
    <p>Please contact support if you continue to have issues.</p>
  </div>
</body>
</html>
    `);
  }
});

export default router;
