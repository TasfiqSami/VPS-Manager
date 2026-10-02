/**
 * Capability catalog.
 *
 * Central mapping between Vantage UI sections and the read-only Virtualizor
 * `act` endpoints that back them. The capability report (`/api/capabilities`)
 * only returns booleans for acts that were probed; this catalog supplies the
 * human labels and the grouping used across the dashboard.
 *
 * This module is safe to import from client components: it contains no
 * credentials and performs no I/O.
 */

export interface CapabilitySpec {
  act: string;
  label: string;
  detail?: string;
}

export interface CapabilitySection {
  id: string;
  title: string;
  description: string;
  specs: CapabilitySpec[];
}

export const CAPABILITY_SECTIONS: CapabilitySection[] = [
  {
    id: "operate",
    title: "Operate",
    description: "Power, console and lifecycle control",
    specs: [
      { act: "listvs", label: "Server inventory" },
      { act: "vnc", label: "VNC console" },
      { act: "ctasks", label: "Task history" },
      { act: "ostemplate", label: "OS reinstall templates" },
    ],
  },
  {
    id: "insight",
    title: "Insight",
    description: "Metrics, health and history",
    specs: [
      { act: "cpu", label: "CPU statistics" },
      { act: "ram", label: "Memory statistics" },
      { act: "disk", label: "Disk statistics" },
      { act: "bandwidth", label: "Bandwidth statistics" },
      { act: "monitor", label: "Live monitoring" },
      { act: "statuslogs", label: "Status logs" },
    ],
  },
  {
    id: "security",
    title: "Security",
    description: "Access control and network policy",
    specs: [
      { act: "sshkeys", label: "SSH keys" },
      { act: "firewallplan", label: "Firewall plans" },
      { act: "rdns", label: "Reverse DNS" },
      { act: "ips", label: "IP address management" },
    ],
  },
  {
    id: "storage",
    title: "Storage & automation",
    description: "Backups, volumes and API keys",
    specs: [
      { act: "backup2", label: "Backups" },
      { act: "volume", label: "Volumes" },
      { act: "euiso", label: "ISO library" },
      { act: "pdns", label: "DNS zones" },
      { act: "apikey", label: "API keys" },
    ],
  },
  {
    id: "system",
    title: "System",
    description: "Guest services and processes",
    specs: [
      { act: "services", label: "System services" },
      { act: "processes", label: "Process table" },
    ],
  },
];

export const CAPABILITY_SPECS: CapabilitySpec[] = CAPABILITY_SECTIONS.flatMap((section) => section.specs);

const SPEC_BY_ACT = new Map(CAPABILITY_SPECS.map((spec) => [spec.act, spec]));

export function capabilityLabel(act: string): string {
  return SPEC_BY_ACT.get(act)?.label ?? act;
}
