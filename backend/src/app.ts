import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars before anything else
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import donationRoutes from './routes/donation.routes';
import requestRoutes from './routes/request.routes';
import communityRoutes from './routes/community.routes';
import staffRoutes from './routes/staff.routes';
import wigmakerRoutes from './routes/wigmaker.routes';
import adminRoutes from './routes/admin.routes';
import profileRoutes from './routes/profile.routes';
import monetaryRoutes from './routes/monetary.routes';
import referralRoutes from './routes/referral.routes';
import partnershipRoutes from './routes/partnership.routes';
import publicRoutes from './routes/public.routes';
import notificationRoutes from './routes/notification.routes';
import eventsRoutes from './routes/events.routes';
import calendarRoutes from './routes/calendar.routes';
import demoRoutes from './routes/demo.routes';

const app = express();

// ── Security ──
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175'
  ],
  credentials: true,
}));

// ── Rate Limiting ──
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many auth attempts, please try again later.' },
});

// ── Body Parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Routes ──
app.get('/', (_req, res) => {
  res.json({ message: 'HairLink API is running', documentation: '/health' });
});

app.use('/auth', authLimiter, authRoutes);

// Internal API routes (web frontend)
app.use('/internal-api/donations', donationRoutes);
app.use('/internal-api/requests', requestRoutes);
app.use('/internal-api/community', communityRoutes);
app.use('/internal-api/staff', staffRoutes);
app.use('/internal-api/wigmaker', wigmakerRoutes);
app.use('/internal-api/admin', adminRoutes);
app.use('/internal-api/profile', profileRoutes);
app.use('/internal-api/monetary', monetaryRoutes);
app.use('/internal-api/referral', referralRoutes);
app.use('/internal-api/partnerships', partnershipRoutes);
app.use('/internal-api/notifications', notificationRoutes);
app.use('/api/public', publicRoutes);

// Mobile API routes (React Native — same controllers, /api prefix)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/monetary', monetaryRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/calendar', calendarRoutes);
// Dev-only demo auth helper
app.use('/auth', demoRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error Handler (MUST be last) ──
app.use(errorHandler);

export default app;
