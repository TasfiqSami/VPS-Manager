"use client";

import { Boxes, Cpu, Globe, HardDrive, Server, Waves } from "lucide-react";

import { ScopePanel } from "@/components/platform/scope-panel";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { KeyValue, KeyValueSection, ValueOrUnavailable } from "@/components/ui/key-value";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveVps } from "@/hooks/use-active-vps";
import { useCapabilities, useStats, useVpsInfo, useVpsList } from "@/hooks/use-virtualizor";
import { capabilityLabel } from "@/lib/capability-catalog";
import { formatMb, formatRelativeTime } from "@/lib/utils";
import type { VpsListItem, VpsStatus } from "@/lib/virtualizor/types";

function statusTone(status: VpsStatus): "success" | "danger" | "warning" | "neutral" {
  if (status === "running") return "success";
  if (status === "suspended") return "danger";
  if (status === "stopped") return "warning";
  return "neutral";
}

function FleetOverview() {
  const list = useVpsList();
  const items = list.data ?? [];
  const running = items.filter((item) => item.status === "running").length;
  const stopped = items.filter((item) => item.status === "stopped").length;
  const suspended = items.filter((item) => item.status === "suspended").length;

  const columns: DataTableColumn<VpsListItem>[] = [
    {
      key: "name",
      header: "Server",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Server className="h-4 w-4 text-content-subtle" />
          <div className="min-w-0">
            <p className="truncate font-medium text-content">{row.name}</p>
            <p className="truncate text-2xs text-content-subtle">{row.hostname ?? "no hostname"}</p>
          </div>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    { key: "ip", header: "Primary IP", render: (row) => <span className="tabular text-xs">{row.primaryIp ?? "Unavailable"}</span>, sortValue: (row) => row.primaryIp ?? "" },
    { key: "os", header: "OS", render: (row) => <span className="text-xs text-content-muted">{row.os ?? "Unavailable"}</span>, sortValue: (row) => row.os ?? "" },
    { key: "status", header: "State", render: (row) => <Badge tone={statusTone(row.status)}>{row.statusLabel}</Badge>, sortValue: (row) => row.status },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Servers" value={items.length} icon={<Boxes className="h-4 w-4" />} tone="primary" />
        <MetricCard label="Running" value={running} icon={<Waves className="h-4 w-4" />} tone="success" />
        <MetricCard label="Stopped" value={stopped} icon={<Server className="h-4 w-4" />} tone="warning" />
        <MetricCard label="Suspended" value={suspended} icon={<Server className="h-4 w-4" />} tone="danger" />
      </div>
      <DataTable
        data={items}
        columns={columns}
        getRowId={(row) => row.id}
        loading={list.isLoading}
        error={list.isError ? list.error : undefined}
        errorTitle="Fleet inventory unavailable"
        onRetry={() => list.refetch()}
        searchPlaceholder="Search servers…"
        emptyTitle="No servers on the account"
        emptyDescription="Servers returned by the Virtualizor API appear here."
      />
    </div>
  );
}

function CapacityPanel() {
  const { vpsId } = useActiveVps();
  const info = useVpsInfo(vpsId);
  const stats = useStats(vpsId);

  if (!vpsId) {
    return <ScopePanel title="Capacity" items={["Select a server to inspect its allocated capacity"]} />;
  }

  const cpuPercent = stats.data?.cpu?.percent;
  const ramPercent = stats.data?.ram?.percent;
  const diskPercent = stats.data?.disk?.percent;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="CPU usage"
          value={cpuPercent !== undefined ? cpuPercent.toFixed(1) : "Unavailable"}
          unit={cpuPercent !== undefined ? "%" : undefined}
          icon={<Cpu className="h-4 w-4" />}
          percent={cpuPercent}
          tone={cpuPercent !== undefined && cpuPercent > 85 ? "danger" : "primary"}
          footer={info.data?.cpuCores !== undefined ? `${info.data.cpuCores} cores allocated` : undefined}
        />
        <MetricCard
          label="Memory"
          value={info.data?.ramMb !== undefined ? info.data.ramMb : "Unavailable"}
          unit={info.data?.ramMb !== undefined ? "MB" : undefined}
          icon={<HardDrive className="h-4 w-4" />}
          percent={ramPercent}
          tone={ramPercent !== undefined && ramPercent > 85 ? "danger" : "info"}
          footer={info.data?.burstMb !== undefined ? `Burst ${info.data.burstMb} MB` : undefined}
        />
        <MetricCard
          label="Disk"
          value={info.data?.diskGb !== undefined ? info.data.diskGb : "Unavailable"}
          unit={info.data?.diskGb !== undefined ? "GB" : undefined}
          icon={<HardDrive className="h-4 w-4" />}
          percent={diskPercent}
          tone={diskPercent !== undefined && diskPercent > 85 ? "warning" : "success"}
        />
      </div>

      <KeyValueSection title="Allocation" description="Live values from the Virtualizor API">
        <KeyValue label="Virtualization"><ValueOrUnavailable value={info.data?.virtualization} /></KeyValue>
        <KeyValue label="Location"><ValueOrUnavailable value={info.data?.location} /></KeyValue>
        <KeyValue label="Bandwidth"><ValueOrUnavailable value={info.data?.bandwidthGb !== undefined ? `${info.data.bandwidthGb} GB` : undefined} /></KeyValue>
        <KeyValue label="Network speed"><ValueOrUnavailable value={info.data?.networkSpeedMbps !== undefined ? `${info.data.networkSpeedMbps} Mbps` : undefined} /></KeyValue>
        <KeyValue label="Swap"><ValueOrUnavailable value={info.data?.swapMb !== undefined ? formatMb(info.data.swapMb, 0) : undefined} /></KeyValue>
        <KeyValue label="I/O priority"><ValueOrUnavailable value={info.data?.io} /></KeyValue>
        <KeyValue label="Created"><ValueOrUnavailable value={info.data?.createdAt ? formatRelativeTime(new Date(info.data.createdAt)) : undefined} /></KeyValue>
        <KeyValue label="Rescue mode"><ValueOrUnavailable value={info.data ? (info.data.rescue ? "Enabled" : "Disabled") : undefined} /></KeyValue>
      </KeyValueSection>

      <PartialMetricFailures errors={stats.data?.errors} />
    </div>
  );
}

function PartialMetricFailures({ errors }: { errors: Record<string, string> | undefined }) {
  if (!errors) return null;
  const entries = Object.entries(errors);
  if (entries.length === 0) return null;
  return (
    <Panel>
      <PanelHeader title="Partial metric failures" description="Some metric groups could not be read" />
      <PanelBody className="space-y-1">
        {entries.map(([key, message]) => (
          <p key={key} className="text-xs text-content-subtle">
            <span className="font-medium text-content-muted">{key}:</span> {message}
          </p>
        ))}
      </PanelBody>
    </Panel>
  );
}

export default function InfrastructurePage() {
  const capabilities = useCapabilities();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Infrastructure"
        description="Account-wide fleet inventory and per-server capacity, sourced directly from the Virtualizor API."
        actions={<Badge tone="neutral"><Globe className="h-3 w-3" /> account scope</Badge>}
      />
      <Tabs defaultValue="fleet">
        <TabsList className="flex-wrap">
          <TabsTrigger value="fleet">Fleet</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="nodes">Nodes &amp; providers</TabsTrigger>
          <TabsTrigger value="capabilities">Endpoint detection</TabsTrigger>
        </TabsList>
        <TabsContent value="fleet"><FleetOverview /></TabsContent>
        <TabsContent value="capacity"><CapacityPanel /></TabsContent>
        <TabsContent value="nodes">
          <ScopePanel
            title="Nodes & providers"
            items={[
              "Physical node and datacenter placement",
              "Provider maintenance windows and migrations",
              "Storage pool topology and replication",
              "Network fabric and upstream routing",
            ]}
            note={
              capabilities.data
                ? "The Virtualizor Enduser API exposes the servers you own, not the underlying node topology. Node-level data must be read from the provider panel."
                : "Connectivity to Virtualizor has not been verified yet."
            }
            links={[{ href: "/health", label: "Connectivity health" }, { href: "/network", label: "Network" }]}
          />
        </TabsContent>
        <TabsContent value="capabilities">
          <Panel>
            <PanelHeader title="Detected endpoints" description="Read-only probes against your panel" />
            <PanelBody className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
              {capabilities.data ? (
                Object.entries(capabilities.data.supported).map(([act, supported]) => (
                  <div key={act} className="flex items-center justify-between gap-4 py-1.5">
                    <span className="truncate text-xs text-content-muted" title={act}>{capabilityLabel(act)}</span>
                    <Badge tone={supported ? "success" : "neutral"}>{supported ? "supported" : "unsupported"}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-content-subtle">Capability report unavailable.</p>
              )}
            </PanelBody>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
