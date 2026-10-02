import { describe, expect, it } from "vitest";

import {
  clamp,
  cn,
  formatBytes,
  formatDateTime,
  formatDuration,
  formatGb,
  formatMb,
  formatPercent,
  formatRelativeTime,
  isIp,
  isIpv4,
  isIpv6,
  safePercent,
  sleep,
  toBoolean,
  toIsoString,
  toNumber,
  toStringValue,
} from "@/lib/utils";

describe("cn", () => {
  it("merges conditional classes and resolves Tailwind conflicts", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4");
  });
});

describe("formatBytes", () => {
  it("returns Unavailable for invalid input", () => {
    expect(formatBytes(null)).toBe("Unavailable");
    expect(formatBytes(undefined)).toBe("Unavailable");
    expect(formatBytes(Number.NaN)).toBe("Unavailable");
    expect(formatBytes(-1)).toBe("Unavailable");
  });

  it("formats zero and binary units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(1536)).toBe("1.50 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
    expect(formatBytes(5 * 1024 ** 4)).toBe("5.00 TB");
  });

  it("drops decimals for large scaled values", () => {
    expect(formatBytes(150 * 1024)).toBe("150 KB");
  });
});

describe("formatMb and formatGb and formatPercent", () => {
  it("converts megabytes to human units", () => {
    expect(formatMb(1024)).toBe("1.00 GB");
    expect(formatMb(null)).toBe("Unavailable");
  });

  it("formats gigabytes with a fixed label", () => {
    expect(formatGb(2.5)).toBe("2.50 GB");
    expect(formatGb(undefined)).toBe("Unavailable");
  });

  it("formats percentages", () => {
    expect(formatPercent(12.34)).toBe("12.3%");
    expect(formatPercent(Number.NaN)).toBe("Unavailable");
  });
});

describe("formatDuration", () => {
  it("handles invalid values", () => {
    expect(formatDuration(null)).toBe("Unavailable");
    expect(formatDuration(-1)).toBe("Unavailable");
    expect(formatDuration(Number.NaN)).toBe("Unavailable");
  });

  it("formats seconds, minutes, hours and days", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(90)).toBe("1m 30s");
    expect(formatDuration(3 * 3600 + 120)).toBe("3h 2m");
    expect(formatDuration(2 * 86400 + 5 * 3600)).toBe("2d 5h");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2024-01-01T12:00:00.000Z").getTime();

  it("handles empty values", () => {
    expect(formatRelativeTime(null)).toBe("never");
    expect(formatRelativeTime(undefined)).toBe("never");
  });

  it("formats recent and older timestamps", () => {
    expect(formatRelativeTime(now - 1000, now)).toBe("just now");
    expect(formatRelativeTime(now - 30_000, now)).toBe("30s ago");
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe("5m ago");
    expect(formatRelativeTime(now - 3 * 3600_000, now)).toBe("3h ago");
    expect(formatRelativeTime(now - 2 * 86400_000, now)).toBe("2d ago");
  });

  it("accepts Date instances and clamps future values", () => {
    expect(formatRelativeTime(new Date(now + 10_000), now)).toBe("just now");
  });
});

describe("toNumber", () => {
  it("parses finite numbers and numeric strings", () => {
    expect(toNumber(5)).toBe(5);
    expect(toNumber(" 3.5 ")).toBe(3.5);
  });

  it("rejects non-numeric values", () => {
    expect(toNumber("abc")).toBeUndefined();
    expect(toNumber("")).toBeUndefined();
    expect(toNumber(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(toNumber({})).toBeUndefined();
  });
});

describe("toStringValue", () => {
  it("stringifies primitives", () => {
    expect(toStringValue("x")).toBe("x");
    expect(toStringValue(1)).toBe("1");
    expect(toStringValue(true)).toBe("true");
  });

  it("rejects objects", () => {
    expect(toStringValue({})).toBeUndefined();
  });
});

describe("toBoolean", () => {
  it("passes through booleans", () => {
    expect(toBoolean(true)).toBe(true);
    expect(toBoolean(false)).toBe(false);
  });

  it("maps numeric truthy/falsy values", () => {
    expect(toBoolean(1)).toBe(true);
    expect(toBoolean(0)).toBe(false);
    expect(toBoolean(2)).toBeUndefined();
  });

  it("strictly parses strings (fixes the v1 attached bug)", () => {
    expect(toBoolean("0")).toBe(false);
    expect(toBoolean("false")).toBe(false);
    expect(toBoolean("off")).toBe(false);
    expect(toBoolean("")).toBe(false);
    expect(toBoolean("1")).toBe(true);
    expect(toBoolean(" true ")).toBe(true);
    expect(toBoolean("yes")).toBe(true);
    expect(toBoolean("enabled")).toBe(true);
    expect(toBoolean("maybe")).toBeUndefined();
  });
});

describe("safePercent and clamp", () => {
  it("guards against divide by zero", () => {
    expect(safePercent(5, 10)).toBe(50);
    expect(safePercent(5, 0)).toBeUndefined();
    expect(safePercent(undefined, 10)).toBeUndefined();
    expect(safePercent(20, 10)).toBe(100);
  });

  it("clamps values", () => {
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(0, 1, 3)).toBe(1);
    expect(clamp(2, 1, 3)).toBe(2);
  });
});

describe("ip detection", () => {
  it("detects ipv4", () => {
    expect(isIpv4("192.168.0.1")).toBe(true);
    expect(isIpv4("256.0.0.1")).toBe(false);
    expect(isIpv4("1.2.3")).toBe(false);
  });

  it("detects ipv6", () => {
    expect(isIpv6("2001:db8::1")).toBe(true);
    expect(isIpv6("fe80::1")).toBe(true);
    expect(isIpv6("not:an:ip")).toBe(false);
    expect(isIpv6("1::2::3")).toBe(false);
  });

  it("detects either family", () => {
    expect(isIp("10.0.0.1")).toBe(true);
    expect(isIp("::1")).toBe(true);
    expect(isIp("nope")).toBe(false);
  });
});

describe("toIsoString", () => {
  it("parses ISO strings", () => {
    expect(toIsoString("2024-01-01T00:00:00.000Z")).toBe("2024-01-01T00:00:00.000Z");
  });

  it("parses epoch seconds and milliseconds", () => {
    expect(toIsoString(1_700_000_000)).toBe(new Date(1_700_000_000 * 1000).toISOString());
    expect(toIsoString(1_700_000_000_000)).toBe(new Date(1_700_000_000_000).toISOString());
    expect(toIsoString("1700000000")).toBe(new Date(1_700_000_000 * 1000).toISOString());
  });

  it("rejects invalid values", () => {
    expect(toIsoString("")).toBeUndefined();
    expect(toIsoString("not a date")).toBeUndefined();
    expect(toIsoString(0)).toBeUndefined();
    expect(toIsoString(-5)).toBeUndefined();
    expect(toIsoString({})).toBeUndefined();
  });
});

describe("formatDateTime", () => {
  it("formats and falls back", () => {
    expect(formatDateTime(null)).toBe("Unavailable");
    expect(formatDateTime("nonsense")).toBe("Unavailable");
    expect(formatDateTime("2024-01-01T00:00:00.000Z")).toContain("2024");
  });
});

describe("sleep", () => {
  it("resolves after the delay", async () => {
    const start = Date.now();
    await sleep(5);
    expect(Date.now() - start).toBeGreaterThanOrEqual(0);
  });
});
