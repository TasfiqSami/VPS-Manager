import { vi } from "vitest";

/** Credentials used by every integration test. Never real values. */
export const TEST_ENV = {
  VIRTUALIZOR_URL: "https://panel.example.com",
  VIRTUALIZOR_API_KEY: "test-api-key-123456",
  VIRTUALIZOR_API_PASS: "test-api-pass-abcdef",
  VIRTUALIZOR_VPS_ID: "42",
} as const;

const MANAGED_KEYS = [
  "VIRTUALIZOR_URL",
  "VIRTUALIZOR_API_KEY",
  "VIRTUALIZOR_API_PASS",
  "VIRTUALIZOR_VPS_ID",
  "VIRTUALIZOR_TIMEOUT_MS",
  "VIRTUALIZOR_LONG_TIMEOUT_MS",
  "VIRTUALIZOR_MAX_RESPONSE_BYTES",
  "VIRTUALIZOR_CAPABILITY_TTL_S",
  "DASHBOARD_PASSWORD",
  "AUTH_SECRET",
  "AUTH_SESSION_HOURS",
  "VANTAGE_ALLOWED_ORIGINS",
  "VANTAGE_LOG_LEVEL",
  "VANTAGE_AUDIT_LIMIT",
  "RATE_LIMIT_MUTATION_MAX",
  "RATE_LIMIT_MUTATION_WINDOW_S",
  "RATE_LIMIT_LOGIN_MAX",
  "RATE_LIMIT_LOGIN_WINDOW_S",
  "NODE_ENV",
] as const;

type ManagedKey = (typeof MANAGED_KEYS)[number];

/** Snapshot and clear all managed environment variables before a test. */
export function applyEnv(values: Partial<Record<ManagedKey, string | undefined>>): void {
  for (const key of MANAGED_KEYS) {
    if (key in values) {
      const value = values[key];
      if (value === undefined) delete process.env[key];
      else (process.env as Record<string, string | undefined>)[key] = value;
    }
  }
}

export function resetManagedEnv(): void {
  for (const key of MANAGED_KEYS) delete process.env[key];
}

/** Build a JSON Response the way the fetch mock should return it. */
export function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(typeof payload === "string" ? payload : JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

export type FetchResponder = (url: URL, init?: RequestInit) => Response | Promise<Response>;

export interface FetchCall {
  url: URL;
  act: string | null;
  method: string | undefined;
  init: RequestInit | undefined;
}

/** Install a fetch mock that records calls and returns a canned payload per `act`. */
export function installFetchMock(responder: (call: FetchCall) => Response | Promise<Response>) {
  const calls: FetchCall[] = [];
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const call: FetchCall = { url, act: url.searchParams.get("act"), method: init?.method, init };
    calls.push(call);
    return responder(call);
  });
  vi.stubGlobal("fetch", mock);
  return { mock, calls };
}

export interface VpsScopedOptions {
  vpsId?: string | null;
}

export function actionResponse(body: unknown, message?: string): Response {
  const payload = message ? { done: { msg: message }, ...(body as object) } : body;
  return jsonResponse(payload);
}
