import { AppError } from "./errors";

/**
 * In-memory sliding-window rate limiting.
 *
 * This is a best-effort control for a stateless/serverless deployment. It
 * protects against casual abuse within a single instance; it is not a
 * distributed guarantee. When `KV_REST_API_URL`/`KV_REST_API_TOKEN` are
 * configured a durable limiter can be layered on top.
 *
 * Client identity is derived from platform-provided forwarded headers. We
 * prefer `x-vercel-forwarded-for` (set by the platform and not client
 * controlled) over the raw `x-forwarded-for` chain.
 */

export interface RateLimitRule {
  max: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

const store = new Map<string, number[]>();

function readInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function getMutationRule(): RateLimitRule {
  return {
    max: readInt(process.env.RATE_LIMIT_MUTATION_MAX, 60, 1, 10_000),
    windowSeconds: readInt(process.env.RATE_LIMIT_MUTATION_WINDOW_S, 60, 1, 3_600),
  };
}

export function getLoginRule(): RateLimitRule {
  return {
    max: readInt(process.env.RATE_LIMIT_LOGIN_MAX, 8, 1, 1_000),
    windowSeconds: readInt(process.env.RATE_LIMIT_LOGIN_WINDOW_S, 300, 1, 86_400),
  };
}

export function getClientKey(headers: Headers): string {
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const first = parts[0];
    if (first) return first;
  }
  return "unknown";
}

export function consumeRateLimit(key: string, rule: RateLimitRule, now = Date.now()): RateLimitResult {
  const windowMs = rule.windowSeconds * 1000;
  const cutoff = now - windowMs;
  const existing = store.get(key) ?? [];
  const recent = existing.filter((timestamp) => timestamp > cutoff);

  if (recent.length >= rule.max) {
    const oldest = recent[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    store.set(key, recent);
    return { allowed: false, limit: rule.max, remaining: 0, retryAfterSeconds };
  }

  recent.push(now);
  store.set(key, recent);
  return { allowed: true, limit: rule.max, remaining: rule.max - recent.length, retryAfterSeconds: 0 };
}

export function enforceRateLimit(key: string, rule: RateLimitRule): void {
  const result = consumeRateLimit(key, rule);
  if (!result.allowed) {
    throw new AppError({
      code: "RATE_LIMITED",
      message: "Too many requests. Please slow down and try again shortly.",
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
}

/** Test helper: clear all counters. */
export function resetRateLimits(): void {
  store.clear();
}

/** Test helper: inspect the number of tracked keys. */
export function rateLimitStoreSize(): number {
  return store.size;
}
