import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyEnv, installFetchMock, jsonResponse, resetManagedEnv, TEST_ENV } from "./support/env";
import * as actions from "@/lib/virtualizor/actions";
import { resetVirtualizorClient } from "@/lib/virtualizor/client";

const BASE_ENV = { ...TEST_ENV };

function installDefaultFetch(overrides: Record<string, unknown> = {}, failing: string[] = []) {
  return installFetchMock((call) => {
    const act = call.act ?? "";
    if (failing.includes(act)) return jsonResponse({ error: "not supported" });
    if (act in overrides) return jsonResponse(overrides[act]);
    if (call.method && call.method !== "GET") return jsonResponse({ done: { msg: "ok" } });
    switch (act) {
      case "vpsmanage":
        return jsonResponse({ "42": { vpsid: "42", vps_name: "prod", status: "running", ips: "10.0.0.1" } });
      case "listvs":
        return jsonResponse({ vs: [{ vpsid: "42", vps_name: "prod", status: "on", ips: "10.0.0.1" }] });
      case "cpu":
        return jsonResponse({ cpu: { used: 1, limit: 2 } });
      case "ram":
        return jsonResponse({ ram: { used: 512, limit: 1024 } });
      case "disk":
        return jsonResponse({ disk: { used_gb: 5, limit_gb: 10 } });
      case "bandwidth":
        return jsonResponse({ bandwidth: { used_gb: 10, limit_gb: 100 } });
      case "monitor":
        return jsonResponse({ cpu: { percent: 20 }, ram: { percent: 40 } });
      case "statuslogs":
        return jsonResponse({ var: [{ time: 1_700_000_000, cpu: 5 }] });
      case "vnc":
        return jsonResponse({ vnc: { port: 5900, ip: "1.2.3.4" } });
      case "ostemplate":
        return jsonResponse({ oslist: [{ osid: "1", name: "Ubuntu" }] });
      case "firewallplan":
        return jsonResponse({ firewallplan: [{ fwp_id: "1", fwp_name: "web", api_firewall_rules: "[]" }] });
      case "sshkeys":
        return jsonResponse({ sshkeys: [{ keyid: "1", name: "laptop" }] });
      case "backup2":
        return jsonResponse({ backups: [{ bkid: "1", name: "nightly" }] });
      case "euiso":
        return jsonResponse({ isos: [{ isoid: "1", iso: "x.iso" }] });
      case "services":
        return jsonResponse({ services: { "0": "ssh" }, running: { "0": "ssh" } });
      case "processes":
        return jsonResponse({ processes: [{ PID: 1, COMMAND: "init" }] });
      case "volume":
        return jsonResponse({ volume: [{ did: "1", volname: "v1" }] });
      case "rdns":
        return jsonResponse({ rdns: [{ pdnsid: "1", ip: "1.1.1.1", domain: "a.com" }] });
      case "pdns":
        return jsonResponse({ pdns: [{ domainid: "1", domain: "a.com" }] });
      case "managezone":
        return jsonResponse({ records: [{ id: "1", name: "www", type: "A", content: "1.1.1.1" }] });
      case "ctasks":
        return jsonResponse({ tasks: [{ taskid: "1", status: "running" }] });
      case "apikey":
        if (call.url.searchParams.get("do") === "add") return jsonResponse({ done: { msg: "ok" } });
        return jsonResponse({ apikeys: [{ id: "1", name: "ci" }] });
      case "ips":
        return jsonResponse({ ips: "1.1.1.1" });
      default:
        return jsonResponse({ done: { msg: "ok" } });
    }
  });
}

beforeEach(() => {
  applyEnv(BASE_ENV);
  resetVirtualizorClient();
});
afterEach(() => {
  vi.unstubAllGlobals();
  resetManagedEnv();
  resetVirtualizorClient();
});

describe("read actions", () => {
  it("lists VPS and reads info", async () => {
    installDefaultFetch();
    const list = await actions.listVps();
    expect(list[0]?.id).toBe("42");
    const info = await actions.getVpsInfo();
    expect(info.name).toBe("prod");
  });

  it("falls back to listvs when vpsmanage is unsupported", async () => {
    installFetchMock((call) => {
      if (call.act === "vpsmanage") return jsonResponse({ error: "not supported" });
      if (call.act === "listvs") return jsonResponse({ vs: [{ vpsid: "42", vps_name: "fallback", status: "on" }] });
      return jsonResponse({});
    });
    const info = await actions.getVpsInfo();
    expect(info.name).toBe("fallback");
  });

  it("rethrows non-fallback errors", async () => {
    installFetchMock(() => new Response("boom", { status: 500 }));
    await expect(actions.getVpsInfo()).rejects.toMatchObject({ code: "VIRTUALIZOR_HTTP_ERROR" });
  });

  it("reads ips, stats, monitor and logs", async () => {
    installDefaultFetch();
    expect(await actions.getIps()).toHaveLength(1);
    expect(await actions.getCpuStats()).toMatchObject({ percent: 50 });
    expect(await actions.getRamStats()).toMatchObject({ used: 512 });
    expect(await actions.getDiskStats()).toMatchObject({ unit: "gb" });
    expect(await actions.getBandwidthStats("blah")).toMatchObject({ usedGb: 10 });
    expect(await actions.getMonitor()).toMatchObject({ cpuPercent: 20 });
    expect(await actions.getStatusLogs()).toHaveLength(1);
  });

  it("isolates stats bundle failures per resource", async () => {
    installDefaultFetch({}, ["ram"]);
    const bundle = await actions.getStatsBundle();
    expect(bundle.cpu).toBeDefined();
    expect(bundle.ram).toBeUndefined();
    expect(bundle.errors.ram).toBeDefined();
  });

  it("reads vnc, firewall, ssh keys, backups, isos, services, processes, volumes and dns", async () => {
    installDefaultFetch();
    expect(await actions.getVncInfo()).toMatchObject({ available: true });
    expect(await actions.getFirewallPlans()).toHaveLength(1);
    expect(await actions.getSshKeys()).toHaveLength(1);
    expect(await actions.getBackups()).toHaveLength(1);
    expect(await actions.getIsos()).toHaveLength(1);
    expect(await actions.getServices()).toHaveLength(1);
    expect(await actions.getProcesses()).toHaveLength(1);
    expect(await actions.getVolumes()).toHaveLength(1);
    expect(await actions.getReverseDns()).toHaveLength(1);
    expect(await actions.getDnsZones()).toHaveLength(1);
    expect(await actions.getZoneRecords("1")).toHaveLength(1);
    expect(await actions.getReinstallOptions()).toHaveLength(1);
    expect(await actions.getTasks()).toHaveLength(1);
    expect(await actions.getApiKeys()).toHaveLength(1);
  });
});

describe("mutating actions", () => {
  it("performs power actions", async () => {
    installDefaultFetch();
    for (const action of ["start", "stop", "restart", "poweroff"] as const) {
      const result = await actions.powerAction(action);
      expect(result.message).toBe("ok");
    }
  });

  it("updates vnc, rescue, hostname, root password and reinstall", async () => {
    installDefaultFetch();
    expect((await actions.setVncPassword("abcdef")).message).toBe("ok");
    expect((await actions.enableRescue("password1")).message).toBe("ok");
    expect((await actions.disableRescue()).message).toBe("ok");
    expect((await actions.changeHostname("a.com")).message).toBe("ok");
    expect((await actions.changeRootPassword("password1")).message).toBe("ok");
    expect(
      (await actions.reinstallOs({ osId: "1", newPassword: "password1", rebuildSshKey: true })).message,
    ).toBe("ok");
  });

  it("manages firewall plans and ssh keys", async () => {
    installDefaultFetch();
    expect(
      (await actions.addFirewallPlan({ name: "web", defaultPolicy: "DROP", rules: [{ action: "ACCEPT", protocol: "TCP" }] }))
        .message,
    ).toBe("ok");
    expect((await actions.deleteFirewallPlans(["1"])).message).toBe("ok");
    expect((await actions.addSshKey({ name: "k", value: "ssh-ed25519 AAAA x" })).message).toBe("ok");
    expect((await actions.editSshKey({ keyId: "1", name: "k", value: "ssh-ed25519 AAAA x" })).message).toBe("ok");
    expect((await actions.deleteSshKey("1")).message).toBe("ok");
    expect((await actions.applySshKeys(["1"])).message).toBe("ok");
  });

  it("manages backups, isos, services and processes", async () => {
    installDefaultFetch();
    expect((await actions.createBackup()).message).toBe("ok");
    expect((await actions.restoreBackup("1")).message).toBe("ok");
    expect((await actions.deleteBackup("1")).message).toBe("ok");
    expect((await actions.addIso({ filename: "x.iso", isoUrl: "https://e.com/x.iso" })).message).toBe("ok");
    expect((await actions.deleteIso("1")).message).toBe("ok");
    expect((await actions.manageService("restart", ["ssh"])).message).toBe("ok");
    expect((await actions.killProcesses(["1"])).message).toBe("ok");
  });

  it("manages volumes, reverse dns, dns records and api keys", async () => {
    installDefaultFetch();
    expect((await actions.addVolume({ name: "v", size: 10, format: "ext4", attach: true })).message).toBe("ok");
    expect((await actions.deleteVolume("1")).message).toBe("ok");
    expect((await actions.addReverseDns("1.1.1.1", "a.com")).message).toBe("ok");
    expect((await actions.deleteReverseDns("1")).message).toBe("ok");
    expect(
      (await actions.addDnsRecord({ domainId: "1", name: "www", type: "A", content: "1.1.1.1" })).message,
    ).toBe("ok");
    expect(
      (await actions.editDnsRecord({ domainId: "1", recordId: "1", name: "www", type: "A", content: "1.1.1.1" }))
        .message,
    ).toBe("ok");
    expect((await actions.deleteDnsRecord("1", "1")).message).toBe("ok");
    expect((await actions.deleteDnsZone("1")).message).toBe("ok");
    expect((await actions.createApiKey()).message).toBe("ok");
    expect((await actions.deleteApiKey("1")).message).toBe("ok");
  });
});

describe("vps scoping guards", () => {
  it("rejects actions that require a VPS id when none is configured", async () => {
    applyEnv({ ...BASE_ENV, VIRTUALIZOR_VPS_ID: undefined });
    resetVirtualizorClient();
    installDefaultFetch();
    await expect(actions.powerAction("start")).rejects.toMatchObject({ code: "VIRTUALIZOR_CONFIG_ERROR" });
    await expect(actions.createBackup()).rejects.toMatchObject({ code: "VIRTUALIZOR_CONFIG_ERROR" });
  });

  it("reports a config error when the panel is unconfigured", async () => {
    resetManagedEnv();
    resetVirtualizorClient();
    installDefaultFetch();
    await expect(actions.listVps()).rejects.toMatchObject({ code: "VIRTUALIZOR_CONFIG_ERROR" });
  });
});
