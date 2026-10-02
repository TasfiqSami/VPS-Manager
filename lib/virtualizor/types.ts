/**
 * Domain model for Vantage.
 *
 * These types describe what the UI consumes. They are intentionally explicit
 * about optionality: any field Virtualizor may omit is optional, and the UI is
 * expected to render `Unavailable` rather than invent a value.
 */

export type VpsStatus = "running" | "stopped" | "suspended" | "unknown";

export interface VpsInfo {
  id: string;
  name: string;
  hostname?: string;
  status: VpsStatus;
  statusLabel: string;
  os?: string;
  virtualization?: string;
  location?: string;
  ips: string[];
  ipv6: string[];
  cpuCores?: number;
  cpuLimit?: number;
  ramMb?: number;
  burstMb?: number;
  swapMb?: number;
  diskGb?: number;
  bandwidthGb?: number;
  networkSpeedMbps?: number;
  io?: number;
  suspended: boolean;
  rescue: boolean;
  vncEnabled?: boolean;
  createdAt?: string;
  raw: UnknownRecord;
}

export interface VpsListItem {
  id: string;
  name: string;
  hostname?: string;
  status: VpsStatus;
  statusLabel: string;
  primaryIp?: string;
  os?: string;
}

export interface ResourceUsage {
  used?: number;
  limit?: number;
  free?: number;
  percent?: number;
  unit: "mb" | "gb" | "count";
}

export interface CpuStats {
  limit?: number;
  used?: number;
  free?: number;
  percent?: number;
  manufacturer?: string;
  usage: ResourceUsage;
}

export interface RamStats {
  used?: number;
  limit?: number;
  guaranteed?: number;
  swap?: number;
  free?: number;
  percent?: number;
  usage: ResourceUsage;
}

export interface InodeStats {
  used?: number;
  limit?: number;
  free?: number;
  percent?: number;
}

export interface DiskStats {
  used?: number;
  limit?: number;
  free?: number;
  percent?: number;
  unit: "mb" | "gb";
  inodes?: InodeStats;
  usage: ResourceUsage;
}

export interface BandwidthPoint {
  date: string;
  value: number;
}

export interface BandwidthStats {
  usedGb?: number;
  limitGb?: number;
  freeGb?: number;
  percent?: number;
  monthlyUsage: BandwidthPoint[];
  inbound?: { total?: number; series: BandwidthPoint[] };
  outbound?: { total?: number; series: BandwidthPoint[] };
  month?: { year?: number; month?: number; label?: string; days?: number };
  speedMbps?: number;
  usage: ResourceUsage;
}

export interface StatsBundle {
  cpu?: CpuStats;
  ram?: RamStats;
  disk?: DiskStats;
  bandwidth?: BandwidthStats;
  errors: Partial<Record<"cpu" | "ram" | "disk" | "bandwidth", string>>;
}

export interface MonitorSnapshot {
  cpuPercent?: number;
  ramMb?: number;
  ramPercent?: number;
  diskMb?: number;
  diskPercent?: number;
  netIn?: number;
  netOut?: number;
  capturedAt: string;
  source: "live" | "statuslog";
  raw: UnknownRecord;
}

export interface VncInfo {
  available: boolean;
  host?: string;
  port?: number;
  password?: string;
  novncUrl?: string;
  reason?: string;
}

export interface ServiceInfo {
  name: string;
  running: boolean;
  autostart?: boolean;
  pid?: number;
}

export interface ProcessInfo {
  pid: number;
  user?: string;
  cpuPercent?: number;
  memoryPercent?: number;
  memoryKb?: number;
  state?: string;
  time?: string;
  command: string;
}

export interface BackupInfo {
  id: string;
  name?: string;
  createdAt?: string;
  sizeMb?: number;
  status?: string;
  type?: string;
}

export interface VolumeInfo {
  id: string;
  name?: string;
  size?: number;
  sizeUnit?: string;
  format?: string;
  status?: string;
  attached?: boolean;
  mountPoint?: string;
  vpsId?: string;
}

export interface IsoInfo {
  id: string;
  name: string;
  size?: number;
  downloaded?: boolean;
  active?: boolean;
  distro?: string;
  url?: string;
}

export interface SshKeyInfo {
  id: string;
  name: string;
  value?: string;
  fingerprint?: string;
}

export interface FirewallRule {
  id?: string;
  action: "ACCEPT" | "DROP";
  protocol: string;
  port?: string;
  source?: string;
  destination?: string;
  comment?: string;
}

export interface FirewallPlan {
  id: string;
  name: string;
  defaultPolicy?: "ACCEPT" | "DROP";
  note?: string;
  rules: FirewallRule[];
}

export interface ReverseDnsRecord {
  id: string;
  ip: string;
  domain: string;
}

export type DnsRecordType = "A" | "AAAA" | "CNAME" | "MX" | "NS" | "TXT" | "SRV";

export interface DnsRecord {
  id: string;
  name: string;
  type: string;
  content: string;
  priority?: number;
  ttl?: number;
}

export interface DnsZone {
  id: string;
  domain: string;
  records: DnsRecord[];
}

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "unknown";

export interface TaskInfo {
  id: string;
  action?: string;
  status: TaskStatus;
  statusLabel: string;
  progress?: number;
  createdAt?: string;
  message?: string;
}

export interface ApiKeyInfo {
  id: string;
  name?: string;
  createdAt?: string;
  lastUsed?: string;
}

export interface IpInfo {
  ip: string;
  version: 4 | 6;
  primary: boolean;
  reverseDns?: string;
}

export interface ReinstallOption {
  osId: string;
  name: string;
  group?: string;
}

export interface HealthCheckResult {
  id: string;
  label: string;
  status: "pass" | "fail" | "skip";
  detail?: string;
  latencyMs?: number;
}

export interface HealthReport {
  configured: boolean;
  ok: boolean;
  checks: HealthCheckResult[];
  baseUrl?: string;
  vpsId?: string;
  latencyMs?: number;
  lastCheckedAt: string;
  error?: { code: string; message: string };
}

export interface CapabilityReport {
  detectedAt: string;
  supported: Record<string, boolean>;
}

export interface ActionSuccess {
  message: string;
  data?: unknown;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target?: string;
  vpsId?: string;
  success: boolean;
  code?: string;
  requestId: string;
}

export interface AuditRecordInfo {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  resource: string;
  target?: string;
  actor: string;
  ip: string;
  success: boolean;
  status: number;
  code?: string;
  durationMs: number;
  requestId: string;
}

export interface AuditResponse {
  records: AuditRecordInfo[];
  resources: string[];
  retention: "in-memory";
}

export interface ApiResult<T> {
  success: true;
  data: T;
  fetchedAt: string;
}

export type UnknownRecord = Record<string, unknown>;
