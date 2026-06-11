/**
 * Structured logging for better observability.
 * Logs are output in JSON format for easy parsing and analysis.
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  [key: string]: string | number | boolean | null | undefined;
}

interface LogEntry {
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

class Logger {
  private readonly minLevel: LogLevel;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    this.minLevel =
      envLevel === 'debug'
        ? LogLevel.DEBUG
        : envLevel === 'warn'
          ? LogLevel.WARN
          : envLevel === 'error'
            ? LogLevel.ERROR
            : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const levelIndex = levels.indexOf(level);
    const minIndex = levels.indexOf(this.minLevel);
    return levelIndex >= minIndex;
  }

  private write(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const output = JSON.stringify(entry);

    if (entry.level === LogLevel.ERROR) {
      console.error(output);
    } else if (entry.level === LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message,
      context,
    });
  }

  info(message: string, context?: LogContext): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      context,
    });
  }

  warn(message: string, context?: LogContext): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      context,
    });
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }
}

export const logger = new Logger();

export function logApiRequest(
  path: string,
  method: string,
  statusCode: number,
  duration: number,
  context?: LogContext,
): void {
  logger.info('API request completed', {
    type: 'api_request',
    path,
    method,
    statusCode,
    durationMs: duration,
    ...context,
  });
}

export function logAiProcessing(
  operation: string,
  model: string,
  inputChars: number,
  duration: number,
  success: boolean,
  context?: LogContext,
): void {
  logger.info('AI processing completed', {
    type: 'ai_processing',
    operation,
    model,
    inputChars,
    durationMs: duration,
    success,
    ...context,
  });
}

export function logCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'delete',
  key: string,
  ttlSeconds?: number,
): void {
  logger.debug('Cache operation', {
    type: 'cache_operation',
    operation,
    key,
    ttlSeconds,
  });
}

export function logDatabaseQuery(
  query: string,
  duration: number,
  rowCount?: number,
  error?: Error,
): void {
  if (error) {
    logger.error('Database query failed', error, {
      type: 'database_query',
      query,
      durationMs: duration,
    });
  } else {
    logger.debug('Database query completed', {
      type: 'database_query',
      query,
      durationMs: duration,
      rowCount,
    });
  }
}

export function logRateLimitCheck(
  key: string,
  allowed: boolean,
  remaining: number,
  context?: LogContext,
): void {
  logger.info('Rate limit check', {
    type: 'rate_limit',
    key,
    allowed,
    remaining,
    ...context,
  });
}

export function logCircuitBreakerEvent(
  event: 'opened' | 'closed' | 'half_open' | 'rejected',
  service: string,
  context?: LogContext,
): void {
  logger.warn('Circuit breaker event', {
    type: 'circuit_breaker',
    event,
    service,
    ...context,
  });
}
