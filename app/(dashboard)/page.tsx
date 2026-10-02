"use client";

import { ArrowUpRight, HeartPulse, Network, Settings2, ShieldCheck, Terminal } from "lucide-react";
import Link from "next/link";

import { ExtendedStats } from "@/components/dashboard/extended-stats";
import { MonitorPanel } from "@/components/dashboard/monitor-panel";
import { PowerControls } from "@/components/dashboard/power-controls";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StatGrid } from "@/components/dashboard/stat-grid";
import { SystemSummary } from "@/components/dashboard/system-summary";
import { VpsGate } from "@/components/dashboard/vps-gate";
import { VpsIdentity } from "@/components/dashboard/vps-identity";
import { WidgetBoard } from "@/components/dashboard/widget-board";
import { ActivityFeed } from "@/components/platform/activity-feed";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useHealth, useVpsInfo } from "@/hooks/use-virtualizor";

const JUMP_LINKS = [
  { href: "/vps", title: "VPS control", description: "Compute, hardware and OS", icon: Terminal },
  { href: "/network", title: "Network & firewall", description: "Addresses, DNS and rules", icon: Network },
  { href: "/health", title: "System health", description: "Checks and diagnostics", icon: HeartPulse },
  { href: "/settings", title: "Settings", description: "Console, security and units", icon: Settings2 },
];

function HealthWidget() {
  const health = useHealth();
  return (
    <Panel>
      <PanelHeader
        title="System health"
        description="Connectivity and capability checks"
        icon={<ShieldCheck className="h-4 w-4" />}
        action={
          <Link href="/health" className="text-2xs font-medium text-primary hover:underline">
            Open
          </Link>
        }
      />
      <PanelBody className="space-y-3">
        {health.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : health.isError ? (
          <p className="text-sm text-content-subtle">Health report unavailable.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={health.data?.ok ? "success" : "danger"}>
              {health.data?.ok ? "All checks passing" : "Attention required"}
            </Badge>
            <span className="text-xs text-content-subtle">
              {health.data?.checks.filter((check) => check.status === "pass").length ?? 0} of{" "}
              {health.data?.checks.length ?? 0} checks passing
            </span>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}

function JumpWidget() {
  return (
    <Panel>
      <PanelHeader title="Jump to" description="Common destinations" />
      <PanelBody className="grid gap-2">
        {JUMP_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-3 rounded-card border border-border bg-surface-muted/40 px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-muted"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-control border border-border bg-surface text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-content">{link.title}</span>
                <span className="block truncate text-xs text-content-subtle">{link.description}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-content-disabled transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-content" />
            </Link>
          );
        })}
      </PanelBody>
    </Panel>
  );
}

function OverviewBody({ vpsId }: { vpsId: string }) {
  const { data: vps, isLoading } = useVpsInfo(vpsId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Server dashboard"
        description="Live status, resource telemetry and quick access to every operation."
      />

      <Panel className="orbit-aurora">
        <PanelBody className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-7 w-52" />
                <Skeleton className="h-4 w-72" />
              </div>
            ) : (
              <VpsIdentity vps={vps} />
            )}
          </div>
          <div className="shrink-0">
            <PowerControls vpsId={vpsId} status={vps?.status ?? "unknown"} />
          </div>
        </PanelBody>
      </Panel>

      <StatGrid vpsId={vpsId} />

      <WidgetBoard
        widgets={[
          { id: "monitor", label: "Live monitoring", node: <MonitorPanel vpsId={vpsId} />, defaultWide: true },
          { id: "system", label: "System & infrastructure", node: <SystemSummary vps={vps} vpsId={vpsId} /> },
          { id: "metrics", label: "Secondary metrics", node: <ExtendedStats vpsId={vpsId} /> },
          { id: "quick", label: "Quick actions", node: <QuickActions /> },
          { id: "activity", label: "Recent activity", node: <ActivityFeed vpsId={vpsId} embedded={false} /> },
          { id: "health", label: "System health", node: <HealthWidget /> },
          { id: "jump", label: "Jump to", node: <JumpWidget /> },
        ]}
      />
    </div>
  );
}

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <VpsGate>{(vpsId) => <OverviewBody vpsId={vpsId} />}</VpsGate>
    </div>
  );
}
