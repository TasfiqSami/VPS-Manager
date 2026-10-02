import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyEnv, resetManagedEnv } from "./support/env";
import { SESSION_COOKIE, createSessionToken } from "@/lib/auth";
import { middleware } from "@/middleware";

function makeRequest(path: string, init?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest(`https://app.example.com${path}`, init);
}

beforeEach(() => resetManagedEnv());
afterEach(() => resetManagedEnv());

describe("middleware assets", () => {
  it("passes static assets through", async () => {
    applyEnv({ NODE_ENV: "production", DASHBOARD_PASSWORD: undefined, AUTH_SECRET: undefined });
    const response = await middleware(makeRequest("/_next/static/chunk.js"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });
});

describe("middleware dev-open", () => {
  it("allows everything without authentication", async () => {
    applyEnv({ NODE_ENV: "development", DASHBOARD_PASSWORD: undefined, AUTH_SECRET: undefined });
    const response = await middleware(makeRequest("/api/vps"));
    expect(response.status).toBe(200);
  });
});

describe("middleware blocked", () => {
  it("returns 503 for private api routes", async () => {
    applyEnv({ NODE_ENV: "production", DASHBOARD_PASSWORD: undefined, AUTH_SECRET: undefined });
    const response = await middleware(makeRequest("/api/vps"));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("AUTH_CONFIG");
  });

  it("lets public api routes through", async () => {
    applyEnv({ NODE_ENV: "production", DASHBOARD_PASSWORD: undefined, AUTH_SECRET: undefined });
    const response = await middleware(makeRequest("/api/health"));
    expect(response.status).toBe(200);
  });

  it("allows pages through so the app can render a setup notice", async () => {
    applyEnv({ NODE_ENV: "production", DASHBOARD_PASSWORD: undefined, AUTH_SECRET: undefined });
    const response = await middleware(makeRequest("/"));
    expect(response.status).toBe(200);
  });
});

describe("middleware enabled", () => {
  beforeEach(() => {
    applyEnv({
      NODE_ENV: "production",
      DASHBOARD_PASSWORD: "pw",
      AUTH_SECRET: "test-secret-value-123",
    });
  });

  it("redirects unauthenticated pages to login", async () => {
    const response = await middleware(makeRequest("/network"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
    expect(response.headers.get("location")).toContain("next=%2Fnetwork");
  });

  it("returns 401 for unauthenticated api routes", async () => {
    const response = await middleware(makeRequest("/api/vps"));
    expect(response.status).toBe(401);
  });

  it("allows public pages when unauthenticated", async () => {
    const response = await middleware(makeRequest("/login"));
    expect(response.status).toBe(200);
  });

  it("allows authenticated api routes", async () => {
    const token = await createSessionToken(3600, { AUTH_SECRET: "test-secret-value-123" });
    const response = await middleware(
      makeRequest("/api/vps", { headers: { cookie: `${SESSION_COOKIE}=${token}` } }),
    );
    expect(response.status).toBe(200);
  });

  it("redirects authenticated users away from the login page", async () => {
    const token = await createSessionToken(3600, { AUTH_SECRET: "test-secret-value-123" });
    const response = await middleware(
      makeRequest("/login", { headers: { cookie: `${SESSION_COOKIE}=${token}` } }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.example.com/");
  });
});
