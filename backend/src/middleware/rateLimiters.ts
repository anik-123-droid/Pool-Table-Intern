import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Redis client if URL is provided
const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
let redisClient: Redis | undefined;

if (redisUrl) {
  try {
    redisClient = new Redis(redisUrl);
    console.log('Redis initialized for Rate Limiting');
  } catch (error) {
    console.error('Failed to initialize Redis for Rate Limiting:', error);
  }
}

// Common store configuration
const getStore = (prefix: string) => {
  if (redisClient) {
    return new RedisStore({
      // @ts-expect-error - Known issue with ioredis and rate-limit-redis typings
      sendCommand: (...args: string[]) => redisClient!.call(...args),
      prefix: prefix,
    });
  }
  return undefined; // Falls back to default memory store if Redis is not configured
};

// General API rate limiter (100 requests per 15 minutes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:api:'),
});

// Stricter rate limiter for Authentication routes (10 requests per minute)
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute
  message: { success: false, message: 'Too many authentication attempts, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:auth:'),
});

// Stricter rate limiter for Booking creation (10 requests per minute)
export const bookingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute
  message: { success: false, message: 'Too many booking requests, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:booking:'),
});
