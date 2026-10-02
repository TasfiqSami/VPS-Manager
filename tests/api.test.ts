import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { applyEnv, resetManagedEnv } from "./support/env";
import { AppError } from "@/lib/api/errors";
import { assertMutationOrigin, requireApiAuth } from "@/lib/api/guard";
import { apiGet, apiMutation, createRequestId, parseJsonBody, requireRouteParam } from "@/lib/api/handlers";
import type { RouteContext } from "@/lib/api/handlers";
import { logger } from "@/lib/api/logger";
import { jsonError, jsonSuccess, normalizeError } from "@/lib/api/response";
import {
  consumeRateLimit,
  enforceRateLimit,
  getClientKey,
  getLoginRule,
  getMutationRule,
  rateLimitStoreSize,
  resetRateLimits,
} from "@/lib/api/rate-limit";
import { VirtualizorError } from "@/lib/virtualizor/errors";

function makeRequest(url: string, init?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest(url, init);
}

function makeCtx(params: Record<string, string> = {}): RouteContext {
  return { params: Promise.resolve(params) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetManagedEnv();
  resetRateLimits();
});

describe("AppError", () => {
  it("maps codes to default statuses", () => {
    expect(new AppError({ code: "AUTH_REQUIRED", message: "x" }).status).toBe(401);
    expect(new AppError({ code: "NOT_FOUND", message: "x" }).status).toBe(404);
    expect(new AppError({ code: "RATE_LIMITED", message: "x" }).status).toBe(429);
  });

  it("honours status and retry overrides", () => {
    const error = new AppError({ code: "INVALID_REQUEST", message: "x", status: 413, retryAfterSeconds: 5 });
    expect(error.status).toBe(413);
    expect(error.retryAfterSeconds).toBe(5);
    expect(AppError.is(error)).toBe(true);
    expect(AppError.is(new Error("x"))).toBe(false);
  });
});

describe("response helpers", () => {
  it("builds a success envelope with no-store", async () => {
    const response = jsonSuccess({ hello: "world" }, "req-1");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const body = await response.json();
    expect(body).toMatchObject({ success: true, data: { hello: "world" }, requestId: "req-1" });
  });

  it("normalizes zod errors to 400", async () => {
    const schema = z.object({ name: z.string() });
    const parsed = schema.safeParse({});
    const normalized = normalizeError((parsed as { error: unknown }).error);
    expect(normalized).toMatchObject({ code: "INVALID_REQUEST", status: 400 });
  });

  it("normalizes AppError and sets Retry-After", async () => {
    const response = jsonError(new AppError({ code: "RATE_LIMITED", message: "slow", retryAfterSeconds: 30 }), "req-2");
    expect(response.headers.get("Retry-After")).toBe("30");
    const body = await response.json();
    expect(body.error).toMatchObject({ code: "RATE_LIMITED", message: "slow" });
  });

  it("maps upstream error codes to statuses", () => {
    expect(normalizeError(new VirtualizorError({ code: "VIRTUALIZOR_CONFIG_ERROR", message: "x" })).status).toBe(503);
    expect(normalizeError(new VirtualizorError({ code: "VIRTUALIZOR_FORBIDDEN", message: "x" })).status).toBe(403);
    expect(normalizeError(new VirtualizorError({ code: "VIRTUALIZOR_NOT_FOUND", message: "x" })).status).toBe(404);
    expect(normalizeError(new VirtualizorError({ code: "VIRTUALIZOR_UNSUPPORTED", message: "x" })).status).toBe(501);
    expect(normalizeError(new VirtualizorError({ code: "VIRTUALIZOR_TIMEOUT", message: "x" })).status).toBe(504);
    expect(normalizeError(new VirtualizorError({ code: "VIRTUALIZOR_RATE_LIMITED", message: "x" })).status).toBe(429);
    expect(normalizeError(new VirtualizorError({ code: "VIRTUALIZOR_API_ERROR", message: "x" })).status).toBe(502);
  });

  it("wraps unknown errors as 502", () => {
    expect(normalizeError(new Error("boom"))).toMatchObject({ status: 502 });
  });
});

describe("rate limiting", () => {
  it("allows within the window and blocks beyond the max", () => {
    const rule = { max: 2, windowSeconds: 60 };
    const now = 1_000_000;
    expect(consumeRateLimit("k", rule, now).allowed).toBe(true);
    const second = consumeRateLimit("k", rule, now + 1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
    const third = consumeRateLimit("k", rule, now + 2);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("expires old entries", () => {
    const rule = { max: 1, windowSeconds: 1 };
    consumeRateLimit("k", rule, 0);
    expect(consumeRateLimit("k", rule, 5000).allowed).toBe(true);
  });

  it("enforceRateLimit throws with retry info", () => {
    const rule = { max: 1, windowSeconds: 60 };
    enforceRateLimit("k", rule);
    expect(() => enforceRateLimit("k", rule)).toThrow(AppError);
  });

  it("derives client keys from platform headers", () => {
    expect(getClientKey(new Headers({ "x-vercel-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("1.1.1.1");
    expect(getClientKey(new Headers({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
    expect(getClientKey(new Headers({ "x-forwarded-for": "4.4.4.4, 5.5.5.5" }))).toBe("4.4.4.4");
    expect(getClientKey(new Headers())).toBe("unknown");
  });

  it("reads configurable rules and tracks store size", () => {
    resetRateLimits();
    applyEnv({ RATE_LIMIT_MUTATION_MAX: "5", RATE_LIMIT_LOGIN_WINDOW_S: "900" });
    expect(getMutationRule().max).toBe(5);
    expect(getLoginRule().windowSeconds).toBe(900);
    consumeRateLimit("a", getMutationRule());
    expect(rateLimitStoreSize()).toBe(1);
  });
});

describe("logger", () => {
  it("redacts configured secrets", () => {
    applyEnv({ VIRTUALIZOR_API_KEY: "supersecretkey", VANTAGE_LOG_LEVEL: "info" });
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logger.info("calling api", { token: "supersecretkey", requestId: "r" });
    const line = spy.mock.calls[0]?.[0] as string;
    expect(line).not.toContain("supersecretkey");
    expect(line).toContain("[redacted]");
  });

  it("drops messages below the active level", () => {
    applyEnv({ VANTAGE_LOG_LEVEL: "error" });
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logger.info("should not appear");
    expect(spy).not.toHaveBeenCalled();
  });

  it("routes warn and error levels", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logger.warn("w");
    logger.error("e");
    expect(warn).toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });
});

describe("guard", () => {
  it("opens access in development when unconfigured", async () => {
    applyEnv({ NODE_ENV: "development", DASHBOARD_PASSWORD: undefined, AUTH_SECRET: undefined });
    await expect(requireApiAuth()).resolves.toBeUndefined();
  });

  it("fails closed in production when unconfigured", async () => {
    applyEnv({ NODE_ENV: "production", DASHBOARD_PASSWORD: undefined, AUTH_SECRET: undefined });
    await expect(requireApiAuth()).rejects.toMatchObject({ code: "AUTH_CONFIG" });
  });

  it("fails closed when only a password is configured", async () => {
    applyEnv({ NODE_ENV: "production", DASHBOARD_PASSWORD: "pw", AUTH_SECRET: undefined });
    await expect(requireApiAuth()).rejects.toMatchObject({ code: "AUTH_CONFIG" });
  });

  it("accepts same-origin mutations", () => {
    applyEnv({ NODE_ENV: "production" });
    const request = makeRequest("https://app.example.com/api/vps/1/power", {
      method: "POST",
      headers: { origin: "https://app.example.com", host: "app.example.com" },
    });
    expect(() => assertMutationOrigin(request)).not.toThrow();
  });

  it("rejects missing origin in production", () => {
    applyEnv({ NODE_ENV: "production" });
    const request = makeRequest("https://app.example.com/api/vps/1/power", { method: "POST" });
    expect(() => assertMutationOrigin(request)).toThrow(AppError);
  });

  it("allows missing origin outside production", () => {
    applyEnv({ NODE_ENV: "development" });
    const request = makeRequest("https://app.example.com/api/vps/1/power", { method: "POST" });
    expect(() => assertMutationOrigin(request)).not.toThrow();
  });

  it("rejects cross-origin mutations", () => {
    applyEnv({ NODE_ENV: "production" });
    const request = makeRequest("https://app.example.com/api/vps/1/power", {
      method: "POST",
      headers: { origin: "https://evil.example", host: "app.example.com" },
    });
    expect(() => assertMutationOrigin(request)).toThrow(AppError);
  });

  it("honours explicitly allowed origins", () => {
    applyEnv({ NODE_ENV: "production", VANTAGE_ALLOWED_ORIGINS: "https://trusted.example" });
    const request = makeRequest("https://app.example.com/api/vps/1/power", {
      method: "POST",
      headers: { origin: "https://trusted.example", host: "app.example.com" },
    });
    expect(() => assertMutationOrigin(request)).not.toThrow();
  });
});

describe("handlers", () => {
  it("wraps a successful GET with auth and envelope", async () => {
    applyEnv({ NODE_ENV: "development" });
    const handler = apiGet(async () => ({ ok: true }));
    const response = await handler(makeRequest("https://app.example.com/api/health"), makeCtx());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ success: true, data: { ok: true } });
  });

  it("normalizes loader errors", async () => {
    applyEnv({ NODE_ENV: "development" });
    const handler = apiGet(async () => {
      throw new VirtualizorError({ code: "VIRTUALIZOR_NOT_FOUND", message: "gone" });
    });
    const response = await handler(makeRequest("https://app.example.com/api/vps/9"), makeCtx());
    expect(response.status).toBe(404);
  });

  it("requires origin and rate limits mutations", async () => {
    applyEnv({ NODE_ENV: "development", RATE_LIMIT_MUTATION_MAX: "1" });
    const handler = apiMutation(async () => ({ done: true }));
    const first = await handler(
      makeRequest("https://app.example.com/api/vps/1/power", {
        method: "POST",
        headers: { origin: "https://app.example.com", host: "app.example.com" },
      }),
      makeCtx(),
    );
    expect(first.status).toBe(200);
    const second = await handler(
      makeRequest("https://app.example.com/api/vps/1/power", {
        method: "POST",
        headers: { origin: "https://app.example.com", host: "app.example.com" },
      }),
      makeCtx(),
    );
    expect(second.status).toBe(429);
  });

  it("rejects cross-origin mutations", async () => {
    applyEnv({ NODE_ENV: "development" });
    const handler = apiMutation(async () => ({ done: true }));
    const response = await handler(
      makeRequest("https://app.example.com/api/vps/1/power", {
        method: "POST",
        headers: { origin: "https://evil.example", host: "app.example.com" },
      }),
      makeCtx(),
    );
    expect(response.status).toBe(403);
  });

  it("resolves route params and rejects missing ones", async () => {
    await expect(requireRouteParam({ params: Promise.resolve({ id: "1" }) }, "id")).resolves.toBe("1");
    await expect(requireRouteParam(makeCtx(), "id")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("parses and validates JSON bodies", async () => {
    const schema = z.object({ name: z.string() });
    const ok = await parseJsonBody(
      makeRequest("https://app.example.com/api/x", { method: "POST", body: JSON.stringify({ name: "a" }) }),
      schema,
    );
    expect(ok).toEqual({ name: "a" });

    await expect(
      parseJsonBody(makeRequest("https://app.example.com/api/x", { method: "POST", body: "not json" }), schema),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });

    await expect(
      parseJsonBody(
        makeRequest("https://app.example.com/api/x", {
          method: "POST",
          headers: { "content-length": "999999999" },
          body: JSON.stringify({ name: "a" }),
        }),
        schema,
      ),
    ).rejects.toMatchObject({ status: 413 });
  });

  it("creates request ids", () => {
    expect(createRequestId()).toMatch(/[0-9a-f-]{8,}/i);
    vi.stubGlobal("crypto", {});
    expect(createRequestId()).toMatch(/^req_/);
  });
});
