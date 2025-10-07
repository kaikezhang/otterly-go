import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import pinoHttp from 'pino-http';
import chatRouter from './routes/chat.js';
import healthRouter from './routes/health.js';
import tripsRouter from './routes/trips.js';
import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';
import mapRouter from './routes/map.js';
import photosRouter from './routes/photos.js';
import shareRouter from './routes/share.js';
import subscriptionsRouter from './routes/subscriptions.js';
import webhooksRouter from './routes/webhooks.js';
import adminRouter from './routes/admin.js';
import emailRouter from './routes/email.js';
import emailImportRouter from './routes/emailImport.js';
import { configurePassport } from './config/passport.js';
import { logger } from './utils/logger.js';
import { initializeEmailJobs } from './jobs/emailJobs.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (one level up from server/)
const envPath = path.join(__dirname, '..', '.env');
logger.info({ envPath }, 'Loading environment variables');

const dotenvResult = dotenv.config({
  path: envPath,
  override: true,  // Override any existing env vars
  debug: false     // Disable console debug logging (we use structured logging now)
});

if (dotenvResult.error) {
  logger.error({ error: dotenvResult.error }, 'Failed to load .env file');
} else {
  logger.info(
    { count: Object.keys(dotenvResult.parsed || {}).length },
    'Environment variables loaded'
  );
}

// Log environment configuration status
logger.info({
  googleClientId: !!process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
  jwtSecret: !!process.env.JWT_SECRET,
  frontendUrl: process.env.FRONTEND_URL || 'default',
}, 'Environment configuration check');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure Passport
configurePassport();

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Vite dev mode
        "https://accounts.google.com",
        "https://js.stripe.com",
        "https://api.mapbox.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled components and Vite
        "https://api.mapbox.com",
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://images.unsplash.com",
        "https://*.mapbox.com",
        "https://lh3.googleusercontent.com" // Google profile photos
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://api.mapbox.com"
      ],
      connectSrc: [
        "'self'",
        "https://api.mapbox.com",
        "https://events.mapbox.com",
        "https://accounts.google.com",
        "https://api.stripe.com"
      ],
      frameSrc: [
        "https://accounts.google.com",
        "https://js.stripe.com"
      ],
      workerSrc: ["'self'", "blob:"]
    }
  },
  crossOriginEmbedderPolicy: false, // Required for external images
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 600 // 10 minutes
}));

// Webhook routes MUST come before express.json() to preserve raw body
app.use('/api/webhooks', webhooksRouter);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(passport.initialize());

// Request logging middleware
app.use(pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url?.startsWith('/health/'),
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) {
      return 'error';
    } else if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },
}));

// Health check routes
app.use(healthRouter);

// API routes
app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/user', userRouter);
app.use('/api/map', mapRouter);
app.use('/api/photos', photosRouter);
app.use('/api/share', shareRouter); // Public share links (no auth required)
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/email', emailRouter); // Email preferences and unsubscribe
app.use('/api/email-import', emailImportRouter); // Email import and parsing (Milestone 5.1)
app.use('/api/admin', adminRouter); // Admin-only endpoints

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(
    {
      err,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
    },
    'Request error'
  );

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
      nodeEnv: process.env.NODE_ENV || 'development',
    },
    'API server started'
  );

  // Initialize scheduled email jobs
  initializeEmailJobs();
});
