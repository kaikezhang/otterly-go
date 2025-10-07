// Test trip confirmation email
import { PrismaClient } from '@prisma/client';
import { sendEmail, getEmailPreferences } from './server/services/emailService.js';
import { tripConfirmationEmail } from './server/services/emailTemplates.js';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function testTripEmail() {
  console.log('🧪 Testing trip confirmation email...\n');

  try {
    // Get or create a test user
    let user = await prisma.user.findFirst();

    if (!user) {
      console.log('No users found. Please sign up in the app first.');
      process.exit(1);
    }

    console.log('✅ Found user:', user.email);

    // Get email preferences
    const preferences = await getEmailPreferences(user.id);
    console.log('✅ Email preferences loaded');

    // Create test trip data
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareToken = 'test-share-token-' + Date.now();

    const html = tripConfirmationEmail({
      userName: user.name || 'there',
      tripTitle: 'Test Trip to Tokyo',
      tripDestination: 'Tokyo, Japan',
      tripStartDate: 'December 1, 2025',
      tripEndDate: 'December 10, 2025',
      shareUrl: `${frontendUrl}/share/${shareToken}`,
      viewTripUrl: `${frontendUrl}/trips/test-trip-id`,
      unsubscribeUrl: `${frontendUrl}/email/unsubscribe?token=${preferences.unsubscribeToken}`,
    });

    console.log('\n📧 Sending trip confirmation email...');

    const result = await sendEmail({
      to: user.email,
      subject: 'Your trip to Tokyo is ready! 🎒',
      html,
      userId: user.id,
      tripId: 'test-trip-id',
      emailType: 'trip_confirmation',
    });

    console.log('✅ Email sent successfully!');
    console.log('📬 Email ID:', result.emailId);

    // Check email logs
    const emailLogs = await prisma.emailLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    console.log('\n📊 Recent email logs:');
    emailLogs.forEach((log, i) => {
      console.log(`${i + 1}. ${log.emailType} - ${log.status} - ${log.subject}`);
    });

    console.log('\n🎉 Success! Check:');
    console.log('1. Your email inbox:', user.email);
    console.log('2. Prisma Studio: http://localhost:5556 → email_logs table');
    console.log('3. Resend Dashboard: https://resend.com/emails\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testTripEmail();
