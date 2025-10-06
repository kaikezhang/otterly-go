import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';
import chatRouter from './routes/chat.js';
import healthRouter from './routes/health.js';
import tripsRouter from './routes/trips.js';
import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';
import mapRouter from './routes/map.js';
import photosRouter from './routes/photos.js';
import shareRouter from './routes/share.js';
import { configurePassport } from './config/passport.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (one level up from server/)
const envPath = path.join(__dirname, '..', '.env');
console.log('📂 Loading .env from:', envPath);

const dotenvResult = dotenv.config({
  path: envPath,
  override: true,  // Override any existing env vars
  debug: true      // Enable debug logging
});

if (dotenvResult.error) {
  console.error('❌ Error loading .env:', dotenvResult.error);
} else {
  console.log('✅ Loaded', Object.keys(dotenvResult.parsed || {}).length, 'environment variables');
}

console.log('\n🔧 Environment check:');
console.log('- GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Missing');
console.log('- GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Missing');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ Missing');
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL || '✗ Using default');
console.log();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure Passport
configurePassport();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(passport.initialize());

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

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📡 Accepting requests from ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});
