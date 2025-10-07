/**
 * Gmail Service (Milestone 5.1)
 * OAuth integration and inbox scanning for travel booking emails
 */

import { google } from 'googleapis';
import { prisma } from '../db.js';
import crypto from 'crypto';

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Encryption key for storing OAuth tokens (from environment)
const ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Get OAuth2 client configured for Gmail
 */
export function getGmailOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/email-import/gmail/callback`
  );

  return oauth2Client;
}

/**
 * Generate Gmail OAuth authorization URL
 */
export function getGmailAuthUrl(userId: string): string {
  const oauth2Client = getGmailOAuthClient();

  // State parameter includes userId for callback verification
  const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request refresh token
    scope: GMAIL_SCOPES,
    state,
    prompt: 'consent', // Force consent screen to get refresh token
  });

  return authUrl;
}

/**
 * Simple encryption for OAuth tokens
 * NOTE: In production, use a proper encryption library like @aws-sdk/client-kms
 */
function encryptToken(token: string): string {
  // Simple base64 encoding for now
  // TODO: Replace with proper encryption in production
  return Buffer.from(token).toString('base64');
}

function decryptToken(encryptedToken: string): string {
  return Buffer.from(encryptedToken, 'base64').toString('utf-8');
}

/**
 * Exchange authorization code for tokens and save to database
 */
export async function handleGmailCallback(code: string, state: string) {
  try {
    // Decode and verify state
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    const { userId, timestamp } = decodedState;

    // Verify state is recent (within 10 minutes)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      throw new Error('OAuth state expired');
    }

    const oauth2Client = getGmailOAuthClient();

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Get user's email address
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const emailAddress = profile.data.emailAddress || 'unknown';

    // Save or update connection in database
    await prisma.emailConnection.upsert({
      where: {
        userId_provider: {
          userId,
          provider: 'gmail',
        },
      },
      create: {
        userId,
        provider: 'gmail',
        email: emailAddress,
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: GMAIL_SCOPES.join(' '),
        status: 'active',
      },
      update: {
        email: emailAddress,
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        status: 'active',
        updatedAt: new Date(),
      },
    });

    return { success: true, email: emailAddress };
  } catch (error) {
    console.error('Gmail callback error:', error);
    throw error;
  }
}

/**
 * Get authenticated Gmail client for a user
 */
export async function getAuthenticatedGmailClient(userId: string) {
  const connection = await prisma.emailConnection.findFirst({
    where: {
      userId,
      provider: 'gmail',
      status: 'active',
    },
  });

  if (!connection) {
    throw new Error('No active Gmail connection found');
  }

  const oauth2Client = getGmailOAuthClient();

  // Set credentials
  oauth2Client.setCredentials({
    access_token: decryptToken(connection.accessToken),
    refresh_token: connection.refreshToken ? decryptToken(connection.refreshToken) : undefined,
    expiry_date: connection.tokenExpiresAt?.getTime(),
  });

  // Auto-refresh token if expired
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.emailConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: encryptToken(tokens.access_token),
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          updatedAt: new Date(),
        },
      });
    }
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  return gmail;
}

/**
 * Scan Gmail inbox for booking emails
 */
export async function scanGmailInbox(userId: string, maxResults: number = 20) {
  try {
    const gmail = await getAuthenticatedGmailClient(userId);

    // Search query for booking emails (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const afterDate = thirtyDaysAgo.toISOString().split('T')[0].replace(/-/g, '/');

    const query = `after:${afterDate} (
      from:noreply@united.com OR
      from:delta.com OR
      from:aa.com OR
      from:southwest.com OR
      from:airbnb.com OR
      from:booking.com OR
      from:hotels.com OR
      from:hilton.com OR
      from:marriott.com OR
      from:hertz.com OR
      from:enterprise.com OR
      from:opentable.com OR
      from:resy.com OR
      from:viator.com OR
      from:getyourguide.com
    ) subject:(confirmation OR booking OR reservation OR itinerary)`;

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const messages = response.data.messages || [];

    const bookingEmails = [];

    for (const message of messages) {
      if (!message.id) continue;

      // Get full message details
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });

      // Extract headers
      const headers = fullMessage.data.payload?.headers || [];
      const subject = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value || '';
      const from = headers.find((h) => h.name?.toLowerCase() === 'from')?.value || '';

      // Extract email address from "From" header
      const fromEmailMatch = from.match(/<(.+?)>/);
      const fromEmail = fromEmailMatch ? fromEmailMatch[1] : from;

      // Extract body (plain text or HTML)
      let emailContent = '';
      const parts = fullMessage.data.payload?.parts || [];

      // Try to get plain text first, fall back to HTML
      const textPart = parts.find((p) => p.mimeType === 'text/plain');
      const htmlPart = parts.find((p) => p.mimeType === 'text/html');

      if (textPart?.body?.data) {
        emailContent = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      } else if (htmlPart?.body?.data) {
        emailContent = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
      } else if (fullMessage.data.payload?.body?.data) {
        emailContent = Buffer.from(fullMessage.data.payload.body.data, 'base64').toString('utf-8');
      }

      bookingEmails.push({
        messageId: message.id,
        subject,
        from: fromEmail,
        content: emailContent,
        internalDate: fullMessage.data.internalDate
          ? new Date(parseInt(fullMessage.data.internalDate))
          : new Date(),
      });
    }

    // Update last synced timestamp
    await prisma.emailConnection.updateMany({
      where: {
        userId,
        provider: 'gmail',
      },
      data: {
        lastSyncedAt: new Date(),
      },
    });

    return bookingEmails;
  } catch (error) {
    console.error('Gmail scan error:', error);
    throw error;
  }
}

/**
 * Disconnect Gmail account
 */
export async function disconnectGmail(userId: string) {
  await prisma.emailConnection.updateMany({
    where: {
      userId,
      provider: 'gmail',
    },
    data: {
      status: 'disconnected',
      syncEnabled: false,
    },
  });
}
