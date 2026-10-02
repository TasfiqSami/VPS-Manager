/**
 * Normalized error model.
 *
 * Every failure is converted into a `VirtualizorError` with a stable,
 * machine-readable code. Only `{ code, message }` is ever serialized to the
 * browser; causes, stack traces, filesystem paths and credentials never cross
 * the boundary.
 */

export const VIRTUALIZOR_ERROR_CODES = [
  "VIRTUALIZOR_CONFIG_ERROR",
  "VIRTUALIZOR_AUTH_ERROR",
  "VIRTUALIZOR_HTTP_ERROR",
  "VIRTUALIZOR_TIMEOUT",
  "VIRTUALIZOR_NETWORK_ERROR",
  "VIRTUALIZOR_TLS_ERROR",
  "VIRTUALIZOR_API_ERROR",
  "VIRTUALIZOR_UNSUPPORTED",
  "VIRTUALIZOR_NOT_FOUND",
  "VIRTUALIZOR_INVALID_RESPONSE",
  "VIRTUALIZOR_FORBIDDEN",
  "VIRTUALIZOR_RATE_LIMITED",
  "VIRTUALIZOR_RESPONSE_TOO_LARGE",
  "VIRTUALIZOR_UNKNOWN",
] as const;

export type VirtualizorErrorCode = (typeof VIRTUALIZOR_ERROR_CODES)[number];

export interface VirtualizorErrorShape {
  code: VirtualizorErrorCode;
  message: string;
  requestId?: string;
}

interface VirtualizorErrorInit {
  code: VirtualizorErrorCode;
  message: string;
  /** Internal detail. NEVER serialized to the client. */
  cause?: unknown;
  requestId?: string;
}

export class VirtualizorError extends Error {
  readonly code: VirtualizorErrorCode;
  override readonly cause?: unknown;
  requestId?: string;

  constructor(init: VirtualizorErrorInit) {
    super(init.message);
    this.name = "VirtualizorError";
    this.code = init.code;
    this.cause = init.cause;
    this.requestId = init.requestId;
  }

  toShape(): VirtualizorErrorShape {
    return this.requestId
      ? { code: this.code, message: this.message, requestId: this.requestId }
      : { code: this.code, message: this.message };
  }

  static is(value: unknown): value is VirtualizorError {
    return value instanceof VirtualizorError;
  }
}

/**
 * Redact credential-bearing substrings from any text before logging.
 * Belt-and-braces protection against upstream or third-party strings echoing
 * secrets back into our logs.
 */
export function redactSecrets(text: string, secrets: readonly string[]): string {
  let output = text;
  for (const secret of secrets) {
    if (!secret || secret.length < 4) continue;
    output = output.split(secret).join("[redacted]");
  }
  return output;
}

/** Normalize any thrown value into a VirtualizorError. */
export function toVirtualizorError(error: unknown): VirtualizorError {
  if (VirtualizorError.is(error)) return error;
  return new VirtualizorError({
    code: "VIRTUALIZOR_UNKNOWN",
    message: "An unexpected error occurred while contacting the Virtualizor API.",
    cause: error,
  });
}

/** Map an upstream message to a more specific error code when possible. */
export function classifyApiMessage(message: string): VirtualizorErrorCode {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("api key") ||
    normalized.includes("apikey") ||
    normalized.includes("apipass") ||
    normalized.includes("authentication") ||
    normalized.includes("unauthorized") ||
    normalized.includes("login failed") ||
    normalized.includes("invalid login")
  ) {
    return "VIRTUALIZOR_AUTH_ERROR";
  }
  if (
    normalized.includes("permission") ||
    normalized.includes("not allowed") ||
    normalized.includes("forbidden") ||
    normalized.includes("access denied")
  ) {
    return "VIRTUALIZOR_FORBIDDEN";
  }
  if (normalized.includes("not found") || normalized.includes("invalid vps") || normalized.includes("no such")) {
    return "VIRTUALIZOR_NOT_FOUND";
  }
  if (
    normalized.includes("not supported") ||
    normalized.includes("unsupported") ||
    normalized.includes("not available") ||
    normalized.includes("disabled")
  ) {
    return "VIRTUALIZOR_UNSUPPORTED";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "VIRTUALIZOR_RATE_LIMITED";
  }
  return "VIRTUALIZOR_API_ERROR";
}
