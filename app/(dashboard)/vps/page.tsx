"use client";

import {
  Boxes,
  Cpu,
  HardDrive,
  Info,
  KeyRound,
  Network,
  Power,
  RefreshCw,
  Rocket,
  Settings2,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PowerControls } from "@/components/dashboard/power-controls";
import { VpsGate } from "@/components/dashboard/vps-gate";
import { RootPasswordPanel } from "@/components/vps/root-password-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CapabilityNotice, capabilityState } from "@/components/ui/capability-notice";
import { CopyButton } from "@/components/ui/copy-button";
import { KeyValueSection, ValueOrUnavailable } from "@/components/ui/key-value";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { StatusPill } from "@/components/ui/status-pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCapabilities, useStats, useVpsInfo, useVpsIps } from "@/hooks/use-virtualizor";
import { formatGb, formatMb, formatPercent } from "@/lib/utils";
import { rawString } from "@/lib/virtualizor/raw";
import type { VpsInfo } from "@/lib/virtualizor/types";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-xs text-content-subtle">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-medium text-content">
        <ValueOrUnavailable value={value} />
      </span>
    </div>
  );
}

function UnsupportedPowers({ acts }: { acts: { act: string; label: string }[] }) {
  const { data } = useCapabilities();
  return (
    <div className="space-y-3">
      <p className="text-xs text-content-subtle">
        The following power operations require Virtualizor API actions that this panel does not expose. They are
        listed for completeness and left disabled rather than faked.
      </p>
      <div className="flex flex-wrap gap-2">
        {acts.map((entry) => {
          const state = capabilityState(data, entry.act);
          return (
            <span key={entry.act} className="inline-flex items-center gap-2 rounded-control border border-border px-3 py-1.5 text-xs text-content-muted">
              {entry.label}
              <Badge tone={state === "supported" ? "success" : state === "unsupported" ? "neutral" : "warning"}>
                {state === "supported" ? "Supported" : state === "unsupported" ? "Not exposed" : "Unknown"}
              </Badge>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function OverviewTab({ vps }: { vps: VpsInfo | undefined }) {
  if (!vps) return <Skeleton className="h-64 w-full rounded-card" />;
  const raw = vps.raw;
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel>
        <PanelHeader title="Identity" icon={<Info className="h-4 w-4" />} />
        <PanelBody>
          <KeyValueSection title="Server" columns={1}>
            <Field label="Name" value={vps.name} />
            <Field
              label="VPS ID"
              value={
                <span className="inline-flex items-center gap-2">
                  <span className="tabular">{vps.id}</span>
                  <CopyButton value={vps.id} label="ID" />
                </span>
              }
            />
            <Field label="Status" value={<StatusPill tone={vps.status === "unknown" ? "unknown" : vps.status} label={vps.statusLabel} />} />
            <Field label="Hostname" value={vps.hostname} />
            <Field label="Created" value={vps.createdAt ? vps.createdAt : undefined} />
            <Field label="Uptime" value={rawString(raw, ["uptime", "uptime_text"])} />
          </KeyValueSection>
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader title="Placement & type" icon={<Boxes className="h-4 w-4" />} />
        <PanelBody>
          <KeyValueSection title="Host" columns={1}>
            <Field label="Host / node" value={rawString(raw, ["server", "node", "servername", "hostname_node"])} />
            <Field label="Region" value={rawString(raw, ["region", "country"])} />
            <Field label="Datacenter" value={vps.location ?? rawString(raw, ["datacenter", "dc", "location"])} />
            <Field label="Virtualization" value={vps.virtualization} />
            <Field label="Last reboot" value={rawString(raw, ["last_reboot", "reboot_time"])} />
            <Field label="Snapshots" value={undefined} />
          </KeyValueSection>
        </PanelBody>
      </Panel>
    </div>
  );
}

function PowerTab({ vpsId, vps }: { vpsId: string; vps: VpsInfo | undefined }) {
  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          title="Power control"
          description="Send power commands to the instance"
          icon={<Power className="h-4 w-4" />}
          action={<StatusPill tone={vps?.status === "unknown" || !vps ? "unknown" : vps.status} label={vps?.statusLabel ?? "Unknown"} />}
        />
        <PanelBody className="space-y-5">
          <PowerControls vpsId={vpsId} status={vps?.status ?? "unknown"} />
          <UnsupportedPowers
            acts={[
              { act: "pause", label: "Pause" },
              { act: "resume", label: "Resume" },
              { act: "reset", label: "Reset" },
            ]}
          />
        </PanelBody>
      </Panel>
    </div>
  );
}

function ComputeTab({ vpsId }: { vpsId: string }) {
  const stats = useStats(vpsId);
  if (stats.isLoading) return <Skeleton className="h-56 w-full rounded-card" />;
  const cpu = stats.data?.cpu;
  const ram = stats.data?.ram;
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel>
        <PanelHeader title="CPU" icon={<Cpu className="h-4 w-4" />} />
        <PanelBody>
          <KeyValueSection title="Processor" columns={1}>
            <Field label="vCPU cores" value={cpu?.limit !== undefined ? String(cpu.limit) : undefined} />
            <Field label="Usage" value={cpu?.percent !== undefined ? formatPercent(cpu.percent) : undefined} />
            <Field label="Manufacturer" value={cpu?.manufacturer} />
            <Field label="CPU model" value={undefined} />
            <Field label="CPU flags" value={undefined} />
            <Field label="CPU pinning" value={undefined} />
            <Field label="NUMA" value={undefined} />
          </KeyValueSection>
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader title="Memory" icon={<Cpu className="h-4 w-4" />} />
        <PanelBody>
          <KeyValueSection title="Allocation" columns={1}>
            <Field label="RAM limit" value={ram?.limit !== undefined ? formatMb(ram.limit, 0) : undefined} />
            <Field label="Guaranteed" value={ram?.guaranteed !== undefined ? formatMb(ram.guaranteed, 0) : undefined} />
            <Field label="Used" value={ram?.used !== undefined ? formatMb(ram.used, 0) : undefined} />
            <Field label="Swap" value={ram?.swap !== undefined ? formatMb(ram.swap, 0) : undefined} />
            <Field label="Usage" value={ram?.percent !== undefined ? formatPercent(ram.percent) : undefined} />
            <Field label="Ballooning" value={undefined} />
          </KeyValueSection>
        </PanelBody>
      </Panel>
    </div>
  );
}

function HardwareTab({ vpsId, vps }: { vpsId: string; vps: VpsInfo | undefined }) {
  const ips = useVpsIps(vpsId);
  const stats = useStats(vpsId);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel>
        <PanelHeader title="Virtual disks" icon={<HardDrive className="h-4 w-4" />} />
        <PanelBody className="space-y-2">
          {stats.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : stats.data?.disk?.limit !== undefined ? (
            <div className="flex items-center justify-between rounded-card border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-content">Primary disk</p>
                <p className="text-2xs text-content-subtle">
                  {stats.data.disk.unit === "gb" ? formatGb(stats.data.disk.limit, 1) : formatMb(stats.data.disk.limit, 0)} provisioned
                </p>
              </div>
              <Badge tone="neutral">VirtIO</Badge>
            </div>
          ) : (
            <EmptyState title="Disk details unavailable" description="The panel did not report disk geometry." />
          )}
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader title="Network adapters" icon={<Network className="h-4 w-4" />} />
        <PanelBody>
          {ips.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : ips.data && ips.data.length > 0 ? (
            <ul className="divide-y divide-border">
              {ips.data.map((entry) => (
                <li key={entry.ip} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-mono text-xs text-content">{entry.ip}</span>
                  <div className="flex items-center gap-2">
                    {entry.primary ? <Badge tone="info">Primary</Badge> : null}
                    <Badge tone="neutral">IPv{entry.version}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-content-subtle">No adapters reported. MAC addresses and link state are not exposed by the API.</p>
          )}
        </PanelBody>
      </Panel>
      <Panel className="xl:col-span-2">
        <PanelHeader title="Virtual hardware & firmware" />
        <PanelBody>
          <KeyValueSection title="Firmware" columns={2}>
            <Field label="BIOS / UEFI" value={undefined} />
            <Field label="Machine type" value={undefined} />
            <Field label="TPM" value={undefined} />
            <Field label="Secure Boot" value={undefined} />
            <Field label="Hypervisor" value={vps?.virtualization} />
            <Field label="MAC address" value={undefined} />
          </KeyValueSection>
        </PanelBody>
      </Panel>
    </div>
  );
}

function OsTab({ vpsId, vps }: { vpsId: string; vps: VpsInfo | undefined }) {
  const raw = vps?.raw;
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel>
        <PanelHeader title="Operating system" icon={<Rocket className="h-4 w-4" />} />
        <PanelBody>
          <KeyValueSection title="Guest" columns={1}>
            <Field label="OS" value={vps?.os} />
            <Field label="Version" value={rawString(raw, ["os_version", "version"])} />
            <Field label="Kernel" value={rawString(raw, ["kernel", "kernel_version"])} />
            <Field label="Architecture" value={rawString(raw, ["arch", "architecture"])} />
            <Field label="Guest agent" value={undefined} />
            <Field label="Update status" value={undefined} />
          </KeyValueSection>
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader title="Reinstall" description="Reinstall the guest from a template" icon={<Settings2 className="h-4 w-4" />} />
        <PanelBody className="space-y-4">
          <p className="text-sm text-content-muted">
            Reinstallation is destructive. The reinstall workflow with template selection, cloud-init and disk options
            lives in Settings.
          </p>
          <Button asChild variant="secondary">
            <Link href="/settings">
              <RefreshCw className="h-3.5 w-3.5" />
              Open reinstall workflow
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/console`}>
              <Terminal className="h-3.5 w-3.5" />
              Open console
            </Link>
          </Button>
        </PanelBody>
      </Panel>
    </div>
  );
}

function AccessTab({ vpsId }: { vpsId: string }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <RootPasswordPanel vpsId={vpsId} />
      <Panel>
        <PanelHeader title="Hostname & keys" description="Related access settings" icon={<KeyRound className="h-4 w-4" />} />
        <PanelBody className="space-y-3 text-sm text-content-muted">
          <p>Hostname, VNC console credentials, rescue mode and SSH keys are managed in the Settings workspace.</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary"><Link href="/settings">Hostname &amp; keys</Link></Button>
            <Button asChild variant="ghost"><Link href="/console">Console</Link></Button>
            <Button asChild variant="ghost"><Link href="/security">Security</Link></Button>
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}

function VpsBody({ vpsId }: { vpsId: string }) {
  const { data: vps } = useVpsInfo(vpsId);
  const capabilities = useCapabilities();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operate"
        title={vps?.name ?? "Virtual server"}
        description="Complete control and detail for this instance: power, compute, hardware, boot and recovery."
        actions={vps ? <StatusPill tone={vps.status === "unknown" ? "unknown" : vps.status} label={vps.statusLabel} /> : null}
      />
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="power">Power</TabsTrigger>
          <TabsTrigger value="compute">Compute</TabsTrigger>
          <TabsTrigger value="hardware">Hardware</TabsTrigger>
          <TabsTrigger value="os">OS</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="boot">Boot</TabsTrigger>
          <TabsTrigger value="clone">Clone</TabsTrigger>
          <TabsTrigger value="migration">Migration</TabsTrigger>
          <TabsTrigger value="rescue">Rescue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab vps={vps} /></TabsContent>
        <TabsContent value="power"><PowerTab vpsId={vpsId} vps={vps} /></TabsContent>
        <TabsContent value="compute"><ComputeTab vpsId={vpsId} /></TabsContent>
        <TabsContent value="hardware"><HardwareTab vpsId={vpsId} vps={vps} /></TabsContent>
        <TabsContent value="os"><OsTab vpsId={vpsId} vps={vps} /></TabsContent>
        <TabsContent value="access"><AccessTab vpsId={vpsId} /></TabsContent>
        <TabsContent value="boot">
          <CapabilityNotice report={capabilities.data} act="boot" feature="Boot configuration" />
        </TabsContent>
        <TabsContent value="clone">
          <CapabilityNotice report={capabilities.data} act="clone" feature="VPS cloning" />
        </TabsContent>
        <TabsContent value="migration">
          <CapabilityNotice report={capabilities.data} act="migrate" feature="Live migration" />
        </TabsContent>
        <TabsContent value="rescue">
          <Panel>
            <PanelHeader title="Rescue mode" icon={<ShieldCheck className="h-4 w-4" />} />
            <PanelBody className="space-y-3 text-sm text-content-muted">
              <p>Enable a recovery environment, then connect through the console. Rescue controls are in Settings.</p>
              <Button asChild variant="secondary"><Link href="/settings">Open rescue controls</Link></Button>
            </PanelBody>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function VpsPage() {
  return <VpsGate>{(vpsId) => <VpsBody vpsId={vpsId} />}</VpsGate>;
}
