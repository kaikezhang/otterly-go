import { Resend } from 'resend';
import { prisma } from '../db.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export type EmailType =
  | 'welcome'
  | 'trip_confirmation'
  | 'trip_reminder'
  | 'weather_alert'
  | 'shared_trip'
  | 'weekly_digest'
  | 'transactional';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  userId?: string;
  tripId?: string;
  emailType: EmailType;
}

/**
 * Send an email using Resend and log to database
 */
export async function sendEmail({
  to,
  subject,
  html,
  userId,
  tripId,
  emailType,
}: SendEmailParams) {
  const from = process.env.EMAIL_FROM || 'OtterlyGo <onboarding@resend.dev>';

  try {
    // Create email log entry
    const emailLog = await prisma.emailLog.create({
      data: {
        userId,
        tripId,
        emailType,
        recipientEmail: to,
        subject,
        status: 'pending',
      },
    });

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      // Update log with error
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
        },
      });
      throw new Error(`Failed to send email: ${error.message}`);
    }

    // Update log with success
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'sent',
        resendEmailId: data?.id,
        sentAt: new Date(),
      },
    });

    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

/**
 * Check if user has enabled a specific email notification type
 */
export async function canSendEmail(
  userId: string,
  emailType: EmailType
): Promise<boolean> {
  const preferences = await prisma.emailPreferences.findUnique({
    where: { userId },
  });

  if (!preferences) {
    // If no preferences exist, create default ones and allow email
    await prisma.emailPreferences.create({
      data: { userId },
    });
    return true;
  }

  // Map email type to preference field
  const preferenceMap: Record<EmailType, keyof typeof preferences> = {
    welcome: 'welcomeEmails',
    trip_confirmation: 'tripConfirmations',
    trip_reminder: 'tripReminders',
    weather_alert: 'weatherAlerts',
    shared_trip: 'sharedTripNotifications',
    weekly_digest: 'weeklyDigest',
    transactional: 'welcomeEmails', // Transactional emails always send
  };

  const preferenceKey = preferenceMap[emailType];
  return preferences[preferenceKey] as boolean;
}

/**
 * Get user's email preferences or create default ones
 */
export async function getEmailPreferences(userId: string) {
  let preferences = await prisma.emailPreferences.findUnique({
    where: { userId },
  });

  if (!preferences) {
    preferences = await prisma.emailPreferences.create({
      data: { userId },
    });
  }

  return preferences;
}

/**
 * Update user's email preferences
 */
export async function updateEmailPreferences(
  userId: string,
  updates: Partial<{
    welcomeEmails: boolean;
    tripConfirmations: boolean;
    tripReminders: boolean;
    weatherAlerts: boolean;
    sharedTripNotifications: boolean;
    weeklyDigest: boolean;
    marketingEmails: boolean;
    productUpdates: boolean;
    timezone: string;
  }>
) {
  return await prisma.emailPreferences.upsert({
    where: { userId },
    update: updates,
    create: {
      userId,
      ...updates,
    },
  });
}

/**
 * Unsubscribe from all emails using unsubscribe token
 */
export async function unsubscribeAll(unsubscribeToken: string) {
  const preferences = await prisma.emailPreferences.findUnique({
    where: { unsubscribeToken },
  });

  if (!preferences) {
    throw new Error('Invalid unsubscribe token');
  }

  return await prisma.emailPreferences.update({
    where: { unsubscribeToken },
    data: {
      welcomeEmails: false,
      tripConfirmations: false,
      tripReminders: false,
      weatherAlerts: false,
      sharedTripNotifications: false,
      weeklyDigest: false,
      marketingEmails: false,
      productUpdates: false,
    },
  });
}
