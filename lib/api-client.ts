/**
 * Browser-side API client.
 *
 * Talks only to Vantage's own `/api/*` routes. Virtualizor credentials never
 * exist in this layer. Responses use the shared `{ success, data }` envelope.
 */

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;

  constructor(message: string, options: { code: string; status: number; requestId?: string }) {
    super(message);
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
  }
}

interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string; requestId?: string };
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  fetchedAt: string;
  requestId: string;
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (!value || typeof value !== "object") return false;
  return (value as { success?: unknown }).success === false;
}

function isSuccessEnvelope<T>(value: unknown): value is SuccessEnvelope<T> {
  if (!value || typeof value !== "object") return false;
  return (value as { success?: unknown }).success === true;
}

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;
  const response = await fetch(path, {
    method,
    signal,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (isSuccessEnvelope<T>(payload)) {
    return payload.data;
  }

  const error = isErrorEnvelope(payload)
    ? payload.error
    : { code: "UNKNOWN", message: `Request failed with status ${response.status}.` };

  throw new ApiError(error.message, {
    code: error.code,
    status: response.status,
    requestId: error.requestId,
  });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
