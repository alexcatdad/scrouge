/**
 * Structured Logger for Convex Functions
 * 
 * Provides consistent, structured logging with severity levels,
 * context, and metadata for better observability.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  /** Unique request/operation identifier */
  requestId?: string;
  /** User ID if authenticated */
  userId?: string;
  /** Operation/function name */
  operation?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Format a log entry as JSON for structured logging
 */
function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Create a log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return entry;
}

/**
 * Logger class for structured logging
 */
class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "production") return;
    
    const entry = createLogEntry("debug", message, {
      ...this.context,
      ...context,
    });
    console.debug(formatLogEntry(entry));
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    const entry = createLogEntry("info", message, {
      ...this.context,
      ...context,
    });
    console.info(formatLogEntry(entry));
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    const entry = createLogEntry("warn", message, {
      ...this.context,
      ...context,
    });
    console.warn(formatLogEntry(entry));
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const entry = createLogEntry(
      "error",
      message,
      { ...this.context, ...context },
      error
    );
    console.error(formatLogEntry(entry));
  }
}

/**
 * Create a logger instance with optional context
 */
export function createLogger(context?: LogContext): Logger {
  return new Logger(context);
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Helper to log operation timing
 */
export function logTiming(
  logger: Logger,
  operation: string,
  startTime: number,
  context?: LogContext
): void {
  const duration = Date.now() - startTime;
  logger.info(`${operation} completed`, {
    ...context,
    operation,
    durationMs: duration,
  });
}

/**
 * Helper to create a request-scoped logger
 */
export function createRequestLogger(
  operation: string,
  userId?: string
): Logger {
  return createLogger({
    requestId: crypto.randomUUID(),
    operation,
    userId,
  });
}

