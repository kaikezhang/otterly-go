import cron from 'node-cron';
import { prisma } from '../db.js';
import { sendEmail, canSendEmail, getEmailPreferences } from '../services/emailService.js';
import {
  tripReminderEmail,
  weatherAlertEmail,
  weeklyDigestEmail,
} from '../services/emailTemplates.js';
import axios from 'axios';

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const weatherApiKey = process.env.WEATHER_API_KEY;

/**
 * Send trip reminders for trips starting in 7 days
 * Runs daily at 9:00 AM
 */
export function scheduleTripReminders() {
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('[EmailJobs] Running trip reminder job...');

      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      sevenDaysFromNow.setHours(0, 0, 0, 0);

      const eightDaysFromNow = new Date(sevenDaysFromNow);
      eightDaysFromNow.setDate(eightDaysFromNow.getDate() + 1);

      // Find trips starting in 7 days
      const trips = await prisma.trip.findMany({
        where: {
          startDate: {
            gte: sevenDaysFromNow,
            lt: eightDaysFromNow,
          },
          status: {
            in: ['planning', 'upcoming'],
          },
        },
        include: {
          user: true,
        },
      });

      console.log(`[EmailJobs] Found ${trips.length} trips with reminders to send`);

      for (const trip of trips) {
        try {
          const canSend = await canSendEmail(trip.user.id, 'trip_reminder');
          if (!canSend) continue;

          const preferences = await getEmailPreferences(trip.user.id);
          const html = tripReminderEmail({
            userName: trip.user.name || 'there',
            tripTitle: trip.title,
            tripDestination: trip.destination,
            tripStartDate: trip.startDate!.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            daysUntilTrip: 7,
            viewTripUrl: `${frontendUrl}/trips/${trip.id}`,
            unsubscribeUrl: `${frontendUrl}/email/unsubscribe?token=${preferences.unsubscribeToken}`,
          });

          await sendEmail({
            to: trip.user.email,
            subject: `Your trip to ${trip.destination} is coming up! ✈️`,
            html,
            userId: trip.user.id,
            tripId: trip.id,
            emailType: 'trip_reminder',
          });

          console.log(`[EmailJobs] Sent trip reminder to ${trip.user.email} for trip ${trip.id}`);
        } catch (error) {
          console.error(`[EmailJobs] Failed to send trip reminder for trip ${trip.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[EmailJobs] Error in trip reminder job:', error);
    }
  });

  console.log('[EmailJobs] Trip reminder job scheduled (daily at 9:00 AM)');
}

/**
 * Send weather alerts for trips starting in the next 3 days
 * Runs daily at 8:00 AM
 */
export function scheduleWeatherAlerts() {
  cron.schedule('0 8 * * *', async () => {
    if (!weatherApiKey) {
      console.log('[EmailJobs] Weather API key not configured, skipping weather alerts');
      return;
    }

    try {
      console.log('[EmailJobs] Running weather alert job...');

      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // Find trips starting in the next 3 days
      const trips = await prisma.trip.findMany({
        where: {
          startDate: {
            gte: now,
            lte: threeDaysFromNow,
          },
          status: {
            in: ['planning', 'upcoming'],
          },
        },
        include: {
          user: true,
        },
      });

      console.log(`[EmailJobs] Found ${trips.length} trips to check weather for`);

      for (const trip of trips) {
        try {
          const canSend = await canSendEmail(trip.user.id, 'weather_alert');
          if (!canSend) continue;

          // Fetch weather data from OpenWeatherMap API
          const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(trip.destination)}&units=metric&appid=${weatherApiKey}`
          );

          const weather = response.data;
          const temp = Math.round(weather.main.temp);
          const condition = weather.weather[0].main;
          const description = weather.weather[0].description;

          // Send alert for extreme weather conditions
          const extremeConditions = ['Rain', 'Thunderstorm', 'Snow', 'Extreme'];
          if (extremeConditions.includes(condition) || temp < 0 || temp > 35) {
            const preferences = await getEmailPreferences(trip.user.id);
            const html = weatherAlertEmail({
              userName: trip.user.name || 'there',
              tripTitle: trip.title,
              tripDestination: trip.destination,
              weatherCondition: condition,
              temperature: `${temp}°C`,
              description: description.charAt(0).toUpperCase() + description.slice(1),
              viewTripUrl: `${frontendUrl}/trips/${trip.id}`,
              unsubscribeUrl: `${frontendUrl}/email/unsubscribe?token=${preferences.unsubscribeToken}`,
            });

            await sendEmail({
              to: trip.user.email,
              subject: `Weather update for your trip to ${trip.destination} ⛅`,
              html,
              userId: trip.user.id,
              tripId: trip.id,
              emailType: 'weather_alert',
            });

            console.log(`[EmailJobs] Sent weather alert to ${trip.user.email} for trip ${trip.id}`);
          }
        } catch (error) {
          console.error(`[EmailJobs] Failed to send weather alert for trip ${trip.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[EmailJobs] Error in weather alert job:', error);
    }
  });

  console.log('[EmailJobs] Weather alert job scheduled (daily at 8:00 AM)');
}

/**
 * Send weekly digest emails
 * Runs every Monday at 10:00 AM
 */
export function scheduleWeeklyDigest() {
  cron.schedule('0 10 * * 1', async () => {
    try {
      console.log('[EmailJobs] Running weekly digest job...');

      const now = new Date();
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

      // Get all users with email digest enabled
      const preferences = await prisma.emailPreferences.findMany({
        where: {
          weeklyDigest: true,
        },
        include: {
          user: {
            include: {
              trips: {
                where: {
                  startDate: {
                    gte: now,
                    lte: oneMonthFromNow,
                  },
                  archivedAt: null,
                },
                orderBy: {
                  startDate: 'asc',
                },
                take: 3,
              },
            },
          },
        },
      });

      console.log(`[EmailJobs] Sending weekly digest to ${preferences.length} users`);

      for (const pref of preferences) {
        try {
          const user = pref.user;
          if (!user) continue;

          const canSend = await canSendEmail(user.id, 'weekly_digest');
          if (!canSend) continue;

          // Prepare upcoming trips data
          const upcomingTrips = user.trips.map((trip) => ({
            title: trip.title,
            destination: trip.destination,
            startDate: trip.startDate!.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            url: `${frontendUrl}/trips/${trip.id}`,
          }));

          // Sample travel suggestions (in production, this could be personalized based on user's past trips)
          const suggestions = [
            {
              title: '10 Hidden Gems in Southeast Asia',
              description: 'Discover off-the-beaten-path destinations that most travelers miss.',
              imageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80',
              url: `${frontendUrl}/inspiration/southeast-asia`,
            },
            {
              title: 'Budget Travel Tips for 2024',
              description: 'Learn how to travel more while spending less with these expert tips.',
              imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
              url: `${frontendUrl}/inspiration/budget-travel`,
            },
          ];

          const html = weeklyDigestEmail({
            userName: user.name || 'there',
            upcomingTrips,
            suggestions,
            unsubscribeUrl: `${frontendUrl}/email/unsubscribe?token=${pref.unsubscribeToken}`,
          });

          await sendEmail({
            to: user.email,
            subject: 'Your Weekly Travel Digest 📬',
            html,
            userId: user.id,
            emailType: 'weekly_digest',
          });

          console.log(`[EmailJobs] Sent weekly digest to ${user.email}`);
        } catch (error) {
          console.error(`[EmailJobs] Failed to send weekly digest to user ${pref.userId}:`, error);
        }
      }
    } catch (error) {
      console.error('[EmailJobs] Error in weekly digest job:', error);
    }
  });

  console.log('[EmailJobs] Weekly digest job scheduled (Mondays at 10:00 AM)');
}

/**
 * Initialize all scheduled email jobs
 */
export function initializeEmailJobs() {
  scheduleTripReminders();
  scheduleWeatherAlerts();
  scheduleWeeklyDigest();
  console.log('[EmailJobs] All email jobs initialized successfully');
}
