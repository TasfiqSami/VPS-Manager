import { describe, expect, it } from "vitest";

import * as parse from "@/lib/virtualizor/parse";

describe("primitive helpers", () => {
  it("asRecord only accepts plain objects", () => {
    expect(parse.asRecord({ a: 1 })).toEqual({ a: 1 });
    expect(parse.asRecord([1])).toBeUndefined();
    expect(parse.asRecord(null)).toBeUndefined();
    expect(parse.asRecord("x")).toBeUndefined();
  });

  it("asArray wraps scalars", () => {
    expect(parse.asArray([1, 2])).toEqual([1, 2]);
    expect(parse.asArray("x")).toEqual(["x"]);
    expect(parse.asArray(undefined)).toEqual([]);
    expect(parse.asArray(null)).toEqual([]);
  });

  it("pick returns the first meaningful value", () => {
    expect(parse.pick({ a: "", b: 2 }, ["a", "b"])).toBe(2);
    expect(parse.pick(undefined, ["a"])).toBeUndefined();
    expect(parse.pick({ a: null }, ["a"])).toBeUndefined();
  });

  it("pickString / pickNumber / pickBoolean coerce", () => {
    expect(parse.pickString({ a: " hi " }, ["a"])).toBe("hi");
    expect(parse.pickNumber({ a: "3" }, ["a"])).toBe(3);
    expect(parse.pickBoolean({ a: "no" }, ["a"])).toBe(false);
    expect(parse.pickString(undefined, ["a"])).toBeUndefined();
  });
});

describe("normalizeVpsStatus", () => {
  it("handles missing record", () => {
    expect(parse.normalizeVpsStatus(undefined)).toEqual({ status: "unknown", label: "Unknown" });
  });

  it("honours the suspended flag", () => {
    expect(parse.normalizeVpsStatus({ suspended: 1 }).status).toBe("suspended");
  });

  it("maps exact running and stopped tokens", () => {
    expect(parse.normalizeVpsStatus({ status: "Running" }).status).toBe("running");
    expect(parse.normalizeVpsStatus({ status: "online" }).status).toBe("running");
    expect(parse.normalizeVpsStatus({ status: "halted" }).status).toBe("stopped");
    expect(parse.normalizeVpsStatus({ status: "poweroff" }).status).toBe("stopped");
  });

  it("treats suspend* as suspended", () => {
    expect(parse.normalizeVpsStatus({ status: "suspended by admin" }).status).toBe("suspended");
  });

  it("does not misclassify words containing tokens (v1 bug)", () => {
    expect(parse.normalizeVpsStatus({ status: "connection error" }).status).toBe("unknown");
    expect(parse.normalizeVpsStatus({ status: "not running" }).status).toBe("unknown");
  });

  it("falls back to numeric status", () => {
    expect(parse.normalizeVpsStatus({ status: 1 }).status).toBe("running");
    expect(parse.normalizeVpsStatus({ status: 0 }).status).toBe("stopped");
  });
});

describe("extractIps", () => {
  it("collects, splits and dedupes addresses", () => {
    const result = parse.extractIps({ ips: "1.1.1.1, 2.2.2.2 2001:db8::1" });
    expect(result.ips).toEqual(["1.1.1.1", "2.2.2.2"]);
    expect(result.ipv6).toEqual(["2001:db8::1"]);
  });

  it("never treats object keys as addresses (v1 bug)", () => {
    const result = parse.extractIps({ ips: { some_key: "9.9.9.9" } });
    expect(result.ips).toEqual([]);
  });

  it("reads explicit nested fields", () => {
    const result = parse.extractIps({ ips: [{ ip: "3.3.3.3" }] });
    expect(result.ips).toEqual(["3.3.3.3"]);
  });
});

describe("extractVpsRecords and selectVpsRecord", () => {
  const payload = {
    vps: {
      "1": { vpsid: "1", vps_name: "alpha", status: "running" },
      "2": { vpsid: "2", vps_name: "beta", status: "stopped" },
    },
  };

  it("extracts nested records", () => {
    const records = parse.extractVpsRecords(payload);
    expect(records).toHaveLength(2);
  });

  it("extracts direct numeric keys on the root", () => {
    const records = parse.extractVpsRecords({ "7": { vps_name: "gamma" } });
    expect(records[0]?.vpsid).toBe("7");
  });

  it("selects by id", () => {
    expect(parse.selectVpsRecord(payload, "2")?.vps_name).toBe("beta");
  });

  it("returns the only record when the id does not match", () => {
    const single = { vps: { "5": { vpsid: "5", vps_name: "only" } } };
    expect(parse.selectVpsRecord(single, "9")?.vps_name).toBe("only");
  });

  it("returns undefined when an id is missing among many", () => {
    expect(parse.selectVpsRecord(payload, "99")).toBeUndefined();
  });

  it("selects the first record without an id", () => {
    expect(parse.selectVpsRecord(payload)?.vpsid).toBe("1");
  });

  it("merges info payloads", () => {
    const info = { info: { hostname: "h1" }, hostname: "h1" };
    expect(parse.selectVpsRecord(info, "1")?.hostname).toBe("h1");
  });
});

describe("mapVpsInfo", () => {
  it("throws when the VPS cannot be found", () => {
    expect(() => parse.mapVpsInfo({ vps: {} }, "42")).toThrowError(/could not be found/i);
  });

  it("maps a rich record", () => {
    const info = parse.mapVpsInfo(
      {
        "42": {
          vpsid: "42",
          vps_name: "prod",
          hostname: "prod.example.com",
          status: "running",
          os_name: "Ubuntu 22.04",
          virt: "kvm",
          location: "eu-1",
          cores: 4,
          cpu_percent: 200,
          ram: 2048,
          burst: 4096,
          swap: 512,
          space: 50,
          bandwidth: 1000,
          network_speed: 1000,
          io: 20,
          vnc: 1,
          time: 1_700_000_000,
          ips: "10.0.0.1",
        },
      },
      "42",
    );
    expect(info.id).toBe("42");
    expect(info.name).toBe("prod");
    expect(info.status).toBe("running");
    expect(info.hostname).toBe("prod.example.com");
    expect(info.os).toBe("Ubuntu 22.04");
    expect(info.virtualization).toBe("kvm");
    expect(info.cpuCores).toBe(4);
    expect(info.ramMb).toBe(2048);
    expect(info.diskGb).toBe(50);
    expect(info.vncEnabled).toBe(true);
    expect(info.ips).toEqual(["10.0.0.1"]);
    expect(info.createdAt).toBeDefined();
  });

  it("normalizes megabyte disk values to gigabytes", () => {
    const info = parse.mapVpsInfo({ "42": { vpsid: "42", space: 102400 } }, "42");
    expect(info.diskGb).toBe(100);
  });

  it("resolves explicit disk fields and disk in KB", () => {
    expect(parse.mapVpsInfo({ "42": { vpsid: "42", disk_gb: 80 } }, "42").diskGb).toBe(80);
    expect(parse.mapVpsInfo({ "42": { vpsid: "42", disk: 10_240_000 } }, "42").diskGb).toBe(10000);
  });

  it("defaults the name when absent", () => {
    const info = parse.mapVpsInfo({ "42": { vpsid: "42" } }, "42");
    expect(info.name).toBe("VPS 42");
  });
});

describe("mapVpsList", () => {
  it("maps every record with primary ip and os", () => {
    const list = parse.mapVpsList({
      vs: [
        { vpsid: "1", vps_name: "a", status: "on", ips: "1.2.3.4", os_name: "Debian" },
        { vpsid: "2", status: "off" },
      ],
    });
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ id: "1", primaryIp: "1.2.3.4", os: "Debian" });
    expect(list[1]?.primaryIp).toBeUndefined();
  });
});

describe("statistics mappers", () => {
  it("maps cpu stats and derives percent", () => {
    const cpu = parse.mapCpuStats({ cpu: { used: 2, limit: 4, manu: "AMD" } });
    expect(cpu.percent).toBe(50);
    expect(cpu.manufacturer).toBe("AMD");
  });

  it("maps ram stats including swap and guaranteed", () => {
    const ram = parse.mapRamStats({ ram: { used: 512, limit: 1024, guaranteed: 256, swap: 128, free: 512 } });
    expect(ram.percent).toBe(50);
    expect(ram.guaranteed).toBe(256);
    expect(ram.swap).toBe(128);
  });

  it("maps disk stats in megabytes", () => {
    const disk = parse.mapDiskStats({ disk: { used: 5000, limit: 10000 }, inodes: { used: 1, limit: 10 } });
    expect(disk.unit).toBe("mb");
    expect(disk.percent).toBe(50);
    expect(disk.inodes?.percent).toBe(10);
  });

  it("maps disk stats in gigabytes when *_gb fields exist", () => {
    const disk = parse.mapDiskStats({ disk: { used_gb: 20, limit_gb: 40, free_gb: 20 } });
    expect(disk.unit).toBe("gb");
    expect(disk.used).toBe(20);
    expect(disk.percent).toBe(50);
  });

  it("maps bandwidth stats with series, in/out and month", () => {
    const bw = parse.mapBandwidthStats({
      bandwidth: {
        used_gb: 10,
        limit_gb: 100,
        usage: { "2024-01-01": "2", "2024-01-02": 3 },
        in: { total: 1, "2024-01-01": "1" },
        out: { total: 2, "2024-01-02": "2" },
      },
      month: { yr: 2024, month: 1, mth_txt: "Jan", days: 31 },
      speed: 1000,
    });
    expect(bw.usedGb).toBe(10);
    expect(bw.monthlyUsage).toHaveLength(2);
    expect(bw.inbound?.total).toBe(1);
    expect(bw.outbound?.total).toBe(2);
    expect(bw.month?.label).toBe("Jan");
    expect(bw.speedMbps).toBe(1000);
  });

  it("maps array-based bandwidth series", () => {
    const bw = parse.mapBandwidthStats({
      bandwidth: { usage: [{ date: "2024-01-01", value: 5 }, { day: "2024-01-02", y: 6 }, { bad: true }] },
    });
    expect(bw.monthlyUsage).toHaveLength(2);
  });
});

describe("monitor mappers", () => {
  it("maps a live snapshot", () => {
    const snap = parse.mapMonitorSnapshot({
      cpu: { used: 1, limit: 2 },
      ram: { used: 100, limit: 200 },
      disk: { limit_gb: 10, used_gb: 5 },
      net_in: 5,
      net_out: 6,
    });
    expect(snap.cpuPercent).toBe(50);
    expect(snap.ramPercent).toBe(50);
    expect(snap.diskPercent).toBe(50);
    expect(snap.diskMb).toBe(5120);
    expect(snap.netIn).toBe(5);
    expect(snap.netOut).toBe(6);
  });

  it("maps status logs", () => {
    const logs = parse.mapStatusLogs({
      var: [{ time: 1_700_000_000, cpu: 10, ram: 20, disk: 30, net_in: 1, net_out: 2 }],
    });
    expect(logs[0]?.cpuPercent).toBe(10);
    expect(logs[0]?.source).toBe("statuslog");
  });
});

describe("vnc mapper", () => {
  it("detects availability from port", () => {
    expect(parse.mapVncInfo({ vnc: { port: 5900, ip: "1.2.3.4", password: "p" } })).toMatchObject({
      available: true,
      port: 5900,
      host: "1.2.3.4",
      password: "p",
    });
  });

  it("reports a reason when unavailable", () => {
    const info = parse.mapVncInfo({});
    expect(info.available).toBe(false);
    expect(info.reason).toBeDefined();
  });

  it("detects noVNC availability", () => {
    expect(parse.mapVncInfo({ novnc: "https://x" }).available).toBe(true);
  });
});

describe("services and processes mappers", () => {
  it("maps keyed services with running and autostart", () => {
    const services = parse.mapServices({
      services: { "0": "ssh", "1": "nginx" },
      running: { "0": "ssh" },
      autostart: ["nginx"],
    });
    expect(services).toEqual([
      { name: "ssh", running: true },
      { name: "nginx", running: false, autostart: true },
    ]);
  });

  it("maps list-shaped services", () => {
    const services = parse.mapServices({ services: ["ssh"], running: { a: "ssh" } });
    expect(services[0]).toMatchObject({ name: "ssh", running: true });
  });

  it("maps processes and skips entries without a pid", () => {
    const processes = parse.mapProcesses({
      processes: [
        { PID: 100, USER: "root", "%CPU": 5, "%MEM": 10, RSS: -2048, STAT: "S", TIME: "0:01", COMMAND: "bash" },
        { USER: "x", COMMAND: "no-pid" },
      ],
    });
    expect(processes).toHaveLength(1);
    expect(processes[0]).toMatchObject({ pid: 100, user: "root", memoryKb: 2048, state: "S" });
  });
});

describe("backup, volume, iso mappers", () => {
  it("maps list backups", () => {
    const backups = parse.mapBackups({
      backups: [{ bkid: "1", name: "nightly", time: 1_700_000_000, size: 100, status: "done", type: "full" }],
    });
    expect(backups[0]).toMatchObject({ id: "1", name: "nightly", sizeMb: 100, type: "full" });
  });

  it("maps keyed backups", () => {
    const backups = parse.mapBackups({ backups: { "9": { name: "k" } } });
    expect(backups[0]?.id).toBe("9");
  });

  it("strictly parses the volume attached flag", () => {
    const volumes = parse.mapVolumes({
      volume: [
        { did: "1", volname: "v1", size: 20, size_unit: "GB", format: "ext4", attached: "0", vps_sel: "42" },
        { did: "2", attached: "1", vps_sel: "0" },
      ],
    });
    expect(volumes[0]).toMatchObject({ id: "1", attached: false, vpsId: "42" });
    expect(volumes[1]?.attached).toBe(true);
    expect(volumes[1]?.vpsId).toBeUndefined();
  });

  it("maps keyed volumes", () => {
    const volumes = parse.mapVolumes({ volume: { "3": { volname: "x" } } });
    expect(volumes[0]?.id).toBe("3");
  });

  it("maps list isos", () => {
    const isos = parse.mapIsos({ isos: [{ isoid: "1", iso: "x.iso", size: 700, downloaded: "1", active: "0" }] });
    expect(isos[0]).toMatchObject({ id: "1", name: "x.iso", size: 700, downloaded: true, active: false });
  });

  it("maps keyed isos including string shorthand", () => {
    const isos = parse.mapIsos({ euiso: { a: "a.iso", b: { distro: "ubuntu" } } });
    expect(isos).toHaveLength(2);
  });
});

describe("ssh key mapper", () => {
  it("maps list and keyed forms", () => {
    expect(parse.mapSshKeys({ sshkeys: [{ keyid: "1", name: "laptop", value: "ssh-rsa AAA" }] })[0]).toMatchObject({
      id: "1",
      value: "ssh-rsa AAA",
    });
    expect(parse.mapSshKeys({ keys: { "2": { name: "desktop" } } })[0]?.id).toBe("2");
    expect(parse.mapSshKeys({})).toEqual([]);
  });
});

describe("firewall mapper", () => {
  it("parses JSON rule strings and positional arrays", () => {
    const rules = parse.mapFirewallRules(
      JSON.stringify([
        { action: "DROP", protocol: "tcp", port: "22", src: "1.1.1.1" },
        ["ACCEPT", "UDP", "53"],
        { action: "ACCEPT" },
      ]),
    );
    expect(rules[0]).toMatchObject({ action: "DROP", protocol: "tcp", port: "22" });
    expect(rules[1]).toMatchObject({ action: "ACCEPT", protocol: "UDP", port: "53" });
    expect(rules[2]?.action).toBe("ACCEPT");
  });

  it("ignores invalid JSON and empty strings", () => {
    expect(parse.mapFirewallRules("not json")).toEqual([]);
    expect(parse.mapFirewallRules("   ")).toEqual([]);
  });

  it("maps plans", () => {
    const plans = parse.mapFirewallPlans({
      firewallplan: [{ fwp_id: "1", fwp_name: "web", default_policy: "DROP", fwp_note: "n", api_firewall_rules: "[]" }],
    });
    expect(plans[0]).toMatchObject({ id: "1", name: "web", defaultPolicy: "DROP", note: "n" });
  });
});

describe("reverse dns and dns mappers", () => {
  it("maps reverse dns list and keyed", () => {
    expect(parse.mapReverseDns({ rdns: [{ pdnsid: "1", ip: "1.1.1.1", domain: "a.com" }] })[0]).toMatchObject({
      ip: "1.1.1.1",
      domain: "a.com",
    });
    expect(parse.mapReverseDns({ rdns: { "2": { domain: "b.com" } } })[0]?.id).toBe("2");
  });

  it("maps dns zones and records", () => {
    expect(parse.mapDnsZones({ pdns: [{ domainid: "1", domain: "a.com" }] })[0]).toMatchObject({ id: "1", domain: "a.com" });
    expect(parse.mapDnsZones({ pdns: { "2": { domain: "b.com" } } })[0]?.id).toBe("2");
    const records = parse.mapZoneRecords({
      records: [{ id: "1", name: "www", type: "A", content: "1.1.1.1", prio: 10, ttl: 300 }],
    });
    expect(records[0]).toMatchObject({ id: "1", priority: 10, ttl: 300 });
  });
});

describe("task and api key mappers", () => {
  it("normalizes task statuses", () => {
    const tasks = parse.mapTasks({
      tasks: [
        { taskid: "1", status: "running", act: "reinstall", progress: 50, time: 1_700_000_000, msg: "working" },
        { taskid: "2", status: "done" },
        { taskid: "3", status: "failed" },
        { taskid: "4", status: "weird" },
        { taskid: "5" },
      ],
    });
    expect(tasks[0]).toMatchObject({ status: "running", progress: 50, action: "reinstall" });
    expect(tasks[1]?.status).toBe("completed");
    expect(tasks[2]?.status).toBe("failed");
    expect(tasks[3]?.status).toBe("unknown");
    expect(tasks[4]?.status).toBe("unknown");
  });

  it("maps api keys list and keyed", () => {
    expect(parse.mapApiKeys({ apikeys: [{ id: "1", name: "ci", lastused: 1_700_000_000 }] })[0]).toMatchObject({ id: "1", name: "ci" });
    expect(parse.mapApiKeys({ keys: { "2": {} } })[0]?.id).toBe("2");
  });
});

describe("ip and reinstall option mappers", () => {
  it("maps ips with a primary marker", () => {
    const ips = parse.mapIps({ ips: "1.1.1.1,2.2.2.2", main_ip: "2.2.2.2" });
    expect(ips.find((entry) => entry.ip === "2.2.2.2")?.primary).toBe(true);
    expect(ips[0]?.primary).toBe(false);
  });

  it("defaults the first ip to primary", () => {
    expect(parse.mapIps({ ips: "1.1.1.1" })[0]?.primary).toBe(true);
  });

  it("maps reinstall options from objects and shorthand", () => {
    const options = parse.mapReinstallOptions({
      oslist: [{ osid: "1", name: "Ubuntu", group: "linux" }, "debian"],
    });
    expect(options).toEqual([
      { osId: "1", name: "Ubuntu", group: "linux" },
      { osId: "debian", name: "debian" },
    ]);
  });

  it("maps keyed reinstall options", () => {
    const options = parse.mapReinstallOptions({ os: { "10": { name: "CentOS" }, "11": "centos" } });
    expect(options).toHaveLength(2);
  });
});
