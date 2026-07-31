import winston from 'winston';

const transports: winston.transport[] = [
  new winston.transports.Console()
];

// Only add file transports if not in a serverless environment (like Vercel)
if (!process.env.VERCEL) {
  try {
    transports.push(
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' })
    );
  } catch (_) {
    // Ignore file logging errors on read-only environments
  }
}

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports,
});
