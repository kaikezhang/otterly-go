/**
 * Email templates for OtterlyGo
 * These templates use modern HTML/CSS for responsive, accessible emails
 */

interface BaseEmailData {
  userName: string;
  unsubscribeUrl: string;
}

interface WelcomeEmailData extends BaseEmailData {
  loginUrl: string;
}

interface TripConfirmationEmailData extends BaseEmailData {
  tripTitle: string;
  tripDestination: string;
  tripStartDate: string;
  tripEndDate: string;
  shareUrl: string;
  viewTripUrl: string;
}

interface TripReminderEmailData extends BaseEmailData {
  tripTitle: string;
  tripDestination: string;
  tripStartDate: string;
  daysUntilTrip: number;
  viewTripUrl: string;
}

interface WeatherAlertEmailData extends BaseEmailData {
  tripTitle: string;
  tripDestination: string;
  weatherCondition: string;
  temperature: string;
  description: string;
  viewTripUrl: string;
}

interface SharedTripViewEmailData extends BaseEmailData {
  tripTitle: string;
  viewerCount: number;
  shareUrl: string;
  viewTripUrl: string;
}

interface WeeklyDigestEmailData extends BaseEmailData {
  upcomingTrips: Array<{
    title: string;
    destination: string;
    startDate: string;
    url: string;
  }>;
  suggestions: Array<{
    title: string;
    description: string;
    imageUrl: string;
    url: string;
  }>;
}

interface PasswordResetEmailData extends BaseEmailData {
  resetUrl: string;
  expiresIn: string;
}

interface PaymentReceiptEmailData extends BaseEmailData {
  amount: string;
  planName: string;
  invoiceUrl: string;
  date: string;
}

/**
 * Base email layout
 */
function emailLayout(content: string, unsubscribeUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OtterlyGo</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      color: #333;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #ffffff;
    }
    .content {
      padding: 40px 20px;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      padding: 20px;
      text-align: center;
      color: #666;
      font-size: 12px;
      background-color: #f9f9f9;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    h1 {
      color: #333;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      line-height: 1.6;
      margin-bottom: 16px;
      color: #555;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">🦦 OtterlyGo</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} OtterlyGo. All rights reserved.</p>
      <p><a href="${unsubscribeUrl}">Unsubscribe</a> from these emails</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Welcome email template
 */
export function welcomeEmail(data: WelcomeEmailData): string {
  const content = `
    <h1>Welcome to OtterlyGo, ${data.userName}! 🎉</h1>
    <p>We're thrilled to have you join our community of travelers!</p>
    <p>With OtterlyGo, you can:</p>
    <ul style="line-height: 1.8; color: #555;">
      <li>🗺️ Create AI-powered trip itineraries in seconds</li>
      <li>✨ Get personalized recommendations and suggestions</li>
      <li>📸 Discover beautiful photos for your destinations</li>
      <li>🔗 Share your trips with friends and family</li>
    </ul>
    <p>Ready to plan your next adventure?</p>
    <a href="${data.loginUrl}" class="button">Start Planning</a>
    <p style="margin-top: 30px;">Need help? Just reply to this email and we'll get back to you right away.</p>
  `;
  return emailLayout(content, data.unsubscribeUrl);
}

/**
 * Trip confirmation email template
 */
export function tripConfirmationEmail(
  data: TripConfirmationEmailData
): string {
  const content = `
    <h1>Your trip to ${data.tripDestination} is ready! 🎒</h1>
    <p>Hi ${data.userName},</p>
    <p>We've created your itinerary for <strong>${data.tripTitle}</strong>!</p>
    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>📍 Destination:</strong> ${data.tripDestination}</p>
      <p style="margin: 10px 0 0 0;"><strong>📅 Dates:</strong> ${data.tripStartDate} - ${data.tripEndDate}</p>
    </div>
    <p>Your trip is ready to view and customize. You can also share it with your travel companions:</p>
    <a href="${data.viewTripUrl}" class="button">View Your Trip</a>
    <p style="margin-top: 20px;"><strong>Share with friends:</strong><br/>
    <a href="${data.shareUrl}" style="color: #667eea; word-break: break-all;">${data.shareUrl}</a></p>
    <p style="margin-top: 30px;">Happy travels! 🌍</p>
  `;
  return emailLayout(content, data.unsubscribeUrl);
}

/**
 * Trip reminder email template
 */
export function tripReminderEmail(data: TripReminderEmailData): string {
  const content = `
    <h1>Your trip is coming up! ✈️</h1>
    <p>Hi ${data.userName},</p>
    <p>Just ${data.daysUntilTrip} days until your trip to <strong>${data.tripDestination}</strong>!</p>
    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>${data.tripTitle}</strong></p>
      <p style="margin: 10px 0 0 0;">Departing: ${data.tripStartDate}</p>
    </div>
    <p>Make sure you're all set:</p>
    <ul style="line-height: 1.8; color: #555;">
      <li>✅ Review your itinerary and make any final changes</li>
      <li>🎫 Book any activities or reservations</li>
      <li>🧳 Start packing (check the weather forecast!)</li>
      <li>📱 Download offline maps for your destination</li>
    </ul>
    <a href="${data.viewTripUrl}" class="button">View Your Trip</a>
    <p style="margin-top: 30px;">Have an amazing trip! 🌟</p>
  `;
  return emailLayout(content, data.unsubscribeUrl);
}

/**
 * Weather alert email template
 */
export function weatherAlertEmail(data: WeatherAlertEmailData): string {
  const content = `
    <h1>Weather update for your trip ⛅</h1>
    <p>Hi ${data.userName},</p>
    <p>We've got a weather update for your upcoming trip to <strong>${data.tripDestination}</strong>:</p>
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0;">
      <p style="margin: 0;"><strong>${data.weatherCondition}</strong></p>
      <p style="margin: 10px 0 0 0;">Temperature: ${data.temperature}</p>
      <p style="margin: 10px 0 0 0;">${data.description}</p>
    </div>
    <p>You might want to adjust your packing or plans accordingly!</p>
    <a href="${data.viewTripUrl}" class="button">View Your Trip</a>
  `;
  return emailLayout(content, data.unsubscribeUrl);
}

/**
 * Shared trip view notification email template
 */
export function sharedTripViewEmail(data: SharedTripViewEmailData): string {
  const content = `
    <h1>Someone viewed your shared trip! 👀</h1>
    <p>Hi ${data.userName},</p>
    <p>Great news! Your trip <strong>${data.tripTitle}</strong> has been viewed ${data.viewerCount} time${data.viewerCount > 1 ? 's' : ''}.</p>
    <p>Keep sharing to get feedback and inspire others:</p>
    <p><a href="${data.shareUrl}" style="color: #667eea; word-break: break-all;">${data.shareUrl}</a></p>
    <a href="${data.viewTripUrl}" class="button">View Your Trip</a>
  `;
  return emailLayout(content, data.unsubscribeUrl);
}

/**
 * Weekly digest email template
 */
export function weeklyDigestEmail(data: WeeklyDigestEmailData): string {
  const upcomingTripsHtml =
    data.upcomingTrips.length > 0
      ? `
    <h2 style="color: #333; font-size: 20px;">Your Upcoming Trips ✈️</h2>
    ${data.upcomingTrips
      .map(
        (trip) => `
      <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <p style="margin: 0; font-weight: 600;">${trip.title}</p>
        <p style="margin: 5px 0; color: #666;">📍 ${trip.destination} • 📅 ${trip.startDate}</p>
        <a href="${trip.url}" style="color: #667eea;">View trip →</a>
      </div>
    `
      )
      .join('')}
  `
      : '';

  const suggestionsHtml =
    data.suggestions.length > 0
      ? `
    <h2 style="color: #333; font-size: 20px; margin-top: 30px;">Travel Inspiration 🌍</h2>
    ${data.suggestions
      .map(
        (suggestion) => `
      <div style="margin: 20px 0;">
        <img src="${suggestion.imageUrl}" alt="${suggestion.title}" style="width: 100%; border-radius: 8px; margin-bottom: 10px;" />
        <h3 style="color: #333; font-size: 18px; margin: 10px 0;">${suggestion.title}</h3>
        <p style="color: #666; margin: 10px 0;">${suggestion.description}</p>
        <a href="${suggestion.url}" style="color: #667eea;">Learn more →</a>
      </div>
    `
      )
      .join('')}
  `
      : '';

  const content = `
    <h1>Your Weekly Travel Digest 📬</h1>
    <p>Hi ${data.userName},</p>
    <p>Here's what's happening with your trips this week:</p>
    ${upcomingTripsHtml}
    ${suggestionsHtml}
    <p style="margin-top: 30px;">Happy planning! 🗺️</p>
  `;
  return emailLayout(content, data.unsubscribeUrl);
}

/**
 * Password reset email template
 */
export function passwordResetEmail(data: PasswordResetEmailData): string {
  const content = `
    <h1>Reset Your Password 🔐</h1>
    <p>Hi ${data.userName},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <a href="${data.resetUrl}" class="button">Reset Password</a>
    <p>This link will expire in ${data.expiresIn}.</p>
    <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <strong>Didn't request this?</strong><br/>
      If you didn't request a password reset, you can safely ignore this email.
    </p>
  `;
  return emailLayout(content, data.unsubscribeUrl);
}

/**
 * Payment receipt email template
 */
export function paymentReceiptEmail(data: PaymentReceiptEmailData): string {
  const content = `
    <h1>Payment Receipt 💳</h1>
    <p>Hi ${data.userName},</p>
    <p>Thank you for your payment! Here are the details:</p>
    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Amount:</strong> ${data.amount}</p>
      <p style="margin: 10px 0 0 0;"><strong>Plan:</strong> ${data.planName}</p>
      <p style="margin: 10px 0 0 0;"><strong>Date:</strong> ${data.date}</p>
    </div>
    <a href="${data.invoiceUrl}" class="button">View Invoice</a>
    <p style="margin-top: 30px;">Thank you for being a valued OtterlyGo member! 🎉</p>
  `;
  return emailLayout(content, data.unsubscribeUrl);
}

export {
  WelcomeEmailData,
  TripConfirmationEmailData,
  TripReminderEmailData,
  WeatherAlertEmailData,
  SharedTripViewEmailData,
  WeeklyDigestEmailData,
  PasswordResetEmailData,
  PaymentReceiptEmailData,
};
