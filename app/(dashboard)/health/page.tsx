"use client";

import { Activity, CheckCircle2, CircleSlash, Cpu, Database, HeartPulse, MemoryStick, RefreshCw, XCircle } from "lucide-react";
import type { ReactElement } from "react";

import { VpsGate } from "@/components/dashboard/vps-gate";
import { ScopePanel } from "@/components/platform/scope-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CapabilityNotice } from "@/components/ui/capability-notice";
import { KeyValueSection, ValueOrUnavailable } from "@/components/ui/key-value";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCapabilities, useHealth, useStats } from "@/hooks/use-virtualizor";
import { isApiError } from "@/lib/api-client";
import { formatMb, formatPercent } from "@/lib/utils";
import type { HealthCheckResult } from "@/lib/virtualizor/types";

const CHECK_ICON: Record<HealthCheckResult["status"], ReactElement> = {
  pass: <CheckCircle2 className="h-4 w-4 text-success" />,
  fail: <XCircle className="h-4 w-4 text-danger" />,
  skip: <CircleSlash className="h-4 w-4 text-content-disabled" />,
};

function toneFor(percent: number | undefined): "success" | "warning" | "danger" {
  if (percent === undefined) return "success";
  if (percent >= 90) return "danger";
  if (percent >= 70) return "warning";
  return "success";
}

function ChecksTab() {
  const health = useHealth();
  return (
    <Panel>
      <PanelHeader
        title="Connectivity & capabilities"
        description="Live checks against the Virtualizor endpoint"
        icon={<Activity className="h-4 w-4" />}
        action={
          <Button variant="secondary" size="sm" onClick={() => health.refetch()} disabled={health.isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${health.isFetching ? "animate-spin" : ""}`} />
            Re-run
          </Button>
        }
      />
      <PanelBody>
        {health.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : health.isError ? (
          <ErrorState
            title="Health report unavailable"
            description={isApiError(health.error) ? health.error.message : undefined}
            onRetry={() => health.refetch()}
          />
        ) : (
          <ul className="divide-y divide-border">
            {(health.data?.checks ?? []).map((check) => (
              <li key={check.id} className="flex items-start justify-between gap-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5">{CHECK_ICON[check.status]}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-content">{check.label}</p>
                    {check.detail ? <p className="mt-0.5 text-xs text-content-subtle">{check.detail}</p> : null}
                  </div>
                </div>
                <Badge tone={check.status === "pass" ? "success" : check.status === "fail" ? "danger" : "neutral"}>
                  {check.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}

function ResourcesTab({ vpsId }: { vpsId: string }) {
  const stats = useStats(vpsId);
  const cpu = stats.data?.cpu?.percent;
  const ram = stats.data?.ram?.percent;
  const disk = stats.data?.disk?.percent;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="CPU health"
          value={cpu === undefined ? "Unavailable" : cpu.toFixed(1)}
          unit={cpu === undefined ? undefined : "%"}
          percent={cpu}
          tone={toneFor(cpu)}
          icon={<Cpu className="h-4 w-4" />}
        />
        <MetricCard
          label="Memory health"
          value={ram === undefined ? "Unavailable" : ram.toFixed(1)}
          unit={ram === undefined ? undefined : "%"}
          percent={ram}
          tone={toneFor(ram)}
          icon={<MemoryStick className="h-4 w-4" />}
        />
        <MetricCard
          label="Disk health"
          value={disk === undefined ? "Unavailable" : disk.toFixed(1)}
          unit={disk === undefined ? undefined : "%"}
          percent={disk}
          tone={toneFor(disk)}
          icon={<Database className="h-4 w-4" />}
        />
      </div>
      <Panel>
        <PanelHeader title="Resource detail" icon={<HeartPulse className="h-4 w-4" />} />
        <PanelBody>
          {stats.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <KeyValueSection title="Measured" columns={2}>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-content-subtle">Memory used</span>
                <ValueOrUnavailable value={stats.data?.ram?.used !== undefined ? formatMb(stats.data.ram.used, 0) : undefined} />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-content-subtle">Memory usage</span>
                <ValueOrUnavailable value={ram !== undefined ? formatPercent(ram) : undefined} />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-content-subtle">Inode usage</span>
                <ValueOrUnavailable
                  value={
                    stats.data?.disk?.inodes?.percent !== undefined
                      ? formatPercent(stats.data.disk.inodes.percent)
                      : stats.data?.disk?.inodes?.used !== undefined
                        ? String(stats.data.disk.inodes.used)
                        : undefined
                  }
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-content-subtle">Bandwidth usage</span>
                <ValueOrUnavailable
                  value={stats.data?.bandwidth?.percent !== undefined ? formatPercent(stats.data.bandwidth.percent) : undefined}
                />
              </div>
            </KeyValueSection>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}

function DiagnosticsTab() {
  const capabilities = useCapabilities();
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <CapabilityNotice report={capabilities.data} act="statuslogs" feature="Boot & service diagnostics" />
      <ScopePanel
        title="Available diagnostics"
        items={[
          "Connection latency and reachability (System health)",
          "Capability probes for every read-only endpoint",
          "Resource health derived from live statistics",
        ]}
        links={[{ href: "/system", label: "Run connection checks" }, { href: "/support", label: "Generate diagnostic report" }]}
        note="Guest-level diagnostics such as CPU burn-in, filesystem checks and memory tests are not exposed by the Enduser API and are intentionally not simulated."
      />
    </div>
  );
}

function HealthBody({ vpsId }: { vpsId: string }) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insight"
        title="System health"
        description="Aggregated health checks across connectivity, resources and capabilities."
      />
      <Tabs defaultValue="checks">
        <TabsList>
          <TabsTrigger value="checks">Checks</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>
        <TabsContent value="checks"><ChecksTab /></TabsContent>
        <TabsContent value="resources"><ResourcesTab vpsId={vpsId} /></TabsContent>
        <TabsContent value="diagnostics"><DiagnosticsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

export default function HealthPage() {
  return <VpsGate>{(vpsId) => <HealthBody vpsId={vpsId} />}</VpsGate>;
}
