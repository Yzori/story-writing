import "server-only";

/**
 * Structured logger for production observability.
 * Outputs JSON in production, pretty-prints in development.
 * Drop-in replacement for console.error/warn/info in API routes.
 *
 * When Sentry or another error tracker is added, hook into `logger.error`.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV !== "production";

function formatEntry(entry: LogEntry): string {
  if (isDev) {
    const { level, message, timestamp, ...extra } = entry;
    const extraStr = Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : "";
    return `[${level.toUpperCase()}] ${message}${extraStr}`;
  }
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const output = formatEntry(entry);

  switch (level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "debug":
      if (isDev) console.debug(output);
      break;
    default:
      console.log(output);
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),

  /** Log an Error object with stack trace. */
  captureError: (message: string, error: unknown, meta?: Record<string, unknown>) => {
    const errorMeta: Record<string, unknown> = {
      ...meta,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    log("error", message, errorMeta);
  },
};
