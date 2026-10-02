import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyEnv, installFetchMock, jsonResponse, resetManagedEnv, TEST_ENV } from "./support/env";
import { resetRateLimits } from "@/lib/api/rate-limit";
import { resetCapabilityCache } from "@/lib/virtualizor/capabilities";
import { resetVirtualizorClient } from "@/lib/virtualizor/client";
import type { RouteContext } from "@/lib/api/handlers";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

import * as vpsList from "@/app/api/vps/route";
import * as vpsInfo from "@/app/api/vps/[id]/route";
import * as vpsPower from "@/app/api/vps/[id]/power/route";
import * as vpsStats from "@/app/api/vps/[id]/stats/route";
import * as vpsMonitor from "@/app/api/vps/[id]/monitor/route";
import * as vpsMonitorHistory from "@/app/api/vps/[id]/monitor/history/route";
import * as vpsVnc from "@/app/api/vps/[id]/vnc/route";
import * as vpsRescue from "@/app/api/vps/[id]/rescue/route";
import * as vpsReinstall from "@/app/api/vps/[id]/reinstall/route";
import * as vpsHostname from "@/app/api/vps/[id]/hostname/route";
import * as vpsRootPassword from "@/app/api/vps/[id]/root-password/route";
import * as vpsFirewall from "@/app/api/vps/[id]/firewall/route";
import * as vpsBackups from "@/app/api/vps/[id]/backups/route";
import * as vpsBackupId from "@/app/api/vps/[id]/backups/[backupId]/route";
import * as vpsIsos from "@/app/api/vps/[id]/isos/route";
import * as vpsIsoId from "@/app/api/vps/[id]/isos/[isoId]/route";
import * as vpsServices from "@/app/api/vps/[id]/services/route";
import * as vpsProcesses from "@/app/api/vps/[id]/processes/route";
import * as vpsTasks from "@/app/api/vps/[id]/tasks/route";
import * as vpsSshKeys from "@/app/api/vps/[id]/ssh-keys/route";
import * as volumes from "@/app/api/volumes/route";
import * as volumeId from "@/app/api/volumes/[volumeId]/route";
import * as reverseDns from "@/app/api/reverse-dns/route";
import * as reverseDnsId from "@/app/api/reverse-dns/[recordId]/route";
import * as dns from "@/app/api/dns/route";
import * as dnsZone from "@/app/api/dns/[zoneId]/route";
import * as dnsRecords from "@/app/api/dns/[zoneId]/records/route";
import * as dnsRecordId from "@/app/api/dns/[zoneId]/records/[recordId]/route";
import * as sshKeys from "@/app/api/ssh-keys/route";
import * as sshKeyId from "@/app/api/ssh-keys/[keyId]/route";
import * as apiKeys from "@/app/api/api-keys/route";
import * as apiKeyId from "@/app/api/api-keys/[keyId]/route";
import * as capabilities from "@/app/api/capabilities/route";
import * as health from "@/app/api/health/route";
import * as audit from "@/app/api/audit/route";
import * as session from "@/app/api/auth/session/route";
import * as logout from "@/app/api/auth/logout/route";
import * as login from "@/app/api/auth/login/route";

type Handler = (request: NextRequest, context: RouteContext) => Promise<Response>;

function ctx(params: Record<string, string> = {}): RouteContext {
  return { params: Promise.resolve(params) };
}

function request(url: string, method = "GET", body?: unknown): NextRequest {
  return new NextRequest(`https://app.example.com${url}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

async function invoke(handler: Handler, url: string, method = "GET", body?: unknown, params?: Record<string, string>) {
  const response = await handler(request(url, method, body), ctx(params));
  const json = await response.json();
  return { status: response.status, json };
}

function installRoutesFetch() {
  return installFetchMock((call) => {
    switch (call.act) {
      case "listvs":
        return jsonResponse({ vs: [{ vpsid: "42", vps_name: "prod", status: "on", ips: "10.0.0.1" }] });
      case "vpsmanage":
        return jsonResponse({ "42": { vpsid: "42", vps_name: "prod", status: "running", ips: "10.0.0.1" } });
      case "cpu":
        return jsonResponse({ cpu: { used: 1, limit: 2 } });
      case "ram":
        return jsonResponse({ ram: { used: 1, limit: 2 } });
      case "disk":
        return jsonResponse({ disk: { used_gb: 1, limit_gb: 2 } });
      case "bandwidth":
        return jsonResponse({ bandwidth: { used_gb: 1, limit_gb: 2 } });
      case "monitor":
        return jsonResponse({ cpu: { percent: 10 } });
      case "statuslogs":
        return jsonResponse({ var: [] });
      case "vnc":
        return jsonResponse({ vnc: { port: 5900 } });
      case "ostemplate":
        return jsonResponse({ oslist: [{ osid: "1", name: "Ubuntu" }] });
      case "firewallplan":
        return jsonResponse({ firewallplan: [] });
      case "backup2":
        return jsonResponse({ backups: [] });
      case "euiso":
        return jsonResponse({ isos: [] });
      case "services":
        return jsonResponse({ services: {}, running: {} });
      case "processes":
        return jsonResponse({ processes: [] });
      case "ctasks":
        return jsonResponse({ tasks: [] });
      case "sshkeys":
        return jsonResponse({ sshkeys: [] });
      case "volume":
        return jsonResponse({ volume: [] });
      case "rdns":
        return jsonResponse({ rdns: [] });
      case "pdns":
        return jsonResponse({ pdns: [] });
      case "managezone":
        return jsonResponse({ records: [] });
      case "apikey":
        return jsonResponse({ apikeys: [] });
      case "ips":
        return jsonResponse({ ips: [] });
      default:
        return jsonResponse({ done: { msg: "ok" } });
    }
  });
}

beforeEach(() => {
  applyEnv({ ...TEST_ENV, NODE_ENV: "development" });
  resetRateLimits();
  resetCapabilityCache();
  resetVirtualizorClient();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetManagedEnv();
  resetVirtualizorClient();
});

describe("GET routes", () => {
  beforeEach(() => {
    installRoutesFetch();
  });

  const getCases: Array<[string, Handler, string, Record<string, string>?]> = [
    ["vps list", vpsList.GET, "/api/vps"],
    ["vps info", vpsInfo.GET, "/api/vps/42", { id: "42" }],
    ["vps stats", vpsStats.GET, "/api/vps/42/stats", { id: "42" }],
    ["vps monitor", vpsMonitor.GET, "/api/vps/42/monitor", { id: "42" }],
    ["vps monitor history", vpsMonitorHistory.GET, "/api/vps/42/monitor/history", { id: "42" }],
    ["vps vnc", vpsVnc.GET, "/api/vps/42/vnc", { id: "42" }],
    ["vps reinstall options", vpsReinstall.GET, "/api/vps/42/reinstall", { id: "42" }],
    ["vps firewall", vpsFirewall.GET, "/api/vps/42/firewall", { id: "42" }],
    ["vps backups", vpsBackups.GET, "/api/vps/42/backups", { id: "42" }],
    ["vps isos", vpsIsos.GET, "/api/vps/42/isos", { id: "42" }],
    ["vps services", vpsServices.GET, "/api/vps/42/services", { id: "42" }],
    ["vps processes", vpsProcesses.GET, "/api/vps/42/processes", { id: "42" }],
    ["vps tasks", vpsTasks.GET, "/api/vps/42/tasks", { id: "42" }],
    ["volumes", volumes.GET, "/api/volumes"],
    ["reverse dns", reverseDns.GET, "/api/reverse-dns"],
    ["dns zones", dns.GET, "/api/dns"],
    ["dns records", dnsRecords.GET, "/api/dns/1/records", { zoneId: "1" }],
    ["ssh keys", sshKeys.GET, "/api/ssh-keys"],
    ["api keys", apiKeys.GET, "/api/api-keys"],
    ["capabilities", capabilities.GET, "/api/capabilities"],
    ["health", health.GET, "/api/health"],
    ["audit", audit.GET, "/api/audit"],
    ["session", session.GET, "/api/auth/session"],
  ];

  it.each(getCases)("handles %s", async (_name, handler, url, params) => {
    const result = await invoke(handler, url, "GET", undefined, params);
    expect(result.status).toBe(200);
    expect(result.json.success).toBe(true);
  });
});

describe("mutation routes", () => {
  beforeEach(() => {
    installRoutesFetch();
  });

  it("handles power", async () => {
    const result = await invoke(vpsPower.POST, "/api/vps/42/power", "POST", { action: "restart" }, { id: "42" });
    expect(result.status).toBe(200);
  });

  it("handles vnc, rescue and hostname", async () => {
    expect((await invoke(vpsVnc.POST, "/api/vps/42/vnc", "POST", { password: "abcdef" }, { id: "42" })).status).toBe(200);
    expect((await invoke(vpsRescue.POST, "/api/vps/42/rescue", "POST", { password: "password1" }, { id: "42" })).status).toBe(200);
    expect((await invoke(vpsRescue.DELETE, "/api/vps/42/rescue", "DELETE", undefined, { id: "42" })).status).toBe(200);
    expect(
      (await invoke(vpsHostname.POST, "/api/vps/42/hostname", "POST", { hostname: "a.com" }, { id: "42" })).status,
    ).toBe(200);
  });

  it("handles root password and reinstall", async () => {
    expect(
      (
        await invoke(
          vpsRootPassword.POST,
          "/api/vps/42/root-password",
          "POST",
          { newPassword: "password1", confirmPassword: "password1" },
          { id: "42" },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await invoke(
          vpsReinstall.POST,
          "/api/vps/42/reinstall",
          "POST",
          { osId: "1", newPassword: "password1", confirmPassword: "password1" },
          { id: "42" },
        )
      ).status,
    ).toBe(200);
  });

  it("handles firewall create and delete", async () => {
    expect(
      (
        await invoke(
          vpsFirewall.POST,
          "/api/vps/42/firewall",
          "POST",
          { name: "web", defaultPolicy: "DROP", rules: [{ action: "ACCEPT", protocol: "TCP", port: "443" }] },
          { id: "42" },
        )
      ).status,
    ).toBe(200);
    expect(
      (await invoke(vpsFirewall.DELETE, "/api/vps/42/firewall", "DELETE", { planIds: ["1"] }, { id: "42" })).status,
    ).toBe(200);
  });

  it("handles backups create, restore and delete", async () => {
    expect((await invoke(vpsBackups.POST, "/api/vps/42/backups", "POST", undefined, { id: "42" })).status).toBe(200);
    expect(
      (await invoke(vpsBackupId.POST, "/api/vps/42/backups/1", "POST", undefined, { id: "42", backupId: "1" })).status,
    ).toBe(200);
    expect(
      (await invoke(vpsBackupId.DELETE, "/api/vps/42/backups/1", "DELETE", undefined, { id: "42", backupId: "1" })).status,
    ).toBe(200);
  });

  it("handles iso add and delete", async () => {
    expect(
      (
        await invoke(
          vpsIsos.POST,
          "/api/vps/42/isos",
          "POST",
          { filename: "x.iso", isoUrl: "https://e.com/x.iso" },
          { id: "42" },
        )
      ).status,
    ).toBe(200);
    expect((await invoke(vpsIsoId.DELETE, "/api/vps/42/isos/1", "DELETE", undefined, { id: "42", isoId: "1" })).status).toBe(200);
  });

  it("handles services and processes", async () => {
    expect(
      (await invoke(vpsServices.POST, "/api/vps/42/services", "POST", { action: "restart", services: ["ssh"] }, { id: "42" })).status,
    ).toBe(200);
    expect(
      (await invoke(vpsProcesses.POST, "/api/vps/42/processes", "POST", { pids: [1, "2"] }, { id: "42" })).status,
    ).toBe(200);
  });

  it("handles applying ssh keys to a vps", async () => {
    expect((await invoke(vpsSshKeys.POST, "/api/vps/42/ssh-keys", "POST", { keyIds: ["1"] }, { id: "42" })).status).toBe(200);
  });

  it("handles volume create and delete", async () => {
    expect(
      (await invoke(volumes.POST, "/api/volumes", "POST", { name: "v", size: 10, format: "ext4" })).status,
    ).toBe(200);
    expect((await invoke(volumeId.DELETE, "/api/volumes/1", "DELETE", undefined, { volumeId: "1" })).status).toBe(200);
  });

  it("handles reverse dns create and delete", async () => {
    expect(
      (await invoke(reverseDns.POST, "/api/reverse-dns", "POST", { ip: "1.1.1.1", domain: "a.com" })).status,
    ).toBe(200);
    expect((await invoke(reverseDnsId.DELETE, "/api/reverse-dns/1", "DELETE", undefined, { recordId: "1" })).status).toBe(200);
  });

  it("handles dns record create, edit, delete and zone delete", async () => {
    expect(
      (await invoke(dnsRecords.POST, "/api/dns/1/records", "POST", { name: "www", type: "A", content: "1.1.1.1" }, { zoneId: "1" })).status,
    ).toBe(200);
    expect(
      (
        await invoke(
          dnsRecordId.PUT,
          "/api/dns/1/records/2",
          "PUT",
          { name: "www", type: "A", content: "1.1.1.1" },
          { zoneId: "1", recordId: "2" },
        )
      ).status,
    ).toBe(200);
    expect(
      (await invoke(dnsRecordId.DELETE, "/api/dns/1/records/2", "DELETE", undefined, { zoneId: "1", recordId: "2" })).status,
    ).toBe(200);
    expect((await invoke(dnsZone.DELETE, "/api/dns/1", "DELETE", undefined, { zoneId: "1" })).status).toBe(200);
  });

  it("handles ssh key add, edit and delete", async () => {
    const key = { name: "laptop", value: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHm0IYbqC9j0mVwZ8sJ8Y0mQx3r0h user@h" };
    expect((await invoke(sshKeys.POST, "/api/ssh-keys", "POST", key)).status).toBe(200);
    expect((await invoke(sshKeyId.PUT, "/api/ssh-keys/1", "PUT", key, { keyId: "1" })).status).toBe(200);
    expect((await invoke(sshKeyId.DELETE, "/api/ssh-keys/1", "DELETE", undefined, { keyId: "1" })).status).toBe(200);
  });

  it("handles api key create and delete", async () => {
    expect((await invoke(apiKeys.POST, "/api/api-keys", "POST")).status).toBe(200);
    expect((await invoke(apiKeyId.DELETE, "/api/api-keys/1", "DELETE", undefined, { keyId: "1" })).status).toBe(200);
  });

  it("handles logout", async () => {
    expect((await invoke(logout.POST as Handler, "/api/auth/logout", "POST")).status).toBe(200);
  });
});

describe("validation failures", () => {
  beforeEach(() => {
    installRoutesFetch();
  });

  it("returns 400 for invalid bodies", async () => {
    expect((await invoke(vpsPower.POST, "/api/vps/42/power", "POST", { action: "boom" }, { id: "42" })).status).toBe(400);
    expect((await invoke(volumeId.DELETE, "/api/volumes/1", "DELETE", undefined, {})).status).toBe(400);
  });
});

describe("auth login route", () => {
  it("succeeds in dev-open mode", async () => {
    installRoutesFetch();
    const result = await invoke(login.POST as Handler, "/api/auth/login", "POST", { password: "whatever" });
    expect(result.status).toBe(200);
  });

  it("authenticates in enabled mode and rejects bad passwords", async () => {
    applyEnv({ ...TEST_ENV, NODE_ENV: "production", DASHBOARD_PASSWORD: "correct-horse", AUTH_SECRET: "secret-value-123" });
    const good = await invoke(login.POST as Handler, "/api/auth/login", "POST", { password: "correct-horse" });
    expect(good.status).toBe(200);
    const bad = await invoke(login.POST as Handler, "/api/auth/login", "POST", { password: "wrong" });
    expect(bad.status).toBe(401);
  });

  it("returns 503 when authentication is blocked", async () => {
    applyEnv({ ...TEST_ENV, NODE_ENV: "production", DASHBOARD_PASSWORD: undefined, AUTH_SECRET: undefined });
    const result = await invoke(login.POST as Handler, "/api/auth/login", "POST", { password: "x" });
    expect(result.status).toBe(503);
  });
});
