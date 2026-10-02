/**
 * Internal (non-Virtualizor) application errors.
 *
 * These are kept separate from `VirtualizorError` so the response layer can
 * distinguish "the panel rejected us" from "the caller must authenticate".
 */

export type AppErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_CONFIG"
  | "ORIGIN_REJECTED"
  | "RATE_LIMITED"
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "BAD_GATEWAY"
  | "INTERNAL";

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  AUTH_REQUIRED: 401,
  AUTH_CONFIG: 503,
  ORIGIN_REJECTED: 403,
  RATE_LIMITED: 429,
  INVALID_REQUEST: 400,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  BAD_GATEWAY: 502,
  INTERNAL: 500,
};

export interface AppErrorOptions {
  code: AppErrorCode;
  message: string;
  cause?: unknown;
  requestId?: string;
  /** Override the default HTTP status for the code. */
  status?: number;
  retryAfterSeconds?: number;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  override readonly cause?: unknown;
  readonly retryAfterSeconds?: number;
  requestId?: string;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status ?? STATUS_BY_CODE[options.code];
    this.cause = options.cause;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.requestId = options.requestId;
  }

  static is(value: unknown): value is AppError {
    return value instanceof AppError;
  }
}
