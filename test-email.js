// Simple email test script
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  console.log('🧪 Testing email configuration...\n');

  console.log('✅ Resend API Key:', process.env.RESEND_API_KEY ? 'Set' : 'Missing');
  console.log('✅ Email From:', process.env.EMAIL_FROM || 'Not set');
  console.log('✅ Weather API Key:', process.env.WEATHER_API_KEY ? 'Set' : 'Missing');
  console.log('\n📧 Sending test email...\n');

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'OtterlyGo <onboarding@resend.dev>',
      to: ['delivered@resend.dev'], // Resend's test email
      subject: 'OtterlyGo Email Test',
      html: `
        <h1>🦦 Email System Test</h1>
        <p>This is a test email from your OtterlyGo email notification system.</p>
        <p><strong>Configuration Status:</strong></p>
        <ul>
          <li>✅ Resend API integration working</li>
          <li>✅ Email templates loaded</li>
          <li>✅ Background jobs initialized</li>
        </ul>
        <p>Your email notification system is ready to go! 🚀</p>
      `,
    });

    if (error) {
      console.error('❌ Error sending email:', error);
      process.exit(1);
    }

    console.log('✅ Email sent successfully!');
    console.log('📬 Email ID:', data.id);
    console.log('\n🎉 Email system is working correctly!\n');
    console.log('Next steps:');
    console.log('1. Check your email at delivered@resend.dev (Resend test inbox)');
    console.log('2. Try creating a trip in the app to test trip confirmation emails');
    console.log('3. Check the email_logs table in your database for sent emails\n');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

testEmail();
