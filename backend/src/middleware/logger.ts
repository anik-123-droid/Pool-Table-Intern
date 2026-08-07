import winston from 'winston';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create Winston Logger
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: logFormat,
  transports: [
    // Write all logs with importance level of `error` or higher to `error.log`
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    // Write all logs with importance level of `info` or higher to `combined.log`
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
  ],
});

// If we're not in production then log to the `console`
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create a stream object with a 'write' function that will be used by `morgan`
const stream = {
  write: (message: string) => {
    // Use the 'info' log level so the output will be picked up by both transports
    logger.info(message.trim());
  },
};

// Morgan middleware to log HTTP requests
export const morganMiddleware = morgan(
  (tokens, req, res) => {
    // Basic formatting
    const msg = [
      tokens['remote-addr'](req, res),
      '-',
      tokens['remote-user'](req, res),
      `[${tokens.date(req, res, 'clf')}]`,
      `"${tokens.method(req, res)} ${tokens.url(req, res)} HTTP/${tokens['http-version'](req, res)}"`,
      tokens.status(req, res),
      tokens.res(req, res, 'content-length'),
      `"${tokens.referrer(req, res)}"`,
      `"${tokens['user-agent'](req, res)}"`
    ].join(' ');

    // Check for sensitive body data and log a redacted version if body exists
    const anyReq = req as any;
    if (anyReq.body && Object.keys(anyReq.body).length > 0) {
      const redactedBody = { ...anyReq.body };
      if (redactedBody.password) {
        redactedBody.password = '***REDACTED***';
      }
      if (redactedBody.currentPassword) {
        redactedBody.currentPassword = '***REDACTED***';
      }
      return `${msg} - Body: ${JSON.stringify(redactedBody)}`;
    }

    return msg;
  },
  { stream }
);
