import { redactSecrets } from "@/lib/virtualizor/errors";
import { getRedactionSecrets } from "@/lib/virtualizor/config";

/**
 * Small structured logger with secret redaction.
 *
 * We deliberately never log request URLs (they contain credentials in the
 * query string) and never log response bodies.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function activeLevel(): LogLevel {
  const configured = (process.env.VANTAGE_LOG_LEVEL ?? "info").trim().toLowerCase();
  if (configured === "debug" || configured === "info" || configured === "warn" || configured === "error") {
    return configured;
  }
  return "info";
}

export interface LogFields {
  requestId?: string;
  action?: string;
  code?: string;
  status?: number;
  durationMs?: number;
  vpsId?: string;
  actor?: string;
  [key: string]: unknown;
}

function sanitize(value: unknown, secrets: readonly string[]): unknown {
  if (typeof value === "string") return redactSecrets(value, secrets);
  if (Array.isArray(value)) return value.map((entry) => sanitize(entry, secrets));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (/pass|secret|key|token|authorization|cookie/i.test(key)) {
        output[key] = "[redacted]";
      } else {
        output[key] = sanitize(nested, secrets);
      }
    }
    return output;
  }
  return value;
}

function emit(level: LogLevel, message: string, fields?: LogFields): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[activeLevel()]) return;
  const secrets = getRedactionSecrets();
  const safeMessage = redactSecrets(message, secrets);
  const safeFields = fields ? (sanitize(fields, secrets) as LogFields) : undefined;
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    message: safeMessage,
    ...(safeFields ?? {}),
  });
  if (level === "error") {
    // eslint-disable-next-line no-console -- the structured logger is the single sanctioned output sink
    console.error(line);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console -- the structured logger is the single sanctioned output sink
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console -- the structured logger is the single sanctioned output sink
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
};
