import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyEnv, resetManagedEnv } from "./support/env";
import {
  getConfigStatus,
  getRedactionSecrets,
  loadVirtualizorConfig,
  normalizeBaseUrl,
} from "@/lib/virtualizor/config";
import {
  VirtualizorError,
  classifyApiMessage,
  redactSecrets,
  toVirtualizorError,
} from "@/lib/virtualizor/errors";

afterEach(() => {
  resetManagedEnv();
});

describe("VirtualizorError", () => {
  it("serializes only code and message", () => {
    const error = new VirtualizorError({ code: "VIRTUALIZOR_TIMEOUT", message: "timed out", cause: new Error("secret") });
    expect(error.toShape()).toEqual({ code: "VIRTUALIZOR_TIMEOUT", message: "timed out" });
  });

  it("includes a request id when present", () => {
    const error = new VirtualizorError({ code: "VIRTUALIZOR_UNKNOWN", message: "x", requestId: "abc" });
    expect(error.toShape().requestId).toBe("abc");
  });

  it("identifies instances", () => {
    expect(VirtualizorError.is(new VirtualizorError({ code: "VIRTUALIZOR_UNKNOWN", message: "x" }))).toBe(true);
    expect(VirtualizorError.is(new Error("x"))).toBe(false);
  });
});

describe("redactSecrets", () => {
  it("replaces secrets but ignores very short ones", () => {
    expect(redactSecrets("key=SECRET123", ["SECRET123"])).toBe("key=[redacted]");
    expect(redactSecrets("short abc", ["abc"])).toBe("short abc");
  });

  it("tolerates empty secret lists", () => {
    expect(redactSecrets("text", [])).toBe("text");
  });
});

describe("toVirtualizorError", () => {
  it("passes through existing errors", () => {
    const original = new VirtualizorError({ code: "VIRTUALIZOR_NOT_FOUND", message: "x" });
    expect(toVirtualizorError(original)).toBe(original);
  });

  it("wraps unknown errors", () => {
    expect(toVirtualizorError(new Error("boom")).code).toBe("VIRTUALIZOR_UNKNOWN");
  });
});

describe("classifyApiMessage", () => {
  it("classifies common upstream messages", () => {
    expect(classifyApiMessage("Invalid API key")).toBe("VIRTUALIZOR_AUTH_ERROR");
    expect(classifyApiMessage("Permission denied")).toBe("VIRTUALIZOR_FORBIDDEN");
    expect(classifyApiMessage("VPS not found")).toBe("VIRTUALIZOR_NOT_FOUND");
    expect(classifyApiMessage("Operation not supported")).toBe("VIRTUALIZOR_UNSUPPORTED");
    expect(classifyApiMessage("Rate limit exceeded")).toBe("VIRTUALIZOR_RATE_LIMITED");
    expect(classifyApiMessage("Something odd")).toBe("VIRTUALIZOR_API_ERROR");
  });
});

describe("normalizeBaseUrl", () => {
  it("accepts https and strips trailing slashes", () => {
    expect(normalizeBaseUrl("https://panel.example.com/")).toBe("https://panel.example.com");
    expect(normalizeBaseUrl("https://panel.example.com/sub/")).toBe("https://panel.example.com/sub");
  });

  it("allows http only on loopback", () => {
    expect(normalizeBaseUrl("http://localhost:8000")).toBe("http://localhost:8000");
    expect(normalizeBaseUrl("http://127.0.0.1")).toBe("http://127.0.0.1");
    expect(() => normalizeBaseUrl("http://panel.example.com")).toThrow(VirtualizorError);
  });

  it("rejects malformed urls", () => {
    expect(() => normalizeBaseUrl("not a url")).toThrow(VirtualizorError);
  });
});

describe("loadVirtualizorConfig", () => {
  beforeEach(() => resetManagedEnv());

  it("reports every missing variable", () => {
    const result = loadVirtualizorConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual(["VIRTUALIZOR_URL", "VIRTUALIZOR_API_KEY", "VIRTUALIZOR_API_PASS"]);
      expect(result.error.code).toBe("VIRTUALIZOR_CONFIG_ERROR");
    }
  });

  it("loads a full configuration with defaults and overrides", () => {
    applyEnv({
      VIRTUALIZOR_URL: "https://panel.example.com",
      VIRTUALIZOR_API_KEY: "key",
      VIRTUALIZOR_API_PASS: "pass",
      VIRTUALIZOR_VPS_ID: "7",
      VIRTUALIZOR_TIMEOUT_MS: "5000",
      VIRTUALIZOR_CAPABILITY_TTL_S: "60",
    });
    const result = loadVirtualizorConfig();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.baseUrl).toBe("https://panel.example.com");
      expect(result.config.vpsId).toBe("7");
      expect(result.config.timeoutMs).toBe(5000);
      expect(result.config.capabilityTtlMs).toBe(60_000);
      expect(result.config.longTimeoutMs).toBe(60_000);
    }
  });

  it("clamps out-of-range numeric settings", () => {
    applyEnv({
      VIRTUALIZOR_URL: "https://panel.example.com",
      VIRTUALIZOR_API_KEY: "key",
      VIRTUALIZOR_API_PASS: "pass",
      VIRTUALIZOR_TIMEOUT_MS: "1",
    });
    const result = loadVirtualizorConfig();
    if (result.ok) expect(result.config.timeoutMs).toBe(1000);
  });

  it("surfaces an invalid url as a config error", () => {
    applyEnv({
      VIRTUALIZOR_URL: "http://public.example.com",
      VIRTUALIZOR_API_KEY: "key",
      VIRTUALIZOR_API_PASS: "pass",
    });
    const result = loadVirtualizorConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VIRTUALIZOR_CONFIG_ERROR");
  });
});

describe("getConfigStatus", () => {
  beforeEach(() => resetManagedEnv());

  it("reports missing and non-secret booleans", () => {
    const status = getConfigStatus();
    expect(status.configured).toBe(false);
    expect(status.hasApiKey).toBe(false);
    expect(status.baseUrl).toBeUndefined();
  });

  it("reports a configured status without leaking secrets", () => {
    applyEnv({
      VIRTUALIZOR_URL: "https://panel.example.com",
      VIRTUALIZOR_API_KEY: "key",
      VIRTUALIZOR_API_PASS: "pass",
      VIRTUALIZOR_VPS_ID: "3",
    });
    const status = getConfigStatus();
    expect(status).toMatchObject({ configured: true, hasApiKey: true, hasApiPass: true, hasVpsId: true });
    expect(status.baseUrl).toBe("https://panel.example.com");
    expect(status.timeoutMs).toBeDefined();
  });

  it("leaves baseUrl undefined for invalid urls", () => {
    applyEnv({
      VIRTUALIZOR_URL: "ftp://bad",
      VIRTUALIZOR_API_KEY: "key",
      VIRTUALIZOR_API_PASS: "pass",
    });
    expect(getConfigStatus().baseUrl).toBeUndefined();
  });
});

describe("getRedactionSecrets", () => {
  beforeEach(() => resetManagedEnv());

  it("collects configured secrets only", () => {
    expect(getRedactionSecrets()).toEqual([]);
    applyEnv({ VIRTUALIZOR_API_KEY: "a", VIRTUALIZOR_API_PASS: "b", AUTH_SECRET: "c", DASHBOARD_PASSWORD: "d" });
    expect(getRedactionSecrets()).toEqual(["a", "b", "c", "d"]);
  });
});
