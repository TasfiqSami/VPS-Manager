import {
  isIp,
  isIpv6,
  safePercent,
  toBoolean,
  toIsoString,
  toNumber,
  toStringValue,
} from "../utils";
import { VirtualizorError } from "./errors";
import type {
  ApiKeyInfo,
  BackupInfo,
  BandwidthPoint,
  BandwidthStats,
  CpuStats,
  DiskStats,
  DnsRecord,
  DnsZone,
  FirewallPlan,
  FirewallRule,
  IpInfo,
  IsoInfo,
  MonitorSnapshot,
  ProcessInfo,
  RamStats,
  ReinstallOption,
  ResourceUsage,
  ReverseDnsRecord,
  ServiceInfo,
  SshKeyInfo,
  TaskInfo,
  TaskStatus,
  VolumeInfo,
  VncInfo,
  VpsInfo,
  VpsListItem,
  VpsStatus,
  UnknownRecord,
} from "./types";

/* ------------------------------------------------------------------ */
/* Primitive helpers                                                   */
/* ------------------------------------------------------------------ */

export function asRecord(value: unknown): UnknownRecord | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as UnknownRecord;
  }
  return undefined;
}

export function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

/** Return the first defined value among the candidates. */
export function pick(record: UnknownRecord | undefined, keys: readonly string[]): unknown {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

export function pickString(record: UnknownRecord | undefined, keys: readonly string[]): string | undefined {
  return toStringValue(pick(record, keys))?.trim() || undefined;
}

export function pickNumber(record: UnknownRecord | undefined, keys: readonly string[]): number | undefined {
  return toNumber(pick(record, keys));
}

export function pickBoolean(record: UnknownRecord | undefined, keys: readonly string[]): boolean | undefined {
  return toBoolean(pick(record, keys));
}

const RUNNING_TOKENS = new Set(["1", "on", "running", "online", "started", "active", "up", "enabled"]);
const STOPPED_TOKENS = new Set([
  "0",
  "off",
  "stopped",
  "offline",
  "halted",
  "poweroff",
  "down",
  "disabled",
  "shutdown",
]);

/**
 * Normalize a Virtualizor status into a strict enum.
 *
 * v1 used loose substring matching (`text.includes("on")`), which
 * misclassified values such as "connection error" as running. We only accept
 * exact tokens, plus an explicit "suspend" prefix for the suspended state.
 */
export function normalizeVpsStatus(record: UnknownRecord | undefined): { status: VpsStatus; label: string } {
  if (!record) return { status: "unknown", label: "Unknown" };
  if (pickBoolean(record, ["suspended"]) === true) {
    return { status: "suspended", label: "Suspended" };
  }
  const raw = pick(record, ["status", "vps_status", "state", "ps", "status_text"]);
  const text = toStringValue(raw)?.trim().toLowerCase();
  if (text !== undefined && text !== "") {
    if (RUNNING_TOKENS.has(text)) return { status: "running", label: "Running" };
    if (STOPPED_TOKENS.has(text)) return { status: "stopped", label: "Stopped" };
    if (text.startsWith("suspend")) return { status: "suspended", label: "Suspended" };
  }
  const numeric = toNumber(raw);
  if (numeric === 1) return { status: "running", label: "Running" };
  if (numeric === 0) return { status: "stopped", label: "Stopped" };
  return { status: "unknown", label: "Unknown" };
}

function collectIpStrings(value: unknown, output: string[]): void {
  if (value === undefined || value === null) return;
  if (typeof value === "string") {
    for (const part of value.split(/[,\s]+/)) {
      const candidate = part.trim();
      if (candidate && isIp(candidate)) output.push(candidate);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectIpStrings(entry, output);
    return;
  }
  const record = asRecord(value);
  if (record) {
    // Prefer explicit fields; never treat object keys or scalar values as
    // addresses (v1 bug). Only recurse into nested arrays/records.
    const explicit = pick(record, ["ip", "ip_address", "ipv4", "ipv6", "addr", "address"]);
    if (explicit !== undefined) {
      collectIpStrings(explicit, output);
      return;
    }
    for (const nested of Object.values(record)) {
      if (nested !== null && typeof nested === "object") collectIpStrings(nested, output);
    }
  }
}

export function extractIps(record: UnknownRecord | undefined): { ips: string[]; ipv6: string[] } {
  const collected: string[] = [];
  collectIpStrings(pick(record, ["ips", "ip", "ip_address", "ipaddresses", "ip_list"]), collected);
  const ips: string[] = [];
  const ipv6: string[] = [];
  for (const ip of collected) {
    if (isIpv6(ip)) ipv6.push(ip);
    else ips.push(ip);
  }
  return { ips: Array.from(new Set(ips)), ipv6: Array.from(new Set(ipv6)) };
}

/**
 * Normalize a collection payload into an array of entries.
 *
 * Virtualizor returns collections either as arrays or as objects keyed by
 * record id. A bare record that already carries one of the identity fields is
 * treated as a single-element list rather than a keyed map.
 */
export function normalizeCollection(raw: unknown, idKeys: readonly string[]): unknown[] {
  if (Array.isArray(raw)) return raw;
  const record = asRecord(raw);
  if (!record) return [];
  if (idKeys.some((key) => record[key] !== undefined && record[key] !== null)) return [record];
  return Object.entries(record).map(([id, value]) => {
    const nested = asRecord(value);
    return nested ? { [idKeys[0] as string]: id, ...nested } : { [idKeys[0] as string]: id };
  });
}


/* ------------------------------------------------------------------ */
/* VPS records                                                         */
/* ------------------------------------------------------------------ */

const VPS_MARKER_KEYS = [
  "vpsid",
  "vps_id",
  "vps_name",
  "hostname",
  "os_name",
  "status",
  "ram",
  "space",
  "ips",
  "virt",
] as const;

function looksLikeVps(record: UnknownRecord): boolean {
  return VPS_MARKER_KEYS.some((key) => record[key] !== undefined && record[key] !== null);
}

export function idOf(record: UnknownRecord): string | undefined {
  return pickString(record, ["vpsid", "vps_id", "svs", "id", "vid"]);
}

/**
 * Collect every VPS record from a `listvs` / `vpsmanage` payload regardless of
 * how the panel nests them (`vps`, `vs`, `vpslist`, keyed objects, arrays).
 */
export function extractVpsRecords(payload: UnknownRecord): UnknownRecord[] {
  const records: UnknownRecord[] = [];
  const seen = new Set<string>();

  const add = (value: unknown): void => {
    const record = asRecord(value);
    if (!record) return;
    const identifier = idOf(record) ?? JSON.stringify(record).slice(0, 80);
    if (seen.has(identifier)) return;
    seen.add(identifier);
    records.push(record);
  };

  const containers = [payload.vps, payload.vs, payload.vpslist, payload.listvs, payload.data];
  for (const container of containers) {
    if (Array.isArray(container)) {
      container.forEach(add);
      continue;
    }
    const record = asRecord(container);
    if (!record) continue;
    const nested = Object.values(record).filter((value) => asRecord(value) !== undefined);
    if (nested.length > 0) nested.forEach(add);
    else if (looksLikeVps(record)) add(record);
  }

  // Some panels key the records directly on the root payload.
  for (const [key, value] of Object.entries(payload)) {
    if (!/^\d+$/.test(key)) continue;
    const record = asRecord(value);
    if (record) add({ vpsid: key, ...record });
  }

  return records;
}

export function selectVpsRecord(payload: UnknownRecord, vpsId?: string): UnknownRecord | undefined {
  const direct = asRecord(payload[vpsId ?? ""]);
  if (vpsId && direct) return { vpsid: vpsId, ...direct };

  const records = extractVpsRecords(payload);
  if (vpsId) {
    const match = records.find((record) => idOf(record) === vpsId);
    if (match) return match;
    if (records.length === 1) return records[0];
    if (records.length > 1) return undefined;
  }

  if (records.length > 0) return records[0];

  const info = asRecord(payload.info);
  if (info && (looksLikeVps(info) || looksLikeVps(payload))) {
    return { ...payload, ...info };
  }
  if (looksLikeVps(payload)) return payload;
  return undefined;
}

function resolveDiskGb(record: UnknownRecord): number | undefined {
  const explicit = pickNumber(record, ["disk_gb", "space_gb", "hdd_gb"]);
  if (explicit !== undefined && explicit > 0) return explicit;
  const space = pickNumber(record, ["space"]);
  if (space !== undefined && space > 0) {
    // `space` is documented in GB. Guard against panels that report MB.
    return space > 5_000 ? Math.round((space / 1024) * 100) / 100 : space;
  }
  const disk = pickNumber(record, ["disk", "disk_space", "hdd"]);
  if (disk !== undefined && disk > 0) return Math.round((disk / 1024) * 100) / 100;
  return undefined;
}

export function mapVpsInfo(payload: UnknownRecord, vpsId: string): VpsInfo {
  const record = selectVpsRecord(payload, vpsId);
  if (!record) {
    throw new VirtualizorError({
      code: "VIRTUALIZOR_NOT_FOUND",
      message:
        "The configured VPS could not be found in the Virtualizor response. Verify VIRTUALIZOR_VPS_ID and that the API key has access to this VPS.",
    });
  }
  const info = asRecord(record.info);
  const merged: UnknownRecord = { ...record, ...info };
  const { status, label } = normalizeVpsStatus(merged);
  const { ips, ipv6 } = extractIps(merged);
  const vncRaw = pick(merged, ["vnc", "vnc_enable"]);

  const result: VpsInfo = {
    id: idOf(merged) ?? vpsId,
    name: pickString(merged, ["vps_name", "name", "title", "hostname"]) ?? `VPS ${vpsId}`,
    status,
    statusLabel: label,
    ips,
    ipv6,
    suspended: status === "suspended" || pickBoolean(merged, ["suspended"]) === true,
    rescue: pickBoolean(merged, ["rescue", "rescue_mode"]) === true,
    raw: merged,
  };

  const hostname = pickString(merged, ["hostname", "hname"]);
  if (hostname) result.hostname = hostname;
  const os = pickString(merged, ["os_name", "os", "os_template", "distro"]);
  if (os) result.os = os;
  const virtualization = pickString(merged, ["virt", "virtualization", "vtype"]);
  if (virtualization) result.virtualization = virtualization;
  const location = pickString(merged, ["location", "server_location", "region", "node"]);
  if (location) result.location = location;
  const cpuCores = pickNumber(merged, ["cores", "cpu", "cpu_cores"]);
  if (cpuCores !== undefined) result.cpuCores = cpuCores;
  const cpuLimit = pickNumber(merged, ["cpu_percent", "cpulimit", "cpu_limit"]);
  if (cpuLimit !== undefined) result.cpuLimit = cpuLimit;
  const ramMb = pickNumber(merged, ["ram", "memory", "ram_mb"]);
  if (ramMb !== undefined) result.ramMb = ramMb;
  const burstMb = pickNumber(merged, ["burst", "burst_ram"]);
  if (burstMb !== undefined) result.burstMb = burstMb;
  const swapMb = pickNumber(merged, ["swap", "swap_ram"]);
  if (swapMb !== undefined) result.swapMb = swapMb;
  const diskGb = resolveDiskGb(merged);
  if (diskGb !== undefined) result.diskGb = diskGb;
  const bandwidthGb = pickNumber(merged, ["bandwidth", "bandwidth_limit"]);
  if (bandwidthGb !== undefined) result.bandwidthGb = bandwidthGb;
  const networkSpeedMbps = pickNumber(merged, ["network_speed", "netspeed", "mbps"]);
  if (networkSpeedMbps !== undefined) result.networkSpeedMbps = networkSpeedMbps;
  const io = pickNumber(merged, ["io", "io_limit"]);
  if (io !== undefined) result.io = io;
  if (vncRaw !== undefined) result.vncEnabled = toBoolean(vncRaw);
  const createdAt = toIsoString(pick(merged, ["time", "created", "creation_date", "ctime", "date"]));
  if (createdAt) result.createdAt = createdAt;
  return result;
}

export function mapVpsListItem(record: UnknownRecord): VpsListItem {
  const { status, label } = normalizeVpsStatus(record);
  const { ips } = extractIps(record);
  const id = idOf(record) ?? "unknown";
  const item: VpsListItem = {
    id,
    name: pickString(record, ["vps_name", "name", "title", "hostname"]) ?? `VPS ${id}`,
    status,
    statusLabel: label,
  };
  const hostname = pickString(record, ["hostname", "hname"]);
  if (hostname) item.hostname = hostname;
  const primaryIp = ips[0];
  if (primaryIp) item.primaryIp = primaryIp;
  const os = pickString(record, ["os_name", "os", "os_template", "distro"]);
  if (os) item.os = os;
  return item;
}

export function mapVpsList(payload: UnknownRecord): VpsListItem[] {
  return extractVpsRecords(payload).map(mapVpsListItem);
}

/* ------------------------------------------------------------------ */
/* Statistics                                                          */
/* ------------------------------------------------------------------ */

function toUsage(
  record: UnknownRecord | undefined,
  keys: { used: string[]; limit: string[]; free: string[]; percent: string[] },
  unit: ResourceUsage["unit"],
): ResourceUsage {
  const usage: ResourceUsage = { unit };
  const used = pickNumber(record, keys.used);
  const limit = pickNumber(record, keys.limit);
  const free = pickNumber(record, keys.free);
  if (used !== undefined) usage.used = used;
  if (limit !== undefined) usage.limit = limit;
  if (free !== undefined) usage.free = free;
  const percent = pickNumber(record, keys.percent) ?? safePercent(used, limit);
  if (percent !== undefined) usage.percent = percent;
  return usage;
}

export function mapCpuStats(payload: UnknownRecord): CpuStats {
  const cpu = asRecord(payload.cpu) ?? payload;
  const usage = toUsage(cpu, { used: ["used"], limit: ["limit"], free: ["free"], percent: ["percent"] }, "count");
  const stats: CpuStats = { usage };
  const limit = pickNumber(cpu, ["limit"]);
  const used = pickNumber(cpu, ["used"]);
  const free = pickNumber(cpu, ["free"]);
  const percent = usage.percent;
  const manufacturer = pickString(cpu, ["manu", "manufacturer"]);
  if (limit !== undefined) stats.limit = limit;
  if (used !== undefined) stats.used = used;
  if (free !== undefined) stats.free = free;
  if (percent !== undefined) stats.percent = percent;
  if (manufacturer) stats.manufacturer = manufacturer;
  return stats;
}

export function mapRamStats(payload: UnknownRecord): RamStats {
  const ram = asRecord(payload.ram) ?? payload;
  const usage = toUsage(ram, { used: ["used"], limit: ["limit"], free: ["free"], percent: ["percent"] }, "mb");
  const stats: RamStats = { usage };
  const used = pickNumber(ram, ["used"]);
  const limit = pickNumber(ram, ["limit"]);
  const guaranteed = pickNumber(ram, ["guaranteed"]);
  const swap = pickNumber(ram, ["swap"]);
  const free = pickNumber(ram, ["free"]);
  const percent = usage.percent;
  if (used !== undefined) stats.used = used;
  if (limit !== undefined) stats.limit = limit;
  if (guaranteed !== undefined) stats.guaranteed = guaranteed;
  if (swap !== undefined) stats.swap = swap;
  if (free !== undefined) stats.free = free;
  if (percent !== undefined) stats.percent = percent;
  return stats;
}

export function mapDiskStats(payload: UnknownRecord): DiskStats {
  const disk = asRecord(payload.disk) ?? payload;
  const inodes = asRecord(payload.inodes) ?? asRecord(disk.inodes);
  const limitGb = pickNumber(disk, ["limit_gb"]);
  const usedGb = pickNumber(disk, ["used_gb"]);
  const freeGb = pickNumber(disk, ["free_gb"]);
  const useGb = limitGb !== undefined || usedGb !== undefined || freeGb !== undefined;
  const unit: DiskStats["unit"] = useGb ? "gb" : "mb";
  const used = useGb ? usedGb : pickNumber(disk, ["used"]);
  const limit = useGb ? limitGb : pickNumber(disk, ["limit"]);
  const free = useGb ? freeGb : pickNumber(disk, ["free"]);
  const percent = pickNumber(disk, ["percent"]) ?? safePercent(used, limit);
  const usage: ResourceUsage = { unit };
  if (used !== undefined) usage.used = used;
  if (limit !== undefined) usage.limit = limit;
  if (free !== undefined) usage.free = free;
  if (percent !== undefined) usage.percent = percent;

  const stats: DiskStats = { unit, usage };
  if (used !== undefined) stats.used = used;
  if (limit !== undefined) stats.limit = limit;
  if (free !== undefined) stats.free = free;
  if (percent !== undefined) stats.percent = percent;
  if (inodes) {
    const inodeStats: NonNullable<DiskStats["inodes"]> = {};
    const inodeUsed = pickNumber(inodes, ["used"]);
    const inodeLimit = pickNumber(inodes, ["limit"]);
    const inodeFree = pickNumber(inodes, ["free"]);
    const inodePercent = pickNumber(inodes, ["percent"]) ?? safePercent(inodeUsed, inodeLimit);
    if (inodeUsed !== undefined) inodeStats.used = inodeUsed;
    if (inodeLimit !== undefined) inodeStats.limit = inodeLimit;
    if (inodeFree !== undefined) inodeStats.free = inodeFree;
    if (inodePercent !== undefined) inodeStats.percent = inodePercent;
    stats.inodes = inodeStats;
  }
  return stats;
}

function mapDateSeries(value: unknown): BandwidthPoint[] {
  const record = asRecord(value);
  if (record) {
    return Object.entries(record)
      .map(([date, raw]) => ({ date, value: toNumber(raw) ?? 0 }))
      .filter((entry) => entry.date.length > 0);
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        const item = asRecord(entry);
        if (!item) return undefined;
        const date = pickString(item, ["date", "day", "time", "x"]);
        const numeric = pickNumber(item, ["value", "usage", "bytes", "y"]);
        if (!date || numeric === undefined) return undefined;
        return { date, value: numeric };
      })
      .filter((entry): entry is BandwidthPoint => entry !== undefined);
  }
  return [];
}

export function mapBandwidthStats(payload: UnknownRecord): BandwidthStats {
  const bandwidth = asRecord(payload.bandwidth) ?? payload;
  const usage = mapDateSeries(bandwidth.usage);
  const inboundRecord = asRecord(bandwidth.in);
  const outboundRecord = asRecord(bandwidth.out);
  const month = asRecord(payload.month) ?? asRecord(bandwidth.month);
  const usedGb = pickNumber(bandwidth, ["used_gb"]) ?? pickNumber(bandwidth, ["used"]);
  const limitGb = pickNumber(bandwidth, ["limit_gb"]) ?? pickNumber(bandwidth, ["limit"]);
  const freeGb = pickNumber(bandwidth, ["free_gb"]) ?? pickNumber(bandwidth, ["free"]);
  const percent = pickNumber(bandwidth, ["percent"]) ?? safePercent(usedGb, limitGb);

  const resource: ResourceUsage = { unit: "gb" };
  if (usedGb !== undefined) resource.used = usedGb;
  if (limitGb !== undefined) resource.limit = limitGb;
  if (freeGb !== undefined) resource.free = freeGb;
  if (percent !== undefined) resource.percent = percent;

  const stats: BandwidthStats = { monthlyUsage: usage, usage: resource };
  if (usedGb !== undefined) stats.usedGb = usedGb;
  if (limitGb !== undefined) stats.limitGb = limitGb;
  if (freeGb !== undefined) stats.freeGb = freeGb;
  if (percent !== undefined) stats.percent = percent;
  if (inboundRecord) {
    const total = toNumber(inboundRecord.total);
    const inbound: NonNullable<BandwidthStats["inbound"]> = { series: mapDateSeries(inboundRecord) };
    if (total !== undefined) inbound.total = total;
    stats.inbound = inbound;
  }
  if (outboundRecord) {
    const total = toNumber(outboundRecord.total);
    const outbound: NonNullable<BandwidthStats["outbound"]> = { series: mapDateSeries(outboundRecord) };
    if (total !== undefined) outbound.total = total;
    stats.outbound = outbound;
  }
  if (month) {
    const monthInfo: NonNullable<BandwidthStats["month"]> = {};
    const year = pickNumber(month, ["yr", "year"]);
    const monthNumber = pickNumber(month, ["month"]);
    const label = pickString(month, ["mth_txt"]);
    const days = pickNumber(month, ["days"]);
    if (year !== undefined) monthInfo.year = year;
    if (monthNumber !== undefined) monthInfo.month = monthNumber;
    if (label) monthInfo.label = label;
    if (days !== undefined) monthInfo.days = days;
    stats.month = monthInfo;
  }
  const speedMbps = pickNumber(payload, ["speed"]);
  if (speedMbps !== undefined) stats.speedMbps = speedMbps;
  return stats;
}

export function mapMonitorSnapshot(
  payload: UnknownRecord,
  source: MonitorSnapshot["source"] = "live",
  capturedAt = new Date().toISOString(),
): MonitorSnapshot {
  const cpuRecord = asRecord(payload.cpu);
  const ramRecord = asRecord(payload.ram);
  const diskRecord = asRecord(payload.disk);

  const cpuUsed = pickNumber(cpuRecord, ["used"]);
  const cpuLimit = pickNumber(cpuRecord, ["limit"]);
  const cpuPercent =
    pickNumber(cpuRecord, ["percent"]) ?? pickNumber(payload, ["cpu_percent"]) ?? safePercent(cpuUsed, cpuLimit);

  const ramMb = pickNumber(ramRecord, ["used"]) ?? pickNumber(payload, ["ram_used"]);
  const ramLimit = pickNumber(ramRecord, ["limit"]) ?? pickNumber(payload, ["ram_limit"]);
  const diskLimit = pickNumber(diskRecord, ["limit_gb", "limit"]);
  const diskUsed = pickNumber(diskRecord, ["used_gb", "used"]);

  const snapshot: MonitorSnapshot = { capturedAt, source, raw: payload };
  if (cpuPercent !== undefined) snapshot.cpuPercent = cpuPercent;
  if (ramMb !== undefined) snapshot.ramMb = ramMb;
  const ramPercent = pickNumber(ramRecord, ["percent"]) ?? safePercent(ramMb, ramLimit);
  if (ramPercent !== undefined) snapshot.ramPercent = ramPercent;
  const diskMb =
    pickNumber(diskRecord, ["used", "used_mb"]) ??
    (diskUsed !== undefined ? diskUsed * 1024 : undefined) ??
    pickNumber(payload, ["disk_used"]);
  if (diskMb !== undefined) snapshot.diskMb = diskMb;
  const diskPercent = pickNumber(diskRecord, ["percent"]) ?? safePercent(diskUsed, diskLimit);
  if (diskPercent !== undefined) snapshot.diskPercent = diskPercent;
  const netIn = pickNumber(payload, ["net_in", "netin"]);
  if (netIn !== undefined) snapshot.netIn = netIn;
  const netOut = pickNumber(payload, ["net_out", "netout"]);
  if (netOut !== undefined) snapshot.netOut = netOut;
  return snapshot;
}

export function mapStatusLogs(payload: UnknownRecord): MonitorSnapshot[] {
  const list = asArray(payload.var ?? payload.statuslogs ?? payload.logs);
  return list.map((entry) => {
    const record = asRecord(entry) ?? {};
    const capturedAt = toIsoString(record.time) ?? new Date().toISOString();
    const snapshot: MonitorSnapshot = { capturedAt, source: "statuslog", raw: record };
    const cpu = pickNumber(record, ["actual_cpu", "cpu", "cpu_percent"]);
    const ram = pickNumber(record, ["ram", "ram_used"]);
    const disk = pickNumber(record, ["disk", "disk_used"]);
    const netIn = pickNumber(record, ["net_in", "netin"]);
    const netOut = pickNumber(record, ["net_out", "netout"]);
    if (cpu !== undefined) snapshot.cpuPercent = cpu;
    if (ram !== undefined) snapshot.ramMb = ram;
    if (disk !== undefined) snapshot.diskMb = disk;
    if (netIn !== undefined) snapshot.netIn = netIn;
    if (netOut !== undefined) snapshot.netOut = netOut;
    return snapshot;
  });
}

/* ------------------------------------------------------------------ */
/* VNC & rescue                                                        */
/* ------------------------------------------------------------------ */

export function mapVncInfo(payload: UnknownRecord): VncInfo {
  const source = asRecord(payload.vnc) ?? payload;
  const port = pickNumber(source, ["port"]);
  const host = pickString(source, ["ip", "host", "hostname"]) ?? pickString(payload, ["ip", "host"]);
  const password = pickString(source, ["password", "pass"]);
  const novnc = pickString(source, ["novnc", "novnc_url"]) ?? pickString(payload, ["novnc"]);
  const available = Boolean(port || novnc);
  const info: VncInfo = { available };
  if (host) info.host = host;
  if (port !== undefined) info.port = port;
  if (password) info.password = password;
  if (novnc) info.novncUrl = novnc;
  if (!available) info.reason = "VNC is not available for this VPS.";
  return info;
}

/* ------------------------------------------------------------------ */
/* Services & processes                                                */
/* ------------------------------------------------------------------ */

export function mapServices(payload: UnknownRecord): ServiceInfo[] {
  const services = asRecord(payload.services);
  const running = asRecord(payload.running);
  const autostart = asArray(payload.autostart)
    .map((value) => toStringValue(value))
    .filter((value): value is string => Boolean(value));

  const runningNames = new Set<string>();
  if (running) {
    for (const [key, value] of Object.entries(running)) {
      const name = toStringValue(value);
      if (name) runningNames.add(name);
      runningNames.add(key);
    }
  }

  if (!services) {
    return asArray(payload.services)
      .map((value) => toStringValue(value))
      .filter((value): value is string => Boolean(value))
      .map((name) => {
        const info: ServiceInfo = { name, running: runningNames.has(name) };
        if (autostart.includes(name)) info.autostart = true;
        return info;
      });
  }

  return Object.entries(services).map(([key, value]) => {
    const name = toStringValue(value) ?? key;
    const info: ServiceInfo = { name, running: runningNames.has(name) };
    if (autostart.includes(name)) info.autostart = true;
    return info;
  });
}

export function mapProcesses(payload: UnknownRecord): ProcessInfo[] {
  return asArray(payload.processes)
    .map((entry): ProcessInfo | undefined => {
      const record = asRecord(entry);
      if (!record) return undefined;
      const pidRaw = pick(record, ["PID", "pid"]);
      const pidNumber = toNumber(pidRaw);
      if (pidNumber === undefined) return undefined;
      const process: ProcessInfo = { pid: pidNumber, command: pickString(record, ["COMMAND", "command", "cmd"]) ?? "Unavailable" };
      const user = pickString(record, ["USER", "user"]);
      if (user) process.user = user;
      const cpuPercent = pickNumber(record, ["%CPU", "cpu", "cpu_percent"]);
      if (cpuPercent !== undefined) process.cpuPercent = cpuPercent;
      const memoryPercent = pickNumber(record, ["%MEM", "mem", "mem_percent"]);
      if (memoryPercent !== undefined) process.memoryPercent = memoryPercent;
      const rss = pickNumber(record, ["RSS", "rss"]);
      if (rss !== undefined) process.memoryKb = Math.abs(rss);
      const state = pickString(record, ["STAT", "stat", "state"]);
      if (state) process.state = state;
      const time = pickString(record, ["TIME", "time"]);
      if (time) process.time = time;
      return process;
    })
    .filter((value): value is ProcessInfo => value !== undefined);
}

/* ------------------------------------------------------------------ */
/* Backups                                                             */
/* ------------------------------------------------------------------ */

export function mapBackups(payload: UnknownRecord): BackupInfo[] {
  const raw = payload.backups ?? payload.backup2 ?? payload.backup;
  return normalizeCollection(raw, ["bkid", "id", "bid"]).map((entry) => {
    const record = asRecord(entry) ?? {};
    const backup: BackupInfo = { id: pickString(record, ["bkid", "id", "bid"]) ?? "unknown" };
    const name = pickString(record, ["name", "backup_name", "filename"]);
    if (name) backup.name = name;
    const createdAt = toIsoString(pick(record, ["time", "date", "created"]));
    if (createdAt) backup.createdAt = createdAt;
    const sizeMb = pickNumber(record, ["size", "size_mb"]);
    if (sizeMb !== undefined) backup.sizeMb = sizeMb;
    const status = pickString(record, ["status", "state"]);
    if (status) backup.status = status;
    const type = pickString(record, ["type", "backup_type"]);
    if (type) backup.type = type;
    return backup;
  });
}

/* ------------------------------------------------------------------ */
/* Volumes                                                             */
/* ------------------------------------------------------------------ */

export function mapVolumes(payload: UnknownRecord): VolumeInfo[] {
  const raw = payload.volume ?? payload.volumes;
  return normalizeCollection(raw, ["did", "id", "volid"]).map((entry) => {
    const record = asRecord(entry) ?? {};
    const volume: VolumeInfo = { id: pickString(record, ["did", "id", "volid"]) ?? "unknown" };
    const name = pickString(record, ["volname", "name", "disk_name"]);
    if (name) volume.name = name;
    const size = pickNumber(record, ["size", "vol_size"]);
    if (size !== undefined) volume.size = size;
    const sizeUnit = pickString(record, ["size_unit", "unit"]);
    if (sizeUnit) volume.sizeUnit = sizeUnit;
    const format = pickString(record, ["format"]);
    if (format) volume.format = format;
    const status = pickString(record, ["status", "state"]);
    if (status) volume.status = status;
    // Strict boolean: v1 used Boolean(string), so "0" was reported as attached.
    const attached = pickBoolean(record, ["attached", "attach_vol"]);
    if (attached !== undefined) volume.attached = attached;
    const mountPoint = pickString(record, ["mnt_point", "mntpoint", "mount"]);
    if (mountPoint) volume.mountPoint = mountPoint;
    const vpsId = pickString(record, ["vpsid", "vps_sel"]);
    if (vpsId && vpsId !== "0") volume.vpsId = vpsId;
    return volume;
  });
}

/* ------------------------------------------------------------------ */
/* ISO                                                                 */
/* ------------------------------------------------------------------ */

export function mapIsos(payload: UnknownRecord): IsoInfo[] {
  const raw = payload.isos ?? payload.euiso;
  if (Array.isArray(raw)) {
    return raw.map((entry, index) => {
      const record = asRecord(entry) ?? {};
      const iso: IsoInfo = {
        id: pickString(record, ["isoid", "id", "uuid"]) ?? String(index),
        name: pickString(record, ["iso", "name", "filename"]) ?? "Unavailable",
      };
      const sizeMb = pickNumber(record, ["size", "size_mb"]);
      if (sizeMb !== undefined) iso.size = sizeMb;
      const downloaded = pickBoolean(record, ["downloaded"]);
      if (downloaded !== undefined) iso.downloaded = downloaded;
      const active = pickBoolean(record, ["active"]);
      if (active !== undefined) iso.active = active;
      const distro = pickString(record, ["distro"]);
      if (distro) iso.distro = distro;
      const url = pickString(record, ["iso_url", "url"]);
      if (url) iso.url = url;
      return iso;
    });
  }
  const keyed = asRecord(raw);
  if (!keyed) return [];
  return Object.entries(keyed)
    .filter(([, value]) => asRecord(value) !== undefined || typeof value === "string")
    .map(([id, value]) => {
      const record = typeof value === "string" ? { iso: value } : (asRecord(value) ?? {});
      const iso: IsoInfo = {
        id: pickString(record, ["isoid", "id", "uuid"]) ?? id,
        name: pickString(record, ["iso", "name", "filename"]) ?? id,
      };
      const sizeMb = pickNumber(record, ["size", "size_mb"]);
      if (sizeMb !== undefined) iso.size = sizeMb;
      const downloaded = pickBoolean(record, ["downloaded"]);
      if (downloaded !== undefined) iso.downloaded = downloaded;
      const active = pickBoolean(record, ["active"]);
      if (active !== undefined) iso.active = active;
      const distro = pickString(record, ["distro"]);
      if (distro) iso.distro = distro;
      const url = pickString(record, ["iso_url", "url"]);
      if (url) iso.url = url;
      return iso;
    });
}

/* ------------------------------------------------------------------ */
/* SSH keys                                                            */
/* ------------------------------------------------------------------ */

export function mapSshKeys(payload: UnknownRecord): SshKeyInfo[] {
  const raw = payload.sshkeys ?? payload.ssh_keys ?? payload.keys;
  if (Array.isArray(raw)) {
    return raw.map((entry, index) => {
      const record = asRecord(entry) ?? {};
      const key: SshKeyInfo = {
        id: pickString(record, ["keyid", "id"]) ?? String(index),
        name: pickString(record, ["name"]) ?? "Unnamed key",
      };
      const value = pickString(record, ["value", "key", "public_key"]);
      if (value) key.value = value;
      const fingerprint = pickString(record, ["fingerprint", "fp"]);
      if (fingerprint) key.fingerprint = fingerprint;
      return key;
    });
  }
  const keyed = asRecord(raw);
  if (!keyed) return [];
  return Object.entries(keyed).map(([id, value]) => {
    const record = asRecord(value) ?? {};
    const key: SshKeyInfo = {
      id: pickString(record, ["keyid", "id"]) ?? id,
      name: pickString(record, ["name"]) ?? id,
    };
    const keyValue = pickString(record, ["value", "key", "public_key"]);
    if (keyValue) key.value = keyValue;
    const fingerprint = pickString(record, ["fingerprint", "fp"]);
    if (fingerprint) key.fingerprint = fingerprint;
    return key;
  });
}

/* ------------------------------------------------------------------ */
/* Firewall                                                            */
/* ------------------------------------------------------------------ */

function parseRulesInput(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    try {
      return JSON.parse(trimmed);
    } catch {
      return undefined;
    }
  }
  return value;
}

export function mapFirewallRules(value: unknown): FirewallRule[] {
  const parsed = parseRulesInput(value);
  return asArray(parsed).map((entry) => {
    // Some panels return rules as positional arrays.
    if (Array.isArray(entry)) {
      const [action, protocol, port, source, destination, comment] = entry.map((item) => toStringValue(item));
      const rule: FirewallRule = {
        action: action === "DROP" ? "DROP" : "ACCEPT",
        protocol: protocol ?? "TCP",
      };
      if (port) rule.port = port;
      if (source) rule.source = source;
      if (destination) rule.destination = destination;
      if (comment) rule.comment = comment;
      return rule;
    }
    const record = asRecord(entry) ?? {};
    const rule: FirewallRule = {
      action: pickString(record, ["action", "act"]) === "DROP" ? "DROP" : "ACCEPT",
      protocol: pickString(record, ["protocol", "proto"]) ?? "TCP",
    };
    const id = pickString(record, ["id", "rid"]);
    if (id) rule.id = id;
    const port = pickString(record, ["port", "dport"]);
    if (port) rule.port = port;
    const source = pickString(record, ["source", "src", "source_ip"]);
    if (source) rule.source = source;
    const destination = pickString(record, ["destination", "dest", "dest_ip"]);
    if (destination) rule.destination = destination;
    const comment = pickString(record, ["comment", "note", "name"]);
    if (comment) rule.comment = comment;
    return rule;
  });
}

export function mapFirewallPlans(payload: UnknownRecord): FirewallPlan[] {
  const raw = payload.firewallplan ?? payload.firewall_plans ?? payload.plans;
  return normalizeCollection(raw, ["fwp_id", "id", "fwid"]).map((entry) => {
    const record = asRecord(entry) ?? {};
    const plan: FirewallPlan = {
      id: pickString(record, ["fwp_id", "id", "fwid"]) ?? "unknown",
      name: pickString(record, ["fwp_name", "name", "title"]) ?? "Unnamed plan",
      rules: mapFirewallRules(record.api_firewall_rules ?? record.rules ?? record.fwrules),
    };
    const defaultPolicy = pickString(record, ["default_policy", "policy"]);
    if (defaultPolicy === "ACCEPT" || defaultPolicy === "DROP") plan.defaultPolicy = defaultPolicy;
    const note = pickString(record, ["fwp_note", "note"]);
    if (note) plan.note = note;
    return plan;
  });
}

/* ------------------------------------------------------------------ */
/* Reverse DNS, DNS                                                    */
/* ------------------------------------------------------------------ */

export function mapReverseDns(payload: UnknownRecord): ReverseDnsRecord[] {
  const raw = payload.rdns ?? payload.rdns_records;
  return normalizeCollection(raw, ["pdnsid", "id", "rdnsid"]).map((entry) => {
    const record = asRecord(entry) ?? {};
    return {
      id: pickString(record, ["pdnsid", "id", "rdnsid"]) ?? "unknown",
      ip: pickString(record, ["ip", "rdns_ip"]) ?? "Unavailable",
      domain: pickString(record, ["domain", "rdns_domain", "hostname"]) ?? "Unavailable",
    };
  });
}

export function mapDnsZones(payload: UnknownRecord): DnsZone[] {
  const raw = payload.pdns ?? payload.dns;
  return normalizeCollection(raw, ["domainid", "id", "pdnsid"]).map((entry) => {
    const record = asRecord(entry) ?? {};
    return {
      id: pickString(record, ["domainid", "id", "pdnsid"]) ?? "unknown",
      domain: pickString(record, ["domain", "name"]) ?? "Unavailable",
      records: [],
    };
  });
}

export function mapZoneRecords(payload: UnknownRecord): DnsRecord[] {
  const records = payload.records ?? payload.dns_records ?? asRecord(payload.zone)?.records;
  return asArray(records).map((entry, index) => {
    const record = asRecord(entry) ?? {};
    const dns: DnsRecord = {
      id: pickString(record, ["id", "rid"]) ?? String(index),
      name: pickString(record, ["name", "host"]) ?? "@",
      type: pickString(record, ["type", "rtype"]) ?? "A",
      content: pickString(record, ["content", "value", "data"]) ?? "",
    };
    const priority = pickNumber(record, ["prio", "priority"]);
    if (priority !== undefined) dns.priority = priority;
    const ttl = pickNumber(record, ["ttl"]);
    if (ttl !== undefined) dns.ttl = ttl;
    return dns;
  });
}

/* ------------------------------------------------------------------ */
/* Tasks & API keys                                                    */
/* ------------------------------------------------------------------ */

function normalizeTaskStatus(raw: string | undefined): { status: TaskStatus; label: string } {
  const text = raw?.trim().toLowerCase();
  if (!text) return { status: "unknown", label: "Unknown" };
  if (["pending", "queued", "waiting"].includes(text)) return { status: "pending", label: "Pending" };
  if (["running", "in progress", "processing", "active"].includes(text)) return { status: "running", label: "Running" };
  if (["completed", "complete", "done", "success", "finished"].includes(text)) {
    return { status: "completed", label: "Completed" };
  }
  if (["failed", "error", "cancelled", "canceled"].includes(text)) return { status: "failed", label: "Failed" };
  return { status: "unknown", label: raw ?? "Unknown" };
}

export function mapTasks(payload: UnknownRecord): TaskInfo[] {
  const tasks = asArray(payload.tasks ?? payload.ctasks ?? payload.act_tasks);
  return tasks.map((entry, index) => {
    const record = asRecord(entry) ?? {};
    const { status, label } = normalizeTaskStatus(pickString(record, ["status", "state"]));
    const task: TaskInfo = {
      id: pickString(record, ["taskid", "id"]) ?? String(index),
      status,
      statusLabel: label,
    };
    const action = pickString(record, ["act", "action", "task"]);
    if (action) task.action = action;
    const progress = pickNumber(record, ["progress", "percent"]);
    if (progress !== undefined) task.progress = progress;
    const createdAt = toIsoString(pick(record, ["time", "created"]));
    if (createdAt) task.createdAt = createdAt;
    const message = pickString(record, ["msg", "message"]);
    if (message) task.message = message;
    return task;
  });
}

export function mapApiKeys(payload: UnknownRecord): ApiKeyInfo[] {
  const raw = payload.apikeys ?? payload.api_keys ?? payload.keys;
  return normalizeCollection(raw, ["id", "keyid"]).map((entry, index) => {
    const record = asRecord(entry) ?? {};
    const key: ApiKeyInfo = { id: pickString(record, ["id", "keyid"]) ?? String(index) };
    const name = pickString(record, ["name", "label"]);
    if (name) key.name = name;
    const createdAt = toIsoString(pick(record, ["time", "created"]));
    if (createdAt) key.createdAt = createdAt;
    const lastUsed = toIsoString(pick(record, ["lastused", "last_used"]));
    if (lastUsed) key.lastUsed = lastUsed;
    return key;
  });
}

/* ------------------------------------------------------------------ */
/* IPs & reinstall options                                             */
/* ------------------------------------------------------------------ */

export function mapIps(payload: UnknownRecord): IpInfo[] {
  const raw = payload.ips ?? payload.ip;
  const collected: string[] = [];
  collectIpStrings(raw, collected);
  const unique = Array.from(new Set(collected));

  const primaryValue = pickString(payload, ["main_ip", "primary_ip", "ip"]);
  const primary = primaryValue && isIp(primaryValue) ? primaryValue : undefined;

  return unique.map((ip, index) => {
    const info: IpInfo = {
      ip,
      version: isIpv6(ip) ? 6 : 4,
      primary: primary ? ip === primary : index === 0,
    };
    return info;
  });
}

export function mapReinstallOptions(payload: UnknownRecord): ReinstallOption[] {
  const raw = payload.oslist ?? payload.os ?? payload.templates;
  if (Array.isArray(raw)) {
    return raw
      .map((entry): ReinstallOption | undefined => {
        const record = asRecord(entry);
        if (record) {
          const osId = pickString(record, ["osid", "id"]);
          if (!osId) return undefined;
          const option: ReinstallOption = {
            osId,
            name: pickString(record, ["name", "os_name", "title"]) ?? osId,
          };
          const group = pickString(record, ["group", "family", "distro"]);
          if (group) option.group = group;
          return option;
        }
        const value = toStringValue(entry);
        if (!value) return undefined;
        return { osId: value, name: value };
      })
      .filter((value): value is ReinstallOption => value !== undefined);
  }
  const keyed = asRecord(raw);
  if (!keyed) return [];
  return Object.entries(keyed).map(([id, value]) => {
    const record = asRecord(value);
    if (record) {
      const option: ReinstallOption = {
        osId: pickString(record, ["osid", "id"]) ?? id,
        name: pickString(record, ["name", "os_name", "title"]) ?? id,
      };
      const group = pickString(record, ["group", "family", "distro"]);
      if (group) option.group = group;
      return option;
    }
    return { osId: id, name: toStringValue(value) ?? id };
  });
}
