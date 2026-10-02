import "server-only";

import { loadVirtualizorConfig, type VirtualizorConfig } from "./config";
import { extractSuccessMessage, getVirtualizorClient, type VirtualizorClient } from "./client";
import { VirtualizorError } from "./errors";
import * as parse from "./parse";
import type {
  ActionSuccess,
  ApiKeyInfo,
  BackupInfo,
  BandwidthStats,
  CpuStats,
  DiskStats,
  DnsRecord,
  DnsZone,
  FirewallPlan,
  IpInfo,
  IsoInfo,
  MonitorSnapshot,
  ProcessInfo,
  RamStats,
  ReinstallOption,
  ReverseDnsRecord,
  ServiceInfo,
  SshKeyInfo,
  StatsBundle,
  TaskInfo,
  VncInfo,
  VolumeInfo,
  VpsInfo,
  VpsListItem,
  UnknownRecord,
} from "./types";
import type {
  DnsRecordInput,
  FirewallRuleInput,
  IsoAddInput,
  SshKeyInput,
  VolumeInput,
} from "./validators";

/**
 * High level, typed operations over the Virtualizor Enduser API.
 * Route handlers call these; the UI calls the routes.
 */

interface Context {
  client: VirtualizorClient;
  config: VirtualizorConfig;
  vpsId: string;
}

function createContext(overrideVpsId?: string): Context {
  const result = loadVirtualizorConfig();
  if (!result.ok) throw result.error;
  return {
    client: getVirtualizorClient(result.config),
    config: result.config,
    vpsId: overrideVpsId ?? result.config.vpsId ?? "",
  };
}

function requireVpsId(context: Context): string {
  if (!context.vpsId) {
    throw new VirtualizorError({
      code: "VIRTUALIZOR_CONFIG_ERROR",
      message: "This action requires a VPS ID. Set VIRTUALIZOR_VPS_ID or select a VPS.",
    });
  }
  return context.vpsId;
}

/** VPS-scoped request options: omit `svs` when no VPS is selected. */
function scoped(context: Context): { vpsId: string | null } {
  return { vpsId: context.vpsId || null };
}

function actionResult(payload: UnknownRecord, fallback: string): ActionSuccess {
  return { message: extractSuccessMessage(payload, fallback), data: payload };
}

function isFallbackEligible(error: unknown): boolean {
  if (!VirtualizorError.is(error)) return false;
  return (
    error.code === "VIRTUALIZOR_UNSUPPORTED" ||
    error.code === "VIRTUALIZOR_NOT_FOUND" ||
    error.code === "VIRTUALIZOR_API_ERROR"
  );
}

/* ------------------------------------------------------------------ */
/* Virtual server                                                      */
/* ------------------------------------------------------------------ */

export async function listVps(): Promise<VpsListItem[]> {
  const context = createContext();
  const { payload } = await context.client.request({ act: "listvs", vpsId: null });
  return parse.mapVpsList(payload);
}

export async function getVpsInfo(vpsId?: string): Promise<VpsInfo> {
  const context = createContext(vpsId);
  const options = { act: "vpsmanage", ...scoped(context) };
  try {
    const { payload } = await context.client.request(options);
    return parse.mapVpsInfo(payload, context.vpsId);
  } catch (error) {
    if (!isFallbackEligible(error)) throw error;
    const { payload } = await context.client.request({ act: "listvs", vpsId: null });
    return parse.mapVpsInfo(payload, context.vpsId);
  }
}

export async function getIps(vpsId?: string): Promise<IpInfo[]> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({ act: "ips", ...scoped(context) });
  return parse.mapIps(payload);
}

export type PowerAction = "start" | "stop" | "restart" | "poweroff";

export async function powerAction(action: PowerAction, vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  requireVpsId(context);
  const messages: Record<PowerAction, string> = {
    start: "The VPS was started successfully.",
    stop: "The shutdown signal has been sent to the VPS.",
    restart: "The VPS was restarted successfully.",
    poweroff: "The VPS was powered off successfully.",
  };
  const { payload } = await context.client.request({
    act: action,
    query: { do: 1 },
    ...scoped(context),
  });
  return actionResult(payload, messages[action]);
}

/* ------------------------------------------------------------------ */
/* Statistics & monitoring                                             */
/* ------------------------------------------------------------------ */

export async function getCpuStats(vpsId?: string): Promise<CpuStats> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({ act: "cpu", ...scoped(context) });
  return parse.mapCpuStats(payload);
}

export async function getRamStats(vpsId?: string): Promise<RamStats> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({ act: "ram", ...scoped(context) });
  return parse.mapRamStats(payload);
}

export async function getDiskStats(vpsId?: string): Promise<DiskStats> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({ act: "disk", ...scoped(context) });
  return parse.mapDiskStats(payload);
}

export async function getBandwidthStats(show?: string, vpsId?: string): Promise<BandwidthStats> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({
    act: "bandwidth",
    query: show ? { show } : undefined,
    ...scoped(context),
  });
  return parse.mapBandwidthStats(payload);
}

export async function getMonitor(vpsId?: string): Promise<MonitorSnapshot> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({ act: "monitor", longRunning: true, ...scoped(context) });
  return parse.mapMonitorSnapshot(payload);
}

export async function getStatusLogs(vpsId?: string): Promise<MonitorSnapshot[]> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({ act: "statuslogs", ...scoped(context) });
  return parse.mapStatusLogs(payload);
}

/**
 * Fetch the four primary stats resources in parallel.
 * A failure in one resource never hides the others: each error is reported
 * against its own key and the UI renders `Unavailable` only for that card.
 */
export async function getStatsBundle(vpsId?: string): Promise<StatsBundle> {
  const context = createContext(vpsId);
  const errors: StatsBundle["errors"] = {};

  const settle = async <K extends keyof Omit<StatsBundle, "errors">>(
    key: K,
    task: () => Promise<StatsBundle[K]>,
  ): Promise<StatsBundle[K] | undefined> => {
    try {
      return await task();
    } catch (error) {
      errors[key] = VirtualizorError.is(error) ? error.message : "Unavailable";
      return undefined;
    }
  };

  const [cpu, ram, disk, bandwidth] = await Promise.all([
    settle("cpu", () => getCpuStats(context.vpsId || undefined)),
    settle("ram", () => getRamStats(context.vpsId || undefined)),
    settle("disk", () => getDiskStats(context.vpsId || undefined)),
    settle("bandwidth", () => getBandwidthStats(undefined, context.vpsId || undefined)),
  ]);

  const bundle: StatsBundle = { errors };
  if (cpu) bundle.cpu = cpu;
  if (ram) bundle.ram = ram;
  if (disk) bundle.disk = disk;
  if (bandwidth) bundle.bandwidth = bandwidth;
  return bundle;
}

/* ------------------------------------------------------------------ */
/* VNC & rescue                                                        */
/* ------------------------------------------------------------------ */

export async function getVncInfo(vpsId?: string): Promise<VncInfo> {
  const context = createContext(vpsId);
  const id = requireVpsId(context);
  const { payload } = await context.client.request({
    act: "vnc",
    query: { novnc: id, do: "add" },
    ...scoped(context),
  });
  return parse.mapVncInfo(payload);
}

export async function setVncPassword(password: string, vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  requireVpsId(context);
  const { payload } = await context.client.request({
    act: "vncpass",
    method: "POST",
    query: { do: 1 },
    body: { vncpass: 1, newpass: password, conf: password },
    ...scoped(context),
  });
  return actionResult(payload, "VNC password updated successfully.");
}

export async function enableRescue(password: string, vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  const id = requireVpsId(context);
  const { payload } = await context.client.request({
    act: "rescue",
    method: "POST",
    query: { do: 1 },
    body: { enablerescue: 1, password, conf_password: password, vid: id },
    ...scoped(context),
  });
  return actionResult(payload, "Rescue mode enabled.");
}

export async function disableRescue(vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  const id = requireVpsId(context);
  const { payload } = await context.client.request({
    act: "rescue",
    method: "POST",
    body: { disablerescue: 1, vid: id },
    ...scoped(context),
  });
  return actionResult(payload, "Rescue mode disabled.");
}

/* ------------------------------------------------------------------ */
/* OS reinstall, hostname, root password                               */
/* ------------------------------------------------------------------ */

export async function getReinstallOptions(vpsId?: string): Promise<ReinstallOption[]> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({ act: "ostemplate", ...scoped(context) });
  return parse.mapReinstallOptions(payload);
}

export async function reinstallOs(
  input: { osId: string; newPassword: string; rebuildSshKey?: boolean },
  vpsId?: string,
): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  const id = requireVpsId(context);
  const { payload } = await context.client.request({
    act: "ostemplate",
    method: "POST",
    longRunning: true,
    body: {
      reinsos: 1,
      newos: input.osId,
      newpass: input.newPassword,
      conf: input.newPassword,
      vid: id,
      ...(input.rebuildSshKey ? { rebuild_sshkey: 1 } : {}),
    },
    ...scoped(context),
  });
  return actionResult(payload, "The OS reinstall has been requested.");
}

export async function changeHostname(hostname: string, vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  requireVpsId(context);
  const { payload } = await context.client.request({
    act: "hostname",
    method: "POST",
    query: { do: 1 },
    body: { changehost: 1, newhost: hostname },
    ...scoped(context),
  });
  return actionResult(payload, "Hostname updated.");
}

export async function changeRootPassword(newPassword: string, vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  requireVpsId(context);
  const { payload } = await context.client.request({
    act: "changepassword",
    method: "POST",
    query: { do: 1 },
    body: { changepass: 1, newpass: newPassword, conf: newPassword },
    ...scoped(context),
  });
  return actionResult(payload, "Root password updated.");
}

/* ------------------------------------------------------------------ */
/* Firewall                                                            */
/* ------------------------------------------------------------------ */

export async function getFirewallPlans(vpsId?: string): Promise<FirewallPlan[]> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({ act: "firewallplan", ...scoped(context) });
  return parse.mapFirewallPlans(payload);
}

export async function addFirewallPlan(input: FirewallRuleInput, vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({
    act: "firewallplan",
    method: "POST",
    body: {
      addplan: 1,
      fwp_name: input.name,
      default_policy: input.defaultPolicy ?? "DROP",
      fwp_note: input.note,
      api_firewall_rules: JSON.stringify(input.rules),
    },
    ...scoped(context),
  });
  return actionResult(payload, "Firewall plan added.");
}

export async function deleteFirewallPlans(planIds: string[], vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({
    act: "firewallplan",
    method: "POST",
    body: { delete_fwids: planIds },
    ...scoped(context),
  });
  return actionResult(payload, "Firewall plan deleted.");
}

/* ------------------------------------------------------------------ */
/* SSH keys                                                            */
/* ------------------------------------------------------------------ */

export async function getSshKeys(): Promise<SshKeyInfo[]> {
  const context = createContext();
  const { payload } = await context.client.request({ act: "sshkeys", vpsId: null });
  return parse.mapSshKeys(payload);
}

export async function addSshKey(input: SshKeyInput): Promise<ActionSuccess> {
  const context = createContext();
  const { payload } = await context.client.request({
    act: "addsshkey",
    vpsId: null,
    method: "POST",
    body: { name: input.name, value: input.value },
  });
  return actionResult(payload, "SSH key added.");
}

export async function editSshKey(input: SshKeyInput & { keyId: string }): Promise<ActionSuccess> {
  const context = createContext();
  const { payload } = await context.client.request({
    act: "editsshkey",
    vpsId: null,
    method: "POST",
    query: { keyid: input.keyId },
    body: { name: input.name, value: input.value },
  });
  return actionResult(payload, "SSH key updated.");
}

export async function deleteSshKey(keyId: string): Promise<ActionSuccess> {
  const context = createContext();
  const { payload } = await context.client.request({
    act: "sshkeys",
    vpsId: null,
    method: "POST",
    body: { delete: keyId },
  });
  return actionResult(payload, "SSH key deleted.");
}

export async function applySshKeys(keyIds: string[], vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  requireVpsId(context);
  const { payload } = await context.client.request({
    act: "sshkeys",
    method: "POST",
    body: { ssh_keys: keyIds },
    ...scoped(context),
  });
  return actionResult(payload, "SSH keys applied to the VPS.");
}

/* ------------------------------------------------------------------ */
/* Backups                                                             */
/* ------------------------------------------------------------------ */

export async function getBackups(vpsId?: string): Promise<BackupInfo[]> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({ act: "backup2", ...scoped(context) });
  return parse.mapBackups(payload);
}

export async function createBackup(vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  requireVpsId(context);
  const { payload } = await context.client.request({
    act: "backup2",
    method: "POST",
    longRunning: true,
    body: { cbackup: 1 },
    ...scoped(context),
  });
  return actionResult(payload, "Backup requested.");
}

export async function restoreBackup(backupId: string, vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  requireVpsId(context);
  const { payload } = await context.client.request({
    act: "backups",
    method: "POST",
    longRunning: true,
    body: { bkid: backupId, restore: 1 },
    ...scoped(context),
  });
  return actionResult(payload, "Backup restore requested.");
}

export async function deleteBackup(backupId: string, vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({
    act: "backup",
    method: "POST",
    body: { bkid: backupId, delete: 1 },
    ...scoped(context),
  });
  return actionResult(payload, "Backup deleted.");
}

/* ------------------------------------------------------------------ */
/* ISO                                                                 */
/* ------------------------------------------------------------------ */

export async function getIsos(vpsId?: string): Promise<IsoInfo[]> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({ act: "euiso", ...scoped(context) });
  return parse.mapIsos(payload);
}

export async function addIso(input: IsoAddInput, vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({
    act: "addiso",
    method: "POST",
    longRunning: true,
    body: { addiso: 1, filename: input.filename, iso_url: input.isoUrl },
    ...scoped(context),
  });
  return actionResult(payload, "ISO download started.");
}

export async function deleteIso(isoId: string, vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({
    act: "euiso",
    method: "POST",
    body: { del: isoId },
    ...scoped(context),
  });
  return actionResult(payload, "ISO deleted.");
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

export async function getServices(vpsId?: string): Promise<ServiceInfo[]> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({ act: "services", ...scoped(context) });
  return parse.mapServices(payload);
}

export async function manageService(
  action: "start" | "stop" | "restart",
  services: string[],
  vpsId?: string,
): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  requireVpsId(context);
  const flag = `${action}_x`;
  const { payload } = await context.client.request({
    act: "services",
    method: "POST",
    body: { [flag]: 1, sel_serv: services },
    ...scoped(context),
  });
  return actionResult(payload, `Service ${action} issued.`);
}

/* ------------------------------------------------------------------ */
/* Processes                                                           */
/* ------------------------------------------------------------------ */

export async function getProcesses(vpsId?: string): Promise<ProcessInfo[]> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({ act: "processes", ...scoped(context) });
  return parse.mapProcesses(payload);
}

export async function killProcesses(pids: string[], vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  requireVpsId(context);
  const { payload } = await context.client.request({
    act: "processes",
    method: "POST",
    body: { sel_proc: pids },
    ...scoped(context),
  });
  return actionResult(payload, "Process termination issued.");
}

/* ------------------------------------------------------------------ */
/* Volumes                                                             */
/* ------------------------------------------------------------------ */

export async function getVolumes(): Promise<VolumeInfo[]> {
  const context = createContext();
  const { payload } = await context.client.request({ act: "volume", vpsId: null });
  return parse.mapVolumes(payload);
}

export async function addVolume(input: VolumeInput, vpsId?: string): Promise<ActionSuccess> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({
    act: "volume",
    method: "POST",
    vpsId: null,
    body: {
      addvolume: 1,
      volname: input.name,
      vol_size: input.size,
      format: input.format,
      vps_sel: context.vpsId,
      attach_vol: input.attach ? 1 : 0,
      mntpoint: input.mountPoint,
    },
  });
  return actionResult(payload, "Volume created.");
}

export async function deleteVolume(volumeId: string): Promise<ActionSuccess> {
  const context = createContext();
  const { payload } = await context.client.request({
    act: "volume",
    vpsId: null,
    method: "POST",
    body: { delvol: volumeId },
  });
  return actionResult(payload, "Volume deleted.");
}

/* ------------------------------------------------------------------ */
/* Reverse DNS                                                         */
/* ------------------------------------------------------------------ */

export async function getReverseDns(): Promise<ReverseDnsRecord[]> {
  const context = createContext();
  const { payload } = await context.client.request({ act: "rdns", vpsId: null });
  return parse.mapReverseDns(payload);
}

export async function addReverseDns(ip: string, domain: string): Promise<ActionSuccess> {
  const context = createContext();
  const { payload } = await context.client.request({
    act: "rdns",
    vpsId: null,
    method: "POST",
    body: { rdns: 1, rdns_ip: ip, rdns_domain: domain },
  });
  return actionResult(payload, "Reverse DNS record added.");
}

export async function deleteReverseDns(recordId: string): Promise<ActionSuccess> {
  const context = createContext();
  const { payload } = await context.client.request({
    act: "rdns",
    vpsId: null,
    method: "POST",
    body: { delete: recordId },
  });
  return actionResult(payload, "Reverse DNS record deleted.");
}

/* ------------------------------------------------------------------ */
/* DNS                                                                 */
/* ------------------------------------------------------------------ */

export async function getDnsZones(): Promise<DnsZone[]> {
  const context = createContext();
  const { payload } = await context.client.request({ act: "pdns", vpsId: null });
  return parse.mapDnsZones(payload);
}

export async function getZoneRecords(domainId: string): Promise<DnsRecord[]> {
  const context = createContext();
  const { payload } = await context.client.request({
    act: "managezone",
    vpsId: null,
    query: { domainid: domainId },
  });
  return parse.mapZoneRecords(payload);
}

export async function addDnsRecord(input: DnsRecordInput): Promise<ActionSuccess> {
  const context = createContext();
  const { payload } = await context.client.request({
    act: "managezone",
    vpsId: null,
    method: "POST",
    query: { domainid: input.domainId },
    body: {
      add: 1,
      name: input.name,
      type: input.type,
      content: input.content,
      prio: input.priority,
      ttl: input.ttl,
    },
  });
  return actionResult(payload, "DNS record added.");
}

export async function editDnsRecord(input: DnsRecordInput & { recordId: string }): Promise<ActionSuccess> {
  const context = createContext();
  const { payload } = await context.client.request({
    act: "managezone",
    vpsId: null,
    method: "POST",
    query: { domainid: input.domainId },
    body: {
      edit: 1,
      id: input.recordId,
      name: input.name,
      type: input.type,
      content: input.content,
      prio: input.priority,
      ttl: input.ttl,
    },
  });
  return actionResult(payload, "DNS record updated.");
}

export async function deleteDnsRecord(domainId: string, recordId: string): Promise<ActionSuccess> {
  const context = createContext();
  const { payload } = await context.client.request({
    act: "managezone",
    vpsId: null,
    method: "POST",
    query: { domainid: domainId },
    body: { del: 1, id: recordId },
  });
  return actionResult(payload, "DNS record deleted.");
}

export async function deleteDnsZone(zoneId: string): Promise<ActionSuccess> {
  const context = createContext();
  const { payload } = await context.client.request({
    act: "pdns",
    vpsId: null,
    method: "POST",
    body: { del: zoneId },
  });
  return actionResult(payload, "DNS zone deleted.");
}

/* ------------------------------------------------------------------ */
/* API credentials, tasks                                              */
/* ------------------------------------------------------------------ */

export async function getApiKeys(): Promise<ApiKeyInfo[]> {
  const context = createContext();
  const { payload } = await context.client.request({ act: "apikey", vpsId: null });
  return parse.mapApiKeys(payload);
}

export async function createApiKey(): Promise<ActionSuccess> {
  const context = createContext();
  const { payload } = await context.client.request({ act: "apikey", vpsId: null, query: { do: "add" } });
  return actionResult(payload, "API key created.");
}

export async function deleteApiKey(keyId: string): Promise<ActionSuccess> {
  const context = createContext();
  const { payload } = await context.client.request({
    act: "apikey",
    vpsId: null,
    method: "POST",
    body: { del: keyId },
  });
  return actionResult(payload, "API key deleted.");
}

export async function getTasks(vpsId?: string): Promise<TaskInfo[]> {
  const context = createContext(vpsId);
  const { payload } = await context.client.request({ act: "ctasks", ...scoped(context) });
  return parse.mapTasks(payload);
}
