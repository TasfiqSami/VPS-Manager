import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { recordAudit } from "./audit";
import { AppError } from "./errors";
import { assertMutationOrigin, requireApiAuth } from "./guard";
import { logger } from "./logger";
import { enforceRateLimit, getClientKey, getMutationRule } from "./rate-limit";
import { jsonError, jsonSuccess, normalizeError } from "./response";
import { getAuthConfig } from "@/lib/auth";

/** Route context shape used by Next.js App Router dynamic segments. */
export interface RouteContext {
  params: Promise<Record<string, string>>;
}

export type ApiHandler = (request: NextRequest, context: RouteContext) => Promise<NextResponse>;

type Loader<T> = (request: NextRequest, context: RouteContext) => Promise<T>;

const MAX_JSON_BODY_BYTES = 256 * 1024;

export function createRequestId(): string {
  const globalCrypto = globalThis.crypto;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return globalCrypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function logFailure(requestId: string, request: NextRequest, error: unknown, status: number): void {
  const message = error instanceof Error ? error.message : "Request failed";
  logger.warn("api_error", {
    requestId,
    code: error instanceof AppError ? error.code : "UNKNOWN",
    status,
    path: request.nextUrl.pathname,
    message,
  });
}

function actorName(): string {
  const config = getAuthConfig();
  if (config.mode === "dev-open") return "dev-session";
  if (config.mode === "blocked") return "unauthenticated";
  return "operator";
}

async function run<T>(
  request: NextRequest,
  context: RouteContext,
  requestId: string,
  loader: Loader<T>,
  mutation: boolean,
): Promise<NextResponse> {
  const startedAt = Date.now();
  const ip = getClientKey(request.headers);
  try {
    await requireApiAuth();
    if (mutation) {
      assertMutationOrigin(request);
      enforceRateLimit(`${ip}:${request.nextUrl.pathname}`, getMutationRule());
    }
    const data = await loader(request, context);
    if (mutation) {
      recordAudit({
        method: request.method,
        path: request.nextUrl.pathname,
        actor: actorName(),
        ip,
        success: true,
        status: 200,
        durationMs: Date.now() - startedAt,
        requestId,
      });
    }
    return jsonSuccess(data, requestId);
  } catch (error) {
    const response = jsonError(error, requestId);
    logFailure(requestId, request, error, response.status);
    if (mutation) {
      const normalized = normalizeError(error);
      recordAudit({
        method: request.method,
        path: request.nextUrl.pathname,
        actor: actorName(),
        ip,
        success: false,
        status: response.status,
        code: normalized.code,
        durationMs: Date.now() - startedAt,
        requestId,
      });
    }
    return response;
  }
}

/** Wrap an authenticated GET handler with logging, error normalization and no-store. */
export function apiGet<T>(loader: Loader<T>): ApiHandler {
  return (request, context) => run(request, context, createRequestId(), loader, false);
}

/** Wrap an authenticated mutating handler with CSRF, rate limiting and error normalization. */
export function apiMutation<T>(loader: Loader<T>): ApiHandler {
  return (request, context) => run(request, context, createRequestId(), loader, true);
}

/** Resolve and require a named dynamic route parameter. */
export async function requireRouteParam(context: RouteContext, name: string): Promise<string> {
  const params = await context.params;
  const value = params[name];
  if (!value) {
    throw new AppError({
      code: "INVALID_REQUEST",
      message: `Missing required route parameter: ${name}.`,
    });
  }
  return value;
}

/** Request body validation errors are mapped to HTTP 400 with a clear message. */export async function parseJsonBody<Schema extends z.ZodTypeAny>(
  request: NextRequest,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BODY_BYTES) {
    throw new AppError({
      code: "INVALID_REQUEST",
      message: `Request body exceeds the ${MAX_JSON_BODY_BYTES} byte limit.`,
      status: 413,
    });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new AppError({ code: "INVALID_REQUEST", message: "Request body must be valid JSON." });
  }
  return schema.parse(json);
}
