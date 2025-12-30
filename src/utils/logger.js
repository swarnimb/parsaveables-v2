import winston from 'winston';

/**
 * Create a contextual logger instance for a specific service
 *
 * @param {string} context - Service name (e.g., 'EmailService', 'VisionService')
 * @returns {Object} Winston logger instance with context
 */
export function createLogger(context) {
  const { combine, timestamp, printf, colorize, errors } = winston.format;

  // Custom log format: [timestamp] [context] level: message {metadata}
  const logFormat = printf(({ level, message, timestamp, context, ...metadata }) => {
    let log = `${timestamp} [${context}] ${level}: ${message}`;

    // Append metadata if present
    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }

    return log;
  });

  // Create logger instance with context
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      errors({ stack: true }), // Include stack trace for errors
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
    defaultMeta: { context },
    transports: [
      // Console output (always enabled)
      new winston.transports.Console({
        format: combine(
          colorize({ all: true }),
          logFormat
        )
      })
    ]
  });

  // Add file transports in production (but not in serverless environments)
  // Vercel serverless functions have read-only filesystem, so we skip file logging
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (process.env.NODE_ENV === 'production' && !isServerless) {
    logger.add(new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }));

    logger.add(new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }));
  }

  return logger;
}

export default { createLogger };
