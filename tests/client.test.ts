import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  VirtualizorClient,
  appendParams,
  extractSuccessMessage,
  extractUpstreamError,
  getVirtualizorClient,
  resetVirtualizorClient,
} from "@/lib/virtualizor/client";
import type { VirtualizorConfig } from "@/lib/virtualizor/config";
import { VirtualizorError } from "@/lib/virtualizor/errors";
import { installFetchMock, jsonResponse } from "./support/env";

function makeConfig(overrides: Partial<VirtualizorConfig> = {}): VirtualizorConfig {
  return {
    baseUrl: "https://panel.example.com",
    apiKey: "key-123456",
    apiPass: "pass-abcdef",
    timeoutMs: 1000,
    longTimeoutMs: 2000,
    maxResponseBytes: 1024 * 1024,
    capabilityTtlMs: 60_000,
    ...overrides,
  };
}

function abortError(): Error {
  return Object.assign(new Error("aborted"), { name: "AbortError" });
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetVirtualizorClient();
  vi.restoreAllMocks();
});

describe("appendParams", () => {
  it("encodes arrays using the bracket convention", () => {
    const params = new URLSearchParams();
    appendParams(params, { flag: 1, empty: "",  skip: undefined, list: ["a", "b"], "pre[]": ["x"] });
    expect(params.get("flag")).toBe("1");
    expect(params.getAll("list[]")).toEqual(["a", "b"]);
    expect(params.getAll("pre[]")).toEqual(["x"]);
    expect(params.has("skip")).toBe(false);
  });

  it("tolerates undefined input", () => {
    const params = new URLSearchParams();
    appendParams(params, undefined);
    expect(params.toString()).toBe("");
  });

  it("skips null entries inside arrays", () => {
    const params = new URLSearchParams();
    appendParams(params, { list: [null, "a"] });
    expect(params.getAll("list[]")).toEqual(["a"]);
  });
});

describe("extractUpstreamError and extractSuccessMessage", () => {
  it("extracts string, array and nested errors", () => {
    expect(extractUpstreamError({ error: "bad" })).toBe("bad");
    expect(extractUpstreamError({ error: ["a", "b"] })).toBe("a b");
    expect(extractUpstreamError({ msgs: "oops" })).toBe("oops");
    expect(extractUpstreamError({ msgs: { error: "nested" } })).toBe("nested");
    expect(extractUpstreamError({})).toBeUndefined();
  });

  it("extracts success messages with fallback", () => {
    expect(extractSuccessMessage({ done: { msg: "done!" } })).toBe("done!");
    expect(extractSuccessMessage({ msg: "ok" })).toBe("ok");
    expect(extractSuccessMessage({}, "fallback")).toBe("fallback");
  });
});

describe("VirtualizorClient.request", () => {
  it("builds an authenticated URL and returns the payload", async () => {
    const { calls } = installFetchMock(() => jsonResponse({ done: { msg: "ok" } }));
    const client = new VirtualizorClient(makeConfig());
    const result = await client.request({ act: "listvs", vpsId: null, query: { show: "1" }, body: undefined });
    expect(result.payload).toMatchObject({ done: { msg: "ok" } });

    const call = calls[0]!;
    expect(call.url.searchParams.get("api")).toBe("json");
    expect(call.url.searchParams.get("act")).toBe("listvs");
    expect(call.url.searchParams.get("apikey")).toBe("key-123456");
    expect(call.url.searchParams.get("apipass")).toBe("pass-abcdef");
    expect(call.url.searchParams.has("svs")).toBe(false);
    expect(call.method).toBe("GET");
  });

  it("includes the configured vps id and posts form bodies", async () => {
    const { calls } = installFetchMock(() => jsonResponse({ done: { msg: "ok" } }));
    const client = new VirtualizorClient(makeConfig({ vpsId: "9" }));
    await client.request({ act: "hostname", method: "POST", body: { newhost: "x" } });
    const call = calls[0]!;
    expect(call.url.searchParams.get("svs")).toBe("9");
    expect(call.method).toBe("POST");
    expect(call.init?.body).toBe("newhost=x");
    expect((call.init?.headers as Record<string, string>)["Content-Type"]).toContain("urlencoded");
  });

  it("omits svs when explicitly null", async () => {
    const { calls } = installFetchMock(() => jsonResponse({}));
    const client = new VirtualizorClient(makeConfig({ vpsId: "9" }));
    await client.request({ act: "listvs", vpsId: null });
    expect(calls[0]!.url.searchParams.has("svs")).toBe(false);
  });

  it("maps abort to a timeout error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(abortError())) as unknown as typeof fetch);
    const client = new VirtualizorClient(makeConfig());
    await expect(client.request({ act: "cpu" })).rejects.toMatchObject({ code: "VIRTUALIZOR_TIMEOUT" });
  });

  it("maps certificate failures to a TLS error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(Object.assign(new Error("bad certificate"), { code: "CERT_HAS_EXPIRED" }))) as unknown as typeof fetch,
    );
    const client = new VirtualizorClient(makeConfig());
    await expect(client.request({ act: "cpu" })).rejects.toMatchObject({ code: "VIRTUALIZOR_TLS_ERROR" });
  });

  it("maps generic failures to a network error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("dns fail"))) as unknown as typeof fetch);
    const client = new VirtualizorClient(makeConfig());
    await expect(client.request({ act: "cpu" })).rejects.toMatchObject({ code: "VIRTUALIZOR_NETWORK_ERROR" });
  });

  it("refuses redirects instead of leaking credentials", async () => {
    installFetchMock(() => new Response("", { status: 302, headers: { location: "https://evil.example" } }));
    const client = new VirtualizorClient(makeConfig());
    await expect(client.request({ act: "cpu" })).rejects.toMatchObject({ code: "VIRTUALIZOR_HTTP_ERROR" });
  });

  it("rejects oversized responses", async () => {
    installFetchMock(() => new Response("x".repeat(500), { status: 200 }));
    const client = new VirtualizorClient(makeConfig({ maxResponseBytes: 64 }));
    await expect(client.request({ act: "cpu" })).rejects.toMatchObject({ code: "VIRTUALIZOR_RESPONSE_TOO_LARGE" });
  });

  it("rejects non-JSON responses", async () => {
    installFetchMock(() => new Response("<html>error</html>", { status: 200 }));
    const client = new VirtualizorClient(makeConfig());
    await expect(client.request({ act: "cpu" })).rejects.toMatchObject({ code: "VIRTUALIZOR_INVALID_RESPONSE" });
  });

  it("rejects JSON that is not an object", async () => {
    installFetchMock(() => jsonResponse([1, 2, 3]));
    const client = new VirtualizorClient(makeConfig());
    await expect(client.request({ act: "cpu" })).rejects.toMatchObject({ code: "VIRTUALIZOR_INVALID_RESPONSE" });
  });

  it("classifies upstream API errors and redacts secrets", async () => {
    installFetchMock(() => jsonResponse({ error: "Invalid API key key-123456" }));
    const client = new VirtualizorClient(makeConfig());
    await expect(client.request({ act: "cpu" })).rejects.toMatchObject({ code: "VIRTUALIZOR_AUTH_ERROR" });
    try {
      await client.request({ act: "cpu" });
    } catch (error) {
      expect((error as VirtualizorError).message).not.toContain("key-123456");
    }
  });

  it("maps http failures", async () => {
    installFetchMock(() => new Response("nope", { status: 500 }));
    const client = new VirtualizorClient(makeConfig());
    await expect(client.request({ act: "cpu" })).rejects.toMatchObject({ code: "VIRTUALIZOR_HTTP_ERROR" });
  });

  it("returns an empty object for an empty body", async () => {
    installFetchMock(() => new Response("", { status: 200 }));
    const client = new VirtualizorClient(makeConfig());
    const result = await client.request({ act: "cpu" });
    expect(result.payload).toEqual({});
  });

  it("exposes connection info without secrets", () => {
    const client = new VirtualizorClient(makeConfig({ vpsId: "1" }));
    expect(client.connectionInfo).toEqual({
      baseUrl: "https://panel.example.com",
      vpsId: "1",
      hasCredentials: true,
    });
  });

  it("pings without a destructive action", async () => {
    const { calls } = installFetchMock(() => jsonResponse({ cpu: {} }));
    const client = new VirtualizorClient(makeConfig());
    const result = await client.ping();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(calls[0]!.act).toBe("cpu");
  });
});

describe("getVirtualizorClient", () => {
  it("memoizes per configuration and resets", () => {
    const a = getVirtualizorClient(makeConfig());
    const b = getVirtualizorClient(makeConfig());
    expect(a).toBe(b);
    const c = getVirtualizorClient(makeConfig({ baseUrl: "https://other.example.com" }));
    expect(c).not.toBe(a);
    resetVirtualizorClient();
    expect(getVirtualizorClient(makeConfig())).not.toBe(c);
  });
});

describe("long-running requests", () => {
  beforeEach(() => resetVirtualizorClient());

  it("uses the long timeout for long running requests", async () => {
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
    installFetchMock(() => jsonResponse({ done: { msg: "ok" } }));
    const client = new VirtualizorClient(makeConfig({ timeoutMs: 1000, longTimeoutMs: 9000 }));
    await client.request({ act: "ostemplate", longRunning: true });
    const durations = timeoutSpy.mock.calls.map((call) => call[1]);
    expect(durations).toContain(9000);
    timeoutSpy.mockRestore();
  });
});
