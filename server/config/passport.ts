import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../db.js';

// Configure Google OAuth Strategy
export function configurePassport() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract Google profile information
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName;
          const picture = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in Google profile'));
          }

          // Find or create user
          let user = await prisma.user.findUnique({
            where: { googleId },
          });

          if (!user) {
            // Check if user exists with this email (for migration from temp users)
            user = await prisma.user.findUnique({
              where: { email },
            });

            if (user) {
              // Update existing user with Google ID
              user = await prisma.user.update({
                where: { email },
                data: {
                  googleId,
                  name,
                  picture,
                },
              });
            } else {
              // Create new user
              user = await prisma.user.create({
                data: {
                  email,
                  googleId,
                  name,
                  picture,
                  subscriptionTier: 'free',
                },
              });
            }
          } else {
            // Update user info from Google (in case it changed)
            user = await prisma.user.update({
              where: { googleId },
              data: {
                name,
                picture,
              },
            });
          }

          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );

  // Since we're using JWT tokens instead of sessions, we don't need
  // serialize/deserialize, but Passport requires them
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}
