import "server-only";

import { VirtualizorError, classifyApiMessage, redactSecrets, type VirtualizorErrorCode } from "./errors";
import type { VirtualizorConfig } from "./config";
import type { UnknownRecord } from "./types";

/**
 * Centralized, server-only Virtualizor Enduser API client.
 *
 * Responsibilities:
 *  - construct authenticated requests (`api=json`, `apikey`, `apipass`)
 *  - assemble GET query / POST form bodies (including array parameters)
 *  - enforce per-request timeouts and a response size ceiling
 *  - refuse to follow redirects (credentials must not leak to another origin)
 *  - translate HTTP/network/API failures into normalized errors
 *  - guarantee credentials never appear in messages or logs
 */

export type VirtualizorParamValue = string | number | boolean | undefined | null;
export type VirtualizorParams = Record<string, VirtualizorParamValue | VirtualizorParamValue[]>;

export interface VirtualizorRequestOptions {
  /** Virtualizor `act` action name. */
  act: string;
  method?: "GET" | "POST";
  query?: VirtualizorParams;
  body?: VirtualizorParams;
  timeoutMs?: number;
  longRunning?: boolean;
  /** Override the configured VPS ID (`svs`). Pass `null` to omit. */
  vpsId?: string | null;
}

export interface VirtualizorClientResponse {
  payload: UnknownRecord;
  requestId: string;
  httpStatus: number;
  durationMs: number;
}

function createRequestId(): string {
  const globalCrypto = globalThis.crypto;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return globalCrypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Append parameters, encoding array values using the `key[]` convention the
 * Virtualizor API expects. Keys that already end in `[]` are passed through
 * verbatim so callers can control the exact wire format.
 */
export function appendParams(target: URLSearchParams, params: VirtualizorParams | undefined): void {
  if (!params) return;
  for (const [key, rawValue] of Object.entries(params)) {
    if (rawValue === undefined || rawValue === null) continue;
    if (Array.isArray(rawValue)) {
      const wireKey = key.endsWith("[]") ? key : `${key}[]`;
      for (const value of rawValue) {
        if (value === undefined || value === null) continue;
        target.append(wireKey, String(value));
      }
      continue;
    }
    target.append(key, String(rawValue));
  }
}

function buildUrl(config: VirtualizorConfig, options: VirtualizorRequestOptions): URL {
  const url = new URL(`${config.baseUrl}/index.php`);
  const params = url.searchParams;
  params.set("api", "json");
  params.set("act", options.act);
  params.set("apikey", config.apiKey);
  params.set("apipass", config.apiPass);

  const vpsId = options.vpsId === undefined ? config.vpsId : options.vpsId;
  if (vpsId) {
    params.set("svs", vpsId);
  }

  appendParams(params, options.query);
  return url;
}

function serializeBody(body: VirtualizorParams | undefined): string | undefined {
  if (!body) return undefined;
  const params = new URLSearchParams();
  appendParams(params, body);
  const serialized = params.toString();
  return serialized.length > 0 ? serialized : undefined;
}

const TLS_ERROR_CODES = new Set([
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "CERT_HAS_EXPIRED",
  "ERR_SSL_WRONG_VERSION_NUMBER",
  "ERR_SSL_UNRECOGNIZED_NAME",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

function isTlsError(error: unknown): boolean {
  const candidate = error as { cause?: { code?: string }; code?: string; message?: string };
  const code = candidate?.cause?.code ?? candidate?.code;
  if (code && TLS_ERROR_CODES.has(code)) return true;
  const message = candidate?.message?.toLowerCase() ?? "";
  return message.includes("certificate") || message.includes("tls handshake") || message.includes("ssl");
}

export function extractUpstreamError(payload: UnknownRecord): string | undefined {
  const error = payload.error;
  if (typeof error === "string" && error.trim()) return error.trim();
  if (Array.isArray(error)) {
    const joined = error
      .map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)))
      .join(" ")
      .trim();
    if (joined) return joined;
  }
  const messages = payload.msgs;
  if (typeof messages === "string" && messages.trim()) return messages.trim();
  if (messages && typeof messages === "object") {
    const nested = (messages as UnknownRecord).error;
    if (typeof nested === "string" && nested.trim()) return nested.trim();
  }
  return undefined;
}

/** Extract a best-effort human readable success message from a response. */
export function extractSuccessMessage(payload: UnknownRecord, fallback = "Operation completed."): string {
  const done = payload.done;
  if (done && typeof done === "object" && !Array.isArray(done)) {
    const msg = (done as UnknownRecord).msg;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  const msg = payload.msg;
  if (typeof msg === "string" && msg.trim()) return msg.trim();
  return fallback;
}

async function readBodyCapped(response: Response, maxBytes: number): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new VirtualizorError({
        code: "VIRTUALIZOR_RESPONSE_TOO_LARGE",
        message: `Virtualizor returned a response larger than the ${maxBytes} byte limit.`,
      });
    }
  }

  const body = response.body;
  if (!body) return "";

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.byteLength;
        if (received > maxBytes) {
          await reader.cancel();
          throw new VirtualizorError({
            code: "VIRTUALIZOR_RESPONSE_TOO_LARGE",
            message: `Virtualizor returned a response larger than the ${maxBytes} byte limit.`,
          });
        }
        text += decoder.decode(value, { stream: true });
      }
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

export class VirtualizorClient {
  private readonly config: VirtualizorConfig;

  constructor(config: VirtualizorConfig) {
    this.config = config;
  }

  get connectionInfo(): { baseUrl: string; vpsId?: string; hasCredentials: boolean } {
    return {
      baseUrl: this.config.baseUrl,
      vpsId: this.config.vpsId,
      hasCredentials: Boolean(this.config.apiKey && this.config.apiPass),
    };
  }

  private get secrets(): string[] {
    return [this.config.apiKey, this.config.apiPass];
  }

  async request(options: VirtualizorRequestOptions): Promise<VirtualizorClientResponse> {
    const requestId = createRequestId();
    const method = options.method ?? "GET";
    const url = buildUrl(this.config, options);
    const body = method === "POST" ? serializeBody(options.body) : undefined;
    const timeoutMs = options.timeoutMs ?? (options.longRunning ? this.config.longTimeoutMs : this.config.timeoutMs);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        },
        body,
        signal: controller.signal,
        cache: "no-store",
        redirect: "manual",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new VirtualizorError({
          code: "VIRTUALIZOR_TIMEOUT",
          message: `The Virtualizor API did not respond within ${timeoutMs}ms.`,
          cause: error,
          requestId,
        });
      }
      if (isTlsError(error)) {
        throw new VirtualizorError({
          code: "VIRTUALIZOR_TLS_ERROR",
          message:
            "Could not establish a trusted TLS connection to the Virtualizor panel. Install a valid certificate on the panel.",
          cause: error,
          requestId,
        });
      }
      throw new VirtualizorError({
        code: "VIRTUALIZOR_NETWORK_ERROR",
        message: "Could not reach the Virtualizor panel. Check VIRTUALIZOR_URL and network access.",
        cause: error,
        requestId,
      });
    } finally {
      clearTimeout(timer);
    }

    const durationMs = Date.now() - startedAt;

    if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
      throw new VirtualizorError({
        code: "VIRTUALIZOR_HTTP_ERROR",
        message:
          "The Virtualizor panel issued a redirect. Check that VIRTUALIZOR_URL points directly at the panel API endpoint.",
        requestId,
      });
    }

    let text: string;
    try {
      text = await readBodyCapped(response, this.config.maxResponseBytes);
    } catch (error) {
      if (VirtualizorError.is(error)) {
        error.requestId = requestId;
        throw error;
      }
      throw new VirtualizorError({
        code: "VIRTUALIZOR_NETWORK_ERROR",
        message: "The connection to the Virtualizor panel was interrupted while reading the response.",
        cause: error,
        requestId,
      });
    }

    if (!response.ok) {
      throw new VirtualizorError({
        code: "VIRTUALIZOR_HTTP_ERROR",
        message: `Virtualizor returned HTTP ${response.status}.`,
        cause: redactSecrets(text.slice(0, 500), this.secrets),
        requestId,
      });
    }

    let payload: unknown;
    try {
      payload = text.length > 0 ? JSON.parse(text) : {};
    } catch (error) {
      throw new VirtualizorError({
        code: "VIRTUALIZOR_INVALID_RESPONSE",
        message:
          "Virtualizor returned a non-JSON response. This usually means the panel URL, port or API credentials are incorrect, or the panel returned an HTML error page.",
        cause: error,
        requestId,
      });
    }

    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
      throw new VirtualizorError({
        code: "VIRTUALIZOR_INVALID_RESPONSE",
        message: "Virtualizor returned an unexpected response shape.",
        requestId,
      });
    }

    const record = payload as UnknownRecord;
    const upstreamError = extractUpstreamError(record);
    if (upstreamError) {
      const safeMessage = redactSecrets(upstreamError, this.secrets);
      throw new VirtualizorError({
        code: classifyApiMessage(safeMessage) as VirtualizorErrorCode,
        message: safeMessage,
        requestId,
      });
    }

    return { payload: record, requestId, httpStatus: response.status, durationMs };
  }

  /** Lightweight connectivity probe. Never performs a destructive action. */
  async ping(timeoutMs = 8_000): Promise<{ latencyMs: number; requestId: string }> {
    const startedAt = Date.now();
    const result = await this.request({ act: "cpu", timeoutMs });
    return { latencyMs: Date.now() - startedAt, requestId: result.requestId };
  }
}

let cachedClient: VirtualizorClient | undefined;
let cachedKey: string | undefined;

/** Return a memoized client instance, rebuilt when the configuration changes. */
export function getVirtualizorClient(config: VirtualizorConfig): VirtualizorClient {
  const key = `${config.baseUrl}|${config.apiKey.slice(-4)}|${config.vpsId ?? ""}`;
  if (!cachedClient || cachedKey !== key) {
    cachedClient = new VirtualizorClient(config);
    cachedKey = key;
  }
  return cachedClient;
}

/** Reset the memoized client (used by tests). */
export function resetVirtualizorClient(): void {
  cachedClient = undefined;
  cachedKey = undefined;
}
