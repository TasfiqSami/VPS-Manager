import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, getAuthConfig, verifySessionToken } from "@/lib/auth";
import { AppError } from "./errors";

/**
 * Authentication guard for internal API routes.
 *
 * Fails closed: when authentication is misconfigured or missing in production
 * the route returns 503 rather than silently allowing access.
 */
export async function requireApiAuth(): Promise<void> {
  const config = getAuthConfig();

  if (config.mode === "dev-open") {
    return;
  }
  if (config.mode === "blocked") {
    throw new AppError({
      code: "AUTH_CONFIG",
      message: config.reason ?? "Dashboard authentication is not configured.",
    });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const valid = await verifySessionToken(token);
  if (!valid) {
    throw new AppError({
      code: "AUTH_REQUIRED",
      message: "Authentication required. Please sign in to the dashboard.",
    });
  }
}

function configuredOrigins(): string[] {
  return (process.env.VANTAGE_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function sameOrigin(origin: string, request: NextRequest): boolean {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    const originUrl = new URL(origin);
    if (host && originUrl.host === host) return true;
    if (originUrl.origin === new URL(request.url).origin) return true;
  } catch {
    return false;
  }
  const allowed = configuredOrigins();
  return allowed.some((value) => {
    try {
      return new URL(value).origin === origin;
    } catch {
      return value === origin;
    }
  });
}

/**
 * CSRF protection for cookie-authenticated mutations.
 *
 * In production an `Origin` header is required and must match the request host
 * (or an explicitly configured origin). Development/test environments allow a
 * missing Origin for tooling convenience.
 */
export function assertMutationOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    if (process.env.NODE_ENV !== "production") return;
    throw new AppError({
      code: "ORIGIN_REJECTED",
      message: "Missing Origin header on a state-changing request.",
    });
  }
  if (!sameOrigin(origin, request)) {
    throw new AppError({
      code: "ORIGIN_REJECTED",
      message: "Cross-origin state-changing requests are not allowed.",
    });
  }
}
