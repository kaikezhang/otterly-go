/**
 * Outlook Service (Milestone 5.1)
 * OAuth integration and inbox scanning for travel booking emails
 */

import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { prisma } from '../db.js';
import crypto from 'crypto';

const OUTLOOK_SCOPES = ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/User.Read'];

/**
 * Simple encryption for OAuth tokens (same as Gmail)
 */
function encryptToken(token: string): string {
  return Buffer.from(token).toString('base64');
}

function decryptToken(encryptedToken: string): string {
  return Buffer.from(encryptedToken, 'base64').toString('utf-8');
}

/**
 * Get MSAL client for Outlook OAuth
 */
function getMsalClient() {
  const config = {
    auth: {
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      authority: `https://login.microsoftonline.com/common`,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    },
  };

  return new ConfidentialClientApplication(config);
}

/**
 * Generate Outlook OAuth authorization URL
 */
export function getOutlookAuthUrl(userId: string): string {
  const msalClient = getMsalClient();

  // State parameter includes userId for callback verification
  const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

  const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/email-import/outlook/callback`;

  const authCodeUrlParameters = {
    scopes: OUTLOOK_SCOPES,
    redirectUri,
    state,
  };

  return msalClient.getAuthCodeUrl(authCodeUrlParameters);
}

/**
 * Exchange authorization code for tokens and save to database
 */
export async function handleOutlookCallback(code: string, state: string) {
  try {
    // Decode and verify state
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    const { userId, timestamp } = decodedState;

    // Verify state is recent (within 10 minutes)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      throw new Error('OAuth state expired');
    }

    const msalClient = getMsalClient();
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/email-import/outlook/callback`;

    const tokenRequest = {
      code,
      scopes: OUTLOOK_SCOPES,
      redirectUri,
    };

    const response = await msalClient.acquireTokenByCode(tokenRequest);

    if (!response.accessToken) {
      throw new Error('No access token received');
    }

    // Get user's email address from Microsoft Graph
    const client = Client.init({
      authProvider: (done) => {
        done(null, response.accessToken);
      },
    });

    const user = await client.api('/me').select('mail,userPrincipalName').get();
    const emailAddress = user.mail || user.userPrincipalName || 'unknown';

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (response.expiresOn?.getTime() || 3600 * 1000));

    // Save or update connection in database
    await prisma.emailConnection.upsert({
      where: {
        userId_provider: {
          userId,
          provider: 'outlook',
        },
      },
      create: {
        userId,
        provider: 'outlook',
        email: emailAddress,
        accessToken: encryptToken(response.accessToken),
        refreshToken: response.refreshToken ? encryptToken(response.refreshToken) : null,
        tokenExpiresAt: expiresAt,
        scope: OUTLOOK_SCOPES.join(' '),
        status: 'active',
      },
      update: {
        email: emailAddress,
        accessToken: encryptToken(response.accessToken),
        refreshToken: response.refreshToken ? encryptToken(response.refreshToken) : null,
        tokenExpiresAt: expiresAt,
        status: 'active',
        updatedAt: new Date(),
      },
    });

    return { success: true, email: emailAddress };
  } catch (error) {
    console.error('Outlook callback error:', error);
    throw error;
  }
}

/**
 * Get authenticated Microsoft Graph client for a user
 */
export async function getAuthenticatedGraphClient(userId: string) {
  const connection = await prisma.emailConnection.findFirst({
    where: {
      userId,
      provider: 'outlook',
      status: 'active',
    },
  });

  if (!connection) {
    throw new Error('No active Outlook connection found');
  }

  let accessToken = decryptToken(connection.accessToken);

  // Check if token is expired and refresh if needed
  if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
    if (!connection.refreshToken) {
      throw new Error('Access token expired and no refresh token available');
    }

    const msalClient = getMsalClient();

    const refreshTokenRequest = {
      refreshToken: decryptToken(connection.refreshToken),
      scopes: OUTLOOK_SCOPES,
    };

    const response = await msalClient.acquireTokenByRefreshToken(refreshTokenRequest);

    if (!response.accessToken) {
      throw new Error('Failed to refresh access token');
    }

    accessToken = response.accessToken;

    // Update tokens in database
    const expiresAt = new Date(Date.now() + (response.expiresOn?.getTime() || 3600 * 1000));

    await prisma.emailConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: encryptToken(response.accessToken),
        refreshToken: response.refreshToken ? encryptToken(response.refreshToken) : connection.refreshToken,
        tokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      },
    });
  }

  const client = Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });

  return client;
}

/**
 * Scan Outlook inbox for booking emails
 */
export async function scanOutlookInbox(userId: string, maxResults: number = 20) {
  try {
    const client = await getAuthenticatedGraphClient(userId);

    // Search query for booking emails (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const filterDate = thirtyDaysAgo.toISOString();

    const filter = `receivedDateTime ge ${filterDate}`;
    const search = `(from:united.com OR from:delta.com OR from:aa.com OR from:southwest.com OR from:airbnb.com OR from:booking.com OR from:hotels.com OR from:hilton.com OR from:marriott.com OR from:hertz.com OR from:enterprise.com OR from:opentable.com OR from:resy.com OR from:viator.com OR from:getyourguide.com) AND (subject:confirmation OR subject:booking OR subject:reservation OR subject:itinerary)`;

    const messages = await client
      .api('/me/messages')
      .filter(filter)
      .search(search)
      .top(maxResults)
      .select('id,subject,from,receivedDateTime,body')
      .get();

    const bookingEmails = [];

    for (const message of messages.value) {
      const subject = message.subject || '';
      const fromEmail = message.from?.emailAddress?.address || '';
      const emailContent = message.body?.content || '';
      const receivedDateTime = message.receivedDateTime ? new Date(message.receivedDateTime) : new Date();

      bookingEmails.push({
        messageId: message.id,
        subject,
        from: fromEmail,
        content: emailContent,
        internalDate: receivedDateTime,
      });
    }

    // Update last synced timestamp
    await prisma.emailConnection.updateMany({
      where: {
        userId,
        provider: 'outlook',
      },
      data: {
        lastSyncedAt: new Date(),
      },
    });

    return bookingEmails;
  } catch (error) {
    console.error('Outlook scan error:', error);
    throw error;
  }
}

/**
 * Disconnect Outlook account
 */
export async function disconnectOutlook(userId: string) {
  await prisma.emailConnection.updateMany({
    where: {
      userId,
      provider: 'outlook',
    },
    data: {
      status: 'disconnected',
      syncEnabled: false,
    },
  });
}
