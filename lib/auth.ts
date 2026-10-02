/**
 * Dashboard authentication.
 *
 * The Virtualizor credentials are NEVER the browser authentication mechanism.
 * The dashboard has its own shared password (`DASHBOARD_PASSWORD`) and a
 * signed, HttpOnly session cookie derived from `AUTH_SECRET`.
 *
 * This module is isomorphic (Edge middleware + Node route handlers) and relies
 * only on Web Crypto.
 */

export const SESSION_COOKIE = "vantage_session";

export type AuthMode = "enabled" | "dev-open" | "blocked";

export interface AuthConfig {
  mode: AuthMode;
  /** Human readable reason when the mode is `blocked`. */
  reason?: string;
  sessionSeconds: number;
}

/** Environment bag accepted by the auth helpers (a plain key/value map). */
export type AuthEnv = Record<string, string | undefined>;

function readEnv(env: AuthEnv, key: string): string | undefined {
  const value = env[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isProduction(nodeEnv: string | undefined): boolean {
  return nodeEnv === "production";
}

export function getAuthConfig(
  env: AuthEnv = process.env,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): AuthConfig {
  const password = readEnv(env, "DASHBOARD_PASSWORD");
  const secret = readEnv(env, "AUTH_SECRET");
  const hours = Number.parseInt(readEnv(env, "AUTH_SESSION_HOURS") ?? "12", 10);
  const sessionHours = Number.isFinite(hours) && hours > 0 ? Math.min(hours, 24 * 30) : 12;
  const sessionSeconds = sessionHours * 3600;

  if (!password && !secret) {
    if (isProduction(nodeEnv)) {
      return {
        mode: "blocked",
        reason:
          "Dashboard authentication is not configured. Set DASHBOARD_PASSWORD and AUTH_SECRET before deploying to production.",
        sessionSeconds,
      };
    }
    return { mode: "dev-open", sessionSeconds };
  }

  if (password && !secret) {
    return {
      mode: "blocked",
      reason: "AUTH_SECRET is required to sign sessions. Generate one with: openssl rand -hex 32.",
      sessionSeconds,
    };
  }

  if (!password && secret) {
    return {
      mode: "blocked",
      reason: "DASHBOARD_PASSWORD is required when AUTH_SECRET is configured.",
      sessionSeconds,
    };
  }

  return { mode: "enabled", sessionSeconds };
}

function getSecret(env: AuthEnv = process.env): string | undefined {
  return readEnv(env, "AUTH_SECRET");
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(signature);
}

/** Constant-time string comparison (length-checked, then XOR accumulate). */
export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  let difference = aBytes.length ^ bBytes.length;
  const length = Math.max(aBytes.length, bBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (aBytes[index] ?? 0) ^ (bBytes[index] ?? 0);
  }
  return difference === 0;
}

interface SessionPayload {
  exp: number;
  iat: number;
}

/** Create a signed session token valid for the configured lifetime. */
export async function createSessionToken(
  sessionSeconds: number,
  env: AuthEnv = process.env,
): Promise<string | undefined> {
  const secret = getSecret(env);
  if (!secret) return undefined;
  const now = Date.now();
  const payload: SessionPayload = { exp: now + sessionSeconds * 1000, iat: now };
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmac(secret, body);
  return `${body}.${toBase64Url(signature)}`;
}

/** Verify a session token. Returns true only when the signature and expiry are valid. */
export async function verifySessionToken(
  token: string | undefined,
  env: AuthEnv = process.env,
): Promise<boolean> {
  if (!token) return false;
  const secret = getSecret(env);
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [body, signature] = parts;
  if (!body || !signature) return false;

  const expected = await hmac(secret, body);
  let provided: Uint8Array;
  try {
    provided = fromBase64Url(signature);
  } catch {
    return false;
  }

  if (expected.length !== provided.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= (expected[index] as number) ^ (provided[index] as number);
  }
  if (difference !== 0) return false;

  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    return typeof decoded.exp === "number" && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

/** Validate a login attempt against the configured password. */
export function verifyPassword(candidate: string, env: AuthEnv = process.env): boolean {
  const password = readEnv(env, "DASHBOARD_PASSWORD");
  if (!password) return false;
  return timingSafeEqual(candidate, password);
}

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
}

export function sessionCookieOptions(sessionSeconds: number, secure: boolean): SessionCookieOptions {
  return { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: sessionSeconds };
}
