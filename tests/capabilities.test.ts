import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyEnv, installFetchMock, jsonResponse, resetManagedEnv } from "./support/env";
import { detectCapabilities, resetCapabilityCache } from "@/lib/virtualizor/capabilities";
import { resetVirtualizorClient } from "@/lib/virtualizor/client";

beforeEach(() => {
  resetCapabilityCache();
  resetVirtualizorClient();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetManagedEnv();
});

describe("detectCapabilities", () => {
  it("throws when the panel is not configured", async () => {
    await expect(detectCapabilities(true)).rejects.toMatchObject({ code: "VIRTUALIZOR_CONFIG_ERROR" });
  });

  it("marks supported, unsupported and unknown acts", async () => {
    applyEnv({
      VIRTUALIZOR_URL: "https://panel.example.com",
      VIRTUALIZOR_API_KEY: "key",
      VIRTUALIZOR_API_PASS: "pass",
    });
    installFetchMock((call) => {
      if (call.act === "listvs") return jsonResponse({ vps: {} });
      if (call.act === "cpu") return jsonResponse({ error: "not supported" });
      if (call.act === "ram") throw new Error("network down");
      return jsonResponse({ ok: true });
    });

    const report = await detectCapabilities(true);
    expect(report.supported.listvs).toBe(true);
    expect(report.supported.cpu).toBe(false);
    expect(report.supported.ram).toBeUndefined();
    expect(report.detectedAt).toBeDefined();
  });

  it("caches the report until forced", async () => {
    applyEnv({
      VIRTUALIZOR_URL: "https://panel.example.com",
      VIRTUALIZOR_API_KEY: "key",
      VIRTUALIZOR_API_PASS: "pass",
    });
    const { calls } = installFetchMock(() => jsonResponse({ ok: true }));
    await detectCapabilities();
    const firstCount = calls.length;
    await detectCapabilities();
    expect(calls.length).toBe(firstCount);
    await detectCapabilities(true);
    expect(calls.length).toBeGreaterThan(firstCount);
  });
});
