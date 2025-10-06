import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import chatRouter from './routes/chat.js';
import healthRouter from './routes/health.js';
import tripsRouter from './routes/trips.js';
import authRouter from './routes/auth.js';
import { configurePassport } from './config/passport.js';

dotenv.config();

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
