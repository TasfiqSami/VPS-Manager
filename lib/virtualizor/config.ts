import "server-only";

import { VirtualizorError } from "./errors";

/**
 * Server-side Virtualizor configuration.
 *
 * Credentials are read from `process.env` at call time and never leave the
 * server. This module must never be imported by client components.
 */
export interface VirtualizorConfig {
  baseUrl: string;
  apiKey: string;
  apiPass: string;
  vpsId?: string;
  timeoutMs: number;
  longTimeoutMs: number;
  maxResponseBytes: number;
  capabilityTtlMs: number;
}

export type ConfigResult =
  | { ok: true; config: VirtualizorConfig }
  | { ok: false; missing: string[]; error: VirtualizorError };

export interface ConfigStatus {
  configured: boolean;
  missing: string[];
  baseUrl?: string;
  hasApiKey: boolean;
  hasApiPass: boolean;
  hasVpsId: boolean;
  timeoutMs?: number;
  longTimeoutMs?: number;
  maxResponseBytes?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_LONG_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RESPONSE_BYTES = 2_097_152;
const DEFAULT_CAPABILITY_TTL_S = 300;

function readString(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readInt(name: string, fallback: number, min: number, max: number): number {
  const raw = readString(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Validate and normalize a Virtualizor panel origin.
 * Plain HTTP is only tolerated for loopback development hosts.
 */
export function normalizeBaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new VirtualizorError({
      code: "VIRTUALIZOR_CONFIG_ERROR",
      message: "VIRTUALIZOR_URL is not a valid absolute URL.",
    });
  }

  const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
    throw new VirtualizorError({
      code: "VIRTUALIZOR_CONFIG_ERROR",
      message: "VIRTUALIZOR_URL must use HTTPS. Install a valid certificate on the panel.",
    });
  }

  const pathname = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname}`;
}

/**
 * Load and validate Virtualizor configuration.
 * Returns a discriminated result so callers can respond with a precise 503.
 */
export function loadVirtualizorConfig(): ConfigResult {
  const rawUrl = readString("VIRTUALIZOR_URL");
  const apiKey = readString("VIRTUALIZOR_API_KEY");
  const apiPass = readString("VIRTUALIZOR_API_PASS");

  const missing: string[] = [];
  if (!rawUrl) missing.push("VIRTUALIZOR_URL");
  if (!apiKey) missing.push("VIRTUALIZOR_API_KEY");
  if (!apiPass) missing.push("VIRTUALIZOR_API_PASS");

  if (missing.length > 0 || !rawUrl || !apiKey || !apiPass) {
    return {
      ok: false,
      missing,
      error: new VirtualizorError({
        code: "VIRTUALIZOR_CONFIG_ERROR",
        message: `Virtualizor is not configured. Missing: ${missing.join(", ")}.`,
      }),
    };
  }

  try {
    const config: VirtualizorConfig = {
      baseUrl: normalizeBaseUrl(rawUrl),
      apiKey,
      apiPass,
      timeoutMs: readInt("VIRTUALIZOR_TIMEOUT_MS", DEFAULT_TIMEOUT_MS, 1_000, 120_000),
      longTimeoutMs: readInt("VIRTUALIZOR_LONG_TIMEOUT_MS", DEFAULT_LONG_TIMEOUT_MS, 1_000, 600_000),
      maxResponseBytes: readInt("VIRTUALIZOR_MAX_RESPONSE_BYTES", DEFAULT_MAX_RESPONSE_BYTES, 1_024, 64 * 1_024 * 1_024),
      capabilityTtlMs: readInt("VIRTUALIZOR_CAPABILITY_TTL_S", DEFAULT_CAPABILITY_TTL_S, 1, 3_600) * 1_000,
    };
    const vpsId = readString("VIRTUALIZOR_VPS_ID");
    if (vpsId) config.vpsId = vpsId;
    return { ok: true, config };
  } catch (error) {
    if (VirtualizorError.is(error)) {
      return { ok: false, missing: [], error };
    }
    return {
      ok: false,
      missing: [],
      error: new VirtualizorError({
        code: "VIRTUALIZOR_CONFIG_ERROR",
        message: "Virtualizor configuration is invalid.",
        cause: error,
      }),
    };
  }
}

/** Non-secret configuration summary, safe for the health endpoint. */
export function getConfigStatus(): ConfigStatus {
  const rawUrl = readString("VIRTUALIZOR_URL");
  const apiKey = readString("VIRTUALIZOR_API_KEY");
  const apiPass = readString("VIRTUALIZOR_API_PASS");
  const vpsId = readString("VIRTUALIZOR_VPS_ID");

  const missing: string[] = [];
  if (!rawUrl) missing.push("VIRTUALIZOR_URL");
  if (!apiKey) missing.push("VIRTUALIZOR_API_KEY");
  if (!apiPass) missing.push("VIRTUALIZOR_API_PASS");

  const status: ConfigStatus = {
    configured: missing.length === 0,
    missing,
    hasApiKey: Boolean(apiKey),
    hasApiPass: Boolean(apiPass),
    hasVpsId: Boolean(vpsId),
  };

  if (rawUrl) {
    try {
      status.baseUrl = normalizeBaseUrl(rawUrl);
    } catch {
      status.baseUrl = undefined;
    }
  }
  if (missing.length === 0) {
    status.timeoutMs = readInt("VIRTUALIZOR_TIMEOUT_MS", DEFAULT_TIMEOUT_MS, 1_000, 120_000);
    status.longTimeoutMs = readInt("VIRTUALIZOR_LONG_TIMEOUT_MS", DEFAULT_LONG_TIMEOUT_MS, 1_000, 600_000);
    status.maxResponseBytes = readInt(
      "VIRTUALIZOR_MAX_RESPONSE_BYTES",
      DEFAULT_MAX_RESPONSE_BYTES,
      1_024,
      64 * 1_024 * 1_024,
    );
  }
  return status;
}

/** Values that must be scrubbed from any log or error string. */
export function getRedactionSecrets(): string[] {
  return [
    readString("VIRTUALIZOR_API_KEY"),
    readString("VIRTUALIZOR_API_PASS"),
    readString("AUTH_SECRET"),
    readString("DASHBOARD_PASSWORD"),
  ].filter((value): value is string => Boolean(value));
}
