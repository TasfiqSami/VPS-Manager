import { beforeEach, describe, expect, it } from "vitest";

import { auditResources, auditStoreSize, listAudit, recordAudit, resetAudit } from "@/lib/api/audit";
import type { AuditInput } from "@/lib/api/audit";
import { applyEnv, resetManagedEnv } from "./support/env";

function input(overrides: Partial<AuditInput> = {}): AuditInput {
  return {
    method: "POST",
    path: "/api/vps/42/power",
    actor: "dev-session",
    ip: "127.0.0.1",
    success: true,
    status: 200,
    durationMs: 12,
    requestId: "req-1",
    ...overrides,
  };
}

beforeEach(() => {
  resetAudit();
  resetManagedEnv();
});

describe("audit trail", () => {
  it("records entries newest-first and preserves fields", () => {
    recordAudit(input({ requestId: "req-1" }));
    recordAudit(input({ requestId: "req-2", path: "/api/volumes" }));

    const rows = listAudit();
    expect(rows).toHaveLength(2);
    expect(rows[0]?.requestId).toBe("req-2");
    expect(rows[1]?.requestId).toBe("req-1");
    expect(rows[0]?.resource).toBe("volumes");
  });

  it("derives resource and target from the path", () => {
    recordAudit(input({ path: "/api/vps/42/power" }));
    const [row] = listAudit();
    expect(row?.resource).toBe("vps");
    expect(row?.target).toBe("power");
  });

  it("stores an explicit target when provided", () => {
    recordAudit(input({ path: "/api/vps/42/power", target: "42" }));
    const [row] = listAudit();
    expect(row?.target).toBe("42");
  });

  it("filters by resource", () => {
    recordAudit(input({ path: "/api/vps/42/power" }));
    recordAudit(input({ path: "/api/volumes" }));
    expect(listAudit({ resource: "volumes" })).toHaveLength(1);
    expect(listAudit({ resource: "all" })).toHaveLength(2);
  });

  it("filters by success flag", () => {
    recordAudit(input({ success: true }));
    recordAudit(input({ success: false, status: 500, code: "BOOM" }));
    expect(listAudit({ success: true })).toHaveLength(1);
    expect(listAudit({ success: false })).toHaveLength(1);
  });

  it("searches across path, actor, ip and code", () => {
    recordAudit(input({ actor: "operator-7", ip: "10.1.2.3", path: "/api/vps/9/power" }));
    expect(listAudit({ search: "operator-7" })).toHaveLength(1);
    expect(listAudit({ search: "10.1.2.3" })).toHaveLength(1);
    expect(listAudit({ search: "/power" })).toHaveLength(1);
    expect(listAudit({ search: "missing" })).toHaveLength(0);
  });

  it("honours the explicit limit", () => {
    for (let index = 0; index < 5; index += 1) recordAudit(input({ requestId: `req-${index}` }));
    expect(listAudit({ limit: 2 })).toHaveLength(2);
  });

  it("caps the buffer using VANTAGE_AUDIT_LIMIT", () => {
    applyEnv({ VANTAGE_AUDIT_LIMIT: "3" });
    for (let index = 0; index < 6; index += 1) recordAudit(input({ requestId: `req-${index}` }));
    expect(auditStoreSize()).toBe(3);
    expect(listAudit({ limit: 100 })).toHaveLength(3);
  });

  it("ignores an invalid VANTAGE_AUDIT_LIMIT", () => {
    applyEnv({ VANTAGE_AUDIT_LIMIT: "not-a-number" });
    recordAudit(input());
    expect(auditStoreSize()).toBe(1);
  });

  it("lists unique resources sorted alphabetically", () => {
    recordAudit(input({ path: "/api/vps/42/power" }));
    recordAudit(input({ path: "/api/volumes" }));
    recordAudit(input({ path: "/api/volumes/1" }));
    expect(auditResources()).toEqual(["volumes", "vps"]);
  });

  it("clears the trail on reset", () => {
    recordAudit(input());
    expect(auditStoreSize()).toBe(1);
    resetAudit();
    expect(auditStoreSize()).toBe(0);
    expect(listAudit()).toHaveLength(0);
  });
});
