import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { apiLimiter } from './middleware/rateLimiters';
import { sanitizeInput } from './middleware/sanitize';
import { errorHandler } from './middleware/errorHandler';
import { morganMiddleware } from './middleware/logger';

import authRoutes from './routes/authRoutes';
import tableRoutes from './routes/tableRoutes';
import bookingRoutes from './routes/bookingRoutes';
import userRoutes from './routes/userRoutes';
import tournamentRoutes from './routes/tournamentRoutes';
import notificationRoutes from './routes/notificationRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import waitlistRoutes from './routes/waitlistRoutes';
import snackbarRoutes from './routes/snackbarRoutes';
import adminRoutes from './routes/adminRoutes';
import orderRoutes from './routes/orderRoutes';

const app = express();

// Required for rate limiting behind a reverse proxy (like Vercel)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com", "https://www.google.com/recaptcha/"],
      frameSrc: ["'self'", "https://challenges.cloudflare.com", "https://www.google.com/recaptcha/"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*", "https://pool-table-opal.vercel.app"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Often causes issues with third-party scripts if true
}));

// Rate Limiting (General API)
app.use('/api', apiLimiter);

// HTTP Request Logging
app.use(morganMiddleware);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://pool-table-opal.vercel.app'
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Payload Size Limiting
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// Data Sanitization
app.use(sanitizeInput);
app.use(cookieParser());

// Function to mount routes
const mountRoutes = (prefix: string) => {
  app.use(`${prefix}auth`, authRoutes);
  app.use(`${prefix}tables`, tableRoutes);
  app.use(`${prefix}bookings`, bookingRoutes);
  app.use(`${prefix}users`, userRoutes);
  app.use(`${prefix}tournaments`, tournamentRoutes);
  app.use(`${prefix}notifications`, notificationRoutes);
  app.use(`${prefix}inventory`, inventoryRoutes);
  app.use(`${prefix}subscriptions`, subscriptionRoutes);
  app.use(`${prefix}waitlist`, waitlistRoutes);
  app.use(`${prefix}snackbar`, snackbarRoutes);
  app.use(`${prefix}admin`, adminRoutes);
  app.use(`${prefix}orders`, orderRoutes);
};

// Mount on /api (for local dev)
mountRoutes('/api/');
// Mount on / (in case Vercel strips /api due to routePrefix)
mountRoutes('/');

// Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

import prisma from './utils/prisma';
import { initSocket } from './utils/socket';

if (process.env.NODE_ENV !== 'production') {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initSocket(server);

    // Slowloris Mitigation: Set explicit timeouts
    server.keepAliveTimeout = 5000; // 5 seconds
    server.headersTimeout = 6000; // 6 seconds (must be larger than keepAliveTimeout)

    // Background task to process scheduled maintenance tables automatically
    setInterval(async () => {
      try {
        const now = new Date();
        const scheduledTables = await prisma.poolTable.findMany({ where: { status: 'maintenance_scheduled' } });
        for (const table of scheduledTables) {
          const hasFuture = await prisma.booking.findFirst({
            where: { tableId: table.id, status: 'confirmed', endTime: { gt: now } }
          });
          if (!hasFuture) {
            await prisma.poolTable.update({
              where: { id: table.id },
              data: { status: 'maintenance' }
            });
          }
        }
      } catch (err) {
        console.error('Maintenance background task error:', err);
      }
    }, 60000); // Check every minute
  });
}

export default app;
