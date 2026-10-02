import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  applySshKeysSchema,
  dnsRecordSchema,
  firewallRuleSchema,
  formatZodError,
  hostnameSchema,
  isoAddSchema,
  osReinstallSchema,
  passwordChangeSchema,
  passwordSchema,
  powerActionSchema,
  reverseDnsSchema,
  serviceActionSchema,
  sshKeySchema,
  vncPasswordSchema,
  volumeSchema,
  vpsIdSchema,
} from "@/lib/virtualizor/validators";

const VALID_KEY = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHm0IYbqC9j0mVwZ8sJ8Y0mQx3r0h user@host";

describe("hostnameSchema", () => {
  it("accepts valid hostnames", () => {
    expect(hostnameSchema.parse("vps.example.com")).toBe("vps.example.com");
    expect(hostnameSchema.parse("localhost")).toBe("localhost");
  });

  it("rejects invalid hostnames", () => {
    expect(() => hostnameSchema.parse("-bad.com")).toThrow();
    expect(() => hostnameSchema.parse("bad-.com")).toThrow();
    expect(() => hostnameSchema.parse("has space")).toThrow();
    expect(() => hostnameSchema.parse("")).toThrow();
  });
});

describe("password schemas", () => {
  it("enforces minimum and maximum length", () => {
    expect(passwordSchema.parse("12345678")).toBe("12345678");
    expect(() => passwordSchema.parse("short")).toThrow();
    expect(() => passwordSchema.parse("x".repeat(129))).toThrow();
  });

  it("requires matching confirmation", () => {
    expect(passwordChangeSchema.parse({ newPassword: "12345678", confirmPassword: "12345678" }).newPassword).toBe("12345678");
    expect(() => passwordChangeSchema.parse({ newPassword: "12345678", confirmPassword: "other" })).toThrow();
  });
});

describe("misc action schemas", () => {
  it("validates vpsId and power actions", () => {
    expect(vpsIdSchema.parse("123")).toBe("123");
    expect(() => vpsIdSchema.parse("abc")).toThrow();
    expect(powerActionSchema.parse({ action: "restart" }).action).toBe("restart");
    expect(() => powerActionSchema.parse({ action: "explode" })).toThrow();
  });

  it("validates service actions and kill payloads", () => {
    expect(serviceActionSchema.parse({ action: "start", services: ["nginx"] }).services).toEqual(["nginx"]);
    expect(() => serviceActionSchema.parse({ action: "start", services: [] })).toThrow();
  });

  it("validates VNC passwords (6-8 chars)", () => {
    expect(vncPasswordSchema.parse({ password: "abcdef" }).password).toBe("abcdef");
    expect(() => vncPasswordSchema.parse({ password: "abc" })).toThrow();
    expect(() => vncPasswordSchema.parse({ password: "abcdefghi" })).toThrow();
  });
});

describe("osReinstallSchema", () => {
  it("coerces numeric os ids and checks confirmation", () => {
    const parsed = osReinstallSchema.parse({ osId: 12, newPassword: "12345678", confirmPassword: "12345678" });
    expect(parsed.osId).toBe("12");
    expect(() => osReinstallSchema.parse({ osId: "1", newPassword: "12345678", confirmPassword: "x" })).toThrow();
  });
});

describe("firewallRuleSchema", () => {
  it("accepts a plan with at least one rule", () => {
    const parsed = firewallRuleSchema.parse({
      name: "web",
      defaultPolicy: "DROP",
      rules: [{ action: "ACCEPT", protocol: "TCP", port: "443" }],
    });
    expect(parsed.rules).toHaveLength(1);
  });

  it("rejects empty rule sets and unknown protocols", () => {
    expect(() => firewallRuleSchema.parse({ name: "web", rules: [] })).toThrow();
    expect(() =>
      firewallRuleSchema.parse({ name: "web", rules: [{ action: "ACCEPT", protocol: "SCTP" }] }),
    ).toThrow();
  });
});

describe("sshKeySchema", () => {
  it("accepts OpenSSH public keys", () => {
    expect(sshKeySchema.parse({ name: "k", value: VALID_KEY }).name).toBe("k");
  });

  it("rejects malformed keys", () => {
    expect(() => sshKeySchema.parse({ name: "k", value: "not-a-key" })).toThrow();
    expect(() => sshKeySchema.parse({ name: "", value: VALID_KEY })).toThrow();
  });

  it("validates the apply payload", () => {
    expect(applySshKeysSchema.parse({ keyIds: [1, "2"] }).keyIds).toEqual([1, "2"]);
    expect(() => applySshKeysSchema.parse({ keyIds: [] })).toThrow();
  });
});

describe("volumeSchema", () => {
  it("coerces size and applies default format", () => {
    const parsed = volumeSchema.parse({ name: "vol-1", size: "20" });
    expect(parsed.size).toBe(20);
    expect(parsed.format).toBe("ext4");
  });

  it("validates name, size and mount point", () => {
    expect(() => volumeSchema.parse({ name: "bad name", size: 1 })).toThrow();
    expect(() => volumeSchema.parse({ name: "ok", size: 0 })).toThrow();
    expect(() => volumeSchema.parse({ name: "ok", size: 1, mountPoint: "relative" })).toThrow();
  });
});

describe("reverseDns and dns schemas", () => {
  it("validates reverse dns addresses", () => {
    expect(reverseDnsSchema.parse({ ip: "1.1.1.1", domain: "a.com" }).ip).toBe("1.1.1.1");
    expect(() => reverseDnsSchema.parse({ ip: "nope", domain: "a.com" })).toThrow();
  });

  it("validates dns records", () => {
    const parsed = dnsRecordSchema.parse({ domainId: 5, name: "www", type: "A", content: "1.1.1.1", ttl: "300" });
    expect(parsed.ttl).toBe(300);
    expect(() => dnsRecordSchema.parse({ domainId: 5, name: "www", type: "ZZZ", content: "x" })).toThrow();
  });
});

describe("isoAddSchema", () => {
  it("requires an https url", () => {
    expect(isoAddSchema.parse({ filename: "x.iso", isoUrl: "https://ex.com/x.iso" }).filename).toBe("x.iso");
    expect(() => isoAddSchema.parse({ filename: "x.iso", isoUrl: "http://ex.com/x.iso" })).toThrow();
    expect(() => isoAddSchema.parse({ filename: "x.iso", isoUrl: "not-a-url" })).toThrow();
  });
});

describe("formatZodError", () => {
  it("flattens issues into a readable string", () => {
    try {
      hostnameSchema.parse("-bad");
      throw new Error("expected to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      const message = formatZodError(error as ZodError);
      expect(message.length).toBeGreaterThan(0);
    }
  });
});
