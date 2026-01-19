import winston from 'winston';

// Define the log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // Include stack trace for errors
  winston.format.splat(),
  winston.format.json() // Use JSON format for easy ingestion by external tools
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug', // Log 'info' and above in production
  format: logFormat,
  transports: [
    // Output to console for local visibility
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Add color for console readability
        winston.format.simple()
      )
    }),
    // In production, you might add a file transport or a dedicated service transport
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});

export default logger;