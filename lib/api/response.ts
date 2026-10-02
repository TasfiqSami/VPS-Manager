import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "./errors";
import { VirtualizorError, toVirtualizorError, type VirtualizorErrorShape } from "@/lib/virtualizor/errors";
import { formatZodError } from "@/lib/virtualizor/validators";

/** Standard success envelope for every internal API route. */
export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  fetchedAt: string;
  requestId: string;
}

/** Standard failure envelope for every internal API route. */
export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0, must-revalidate" } as const;

export function jsonSuccess<T>(data: T, requestId: string, init?: ResponseInit): NextResponse<SuccessEnvelope<T>> {
  return NextResponse.json(
    { success: true as const, data, fetchedAt: new Date().toISOString(), requestId },
    {
      ...init,
      headers: { ...NO_STORE_HEADERS, ...init?.headers },
    },
  );
}

export function jsonError(error: unknown, requestId: string, init?: ResponseInit): NextResponse<ErrorEnvelope> {
  const { code, message, status, retryAfterSeconds } = normalizeError(error);
  const headers: Record<string, string> = { ...NO_STORE_HEADERS, ...(init?.headers as Record<string, string>) };
  if (retryAfterSeconds !== undefined) headers["Retry-After"] = String(retryAfterSeconds);

  return NextResponse.json(
    { success: false as const, error: { code, message, requestId } },
    { status: init?.status ?? status, headers },
  );
}

export interface NormalizedError {
  code: string;
  message: string;
  status: number;
  retryAfterSeconds?: number;
}

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof ZodError) {
    return { code: "INVALID_REQUEST", message: formatZodError(error), status: 400 };
  }
  if (AppError.is(error)) {
    const normalized: NormalizedError = { code: error.code, message: error.message, status: error.status };
    if (error.retryAfterSeconds !== undefined) normalized.retryAfterSeconds = error.retryAfterSeconds;
    return normalized;
  }
  if (VirtualizorError.is(error)) {
    return { code: error.code, message: error.message, status: mapUpstreamStatus(error) };
  }
  const unknown = toVirtualizorError(error);
  return { code: unknown.code, message: unknown.message, status: 502 };
}

function mapUpstreamStatus(error: VirtualizorError): number {
  switch (error.code) {
    case "VIRTUALIZOR_CONFIG_ERROR":
      return 503;
    case "VIRTUALIZOR_FORBIDDEN":
      return 403;
    case "VIRTUALIZOR_NOT_FOUND":
      return 404;
    case "VIRTUALIZOR_UNSUPPORTED":
      return 501;
    case "VIRTUALIZOR_TIMEOUT":
      return 504;
    case "VIRTUALIZOR_RATE_LIMITED":
      return 429;
    case "VIRTUALIZOR_AUTH_ERROR":
    case "VIRTUALIZOR_HTTP_ERROR":
    case "VIRTUALIZOR_NETWORK_ERROR":
    case "VIRTUALIZOR_TLS_ERROR":
    case "VIRTUALIZOR_API_ERROR":
    case "VIRTUALIZOR_INVALID_RESPONSE":
    case "VIRTUALIZOR_RESPONSE_TOO_LARGE":
    case "VIRTUALIZOR_UNKNOWN":
    default:
      return 502;
  }
}

/** Convert an error into the serializable error shape used in envelopes. */
export function errorToShape(error: VirtualizorError): VirtualizorErrorShape {
  return error.toShape();
}
