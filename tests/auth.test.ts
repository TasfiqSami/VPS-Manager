import { afterEach, describe, expect, it } from "vitest";

import {
  SESSION_COOKIE,
  createSessionToken,
  getAuthConfig,
  sessionCookieOptions,
  timingSafeEqual,
  verifyPassword,
  verifySessionToken,
} from "@/lib/auth";
import { resetManagedEnv } from "./support/env";

afterEach(() => resetManagedEnv());

describe("getAuthConfig", () => {
  it("is dev-open when nothing is configured outside production", () => {
    expect(getAuthConfig({}, "development")).toMatchObject({ mode: "dev-open" });
  });

  it("is blocked in production without credentials", () => {
    const config = getAuthConfig({}, "production");
    expect(config.mode).toBe("blocked");
    expect(config.reason).toMatch(/not configured/i);
  });

  it("is blocked when only a password is set", () => {
    expect(getAuthConfig({ DASHBOARD_PASSWORD: "pw" }, "production").mode).toBe("blocked");
  });

  it("is blocked when only a secret is set", () => {
    expect(getAuthConfig({ AUTH_SECRET: "s" }, "production").mode).toBe("blocked");
  });

  it("is enabled with both and clamps the session window", () => {
    const config = getAuthConfig({ DASHBOARD_PASSWORD: "pw", AUTH_SECRET: "s", AUTH_SESSION_HOURS: "48" }, "production");
    expect(config.mode).toBe("enabled");
    expect(config.sessionSeconds).toBe(48 * 3600);

    const clamped = getAuthConfig({ DASHBOARD_PASSWORD: "pw", AUTH_SECRET: "s", AUTH_SESSION_HOURS: "99999" }, "production");
    expect(clamped.sessionSeconds).toBe(24 * 30 * 3600);

    const invalid = getAuthConfig({ DASHBOARD_PASSWORD: "pw", AUTH_SECRET: "s", AUTH_SESSION_HOURS: "abc" }, "production");
    expect(invalid.sessionSeconds).toBe(12 * 3600);
  });
});

describe("timingSafeEqual", () => {
  it("compares equal and different strings", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "ab")).toBe(false);
  });
});

describe("session tokens", () => {
  it("round-trips a valid token", async () => {
    const env = { AUTH_SECRET: "super-secret-value" };
    const token = await createSessionToken(3600, env);
    expect(token).toBeDefined();
    await expect(verifySessionToken(token, env)).resolves.toBe(true);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken(3600, { AUTH_SECRET: "one" });
    await expect(verifySessionToken(token, { AUTH_SECRET: "two" })).resolves.toBe(false);
  });

  it("rejects malformed and missing tokens", async () => {
    const env = { AUTH_SECRET: "s" };
    await expect(verifySessionToken(undefined, env)).resolves.toBe(false);
    await expect(verifySessionToken("only-one-part", env)).resolves.toBe(false);
    await expect(verifySessionToken("a.b.c", env)).resolves.toBe(false);
  });

  it("returns undefined when no secret is configured", async () => {
    await expect(createSessionToken(3600, {})).resolves.toBeUndefined();
  });

  it("rejects an expired token", async () => {
    const env = { AUTH_SECRET: "s" };
    const token = await createSessionToken(-10, env);
    await expect(verifySessionToken(token, env)).resolves.toBe(false);
  });

  it("rejects a token with a corrupt signature", async () => {
    const env = { AUTH_SECRET: "s" };
    const token = await createSessionToken(3600, env);
    const [body] = (token ?? "").split(".");
    await expect(verifySessionToken(`${body}.!!!!`, env)).resolves.toBe(false);
  });
});

describe("verifyPassword", () => {
  it("checks the configured password", () => {
    expect(verifyPassword("hunter2", { DASHBOARD_PASSWORD: "hunter2" })).toBe(true);
    expect(verifyPassword("wrong", { DASHBOARD_PASSWORD: "hunter2" })).toBe(false);
    expect(verifyPassword("x", {})).toBe(false);
  });
});

describe("sessionCookieOptions", () => {
  it("builds hardened cookie options", () => {
    expect(sessionCookieOptions(3600, true)).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 3600,
    });
    expect(SESSION_COOKIE).toBe("vantage_session");
  });
});
