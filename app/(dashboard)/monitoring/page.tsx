"use client";

import { BarChart3, Gauge } from "lucide-react";

import { MonitorPanel } from "@/components/dashboard/monitor-panel";
import { StatGrid } from "@/components/dashboard/stat-grid";
import { VpsGate } from "@/components/dashboard/vps-gate";
import { BarSeries } from "@/components/ui/charts";
import { KeyValue, KeyValueGrid } from "@/components/ui/key-value";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Unavailable } from "@/components/ui/states";
import { useStats } from "@/hooks/use-virtualizor";
import { formatGb, formatMb, formatPercent } from "@/lib/utils";

function MonitoringBody({ vpsId }: { vpsId: string }) {
  const { data, isLoading } = useStats(vpsId);

  const bandwidthPoints =
    data?.bandwidth?.monthlyUsage.map((point) => ({ label: point.date, value: point.value })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insight"
        title="Monitoring"
        description="Resource utilisation sampled from the Virtualizor statistics endpoints. Values are shown exactly as reported; missing metrics are marked unavailable."
      />

      <StatGrid vpsId={vpsId} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <MonitorPanel vpsId={vpsId} />

        <Panel>
          <PanelHeader
            title="Hardware profile"
            description="Provisioned limits reported by the panel"
            icon={<Gauge className="h-4 w-4" />}
          />
          <PanelBody>
            {isLoading || !data ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full" />
                ))}
              </div>
            ) : (
              <KeyValueGrid className="grid-cols-1">
                <KeyValue label="CPU">
                  {data.cpu?.limit !== undefined ? `${data.cpu.limit} cores` : <Unavailable />}
                </KeyValue>
                <KeyValue label="CPU manufacturer">
                  {data.cpu?.manufacturer ?? <Unavailable />}
                </KeyValue>
                <KeyValue label="Memory limit">
                  {data.ram?.limit !== undefined ? formatMb(data.ram.limit, 0) : <Unavailable />}
                </KeyValue>
                <KeyValue label="Guaranteed memory">
                  {data.ram?.guaranteed !== undefined ? formatMb(data.ram.guaranteed, 0) : <Unavailable />}
                </KeyValue>
                <KeyValue label="Swap">
                  {data.ram?.swap !== undefined ? formatMb(data.ram.swap, 0) : <Unavailable />}
                </KeyValue>
                <KeyValue label="Disk limit">
                  {data.disk?.limit !== undefined
                    ? data.disk.unit === "gb"
                      ? formatGb(data.disk.limit, 1)
                      : formatMb(data.disk.limit, 0)
                    : <Unavailable />}
                </KeyValue>
                <KeyValue label="Disk used">
                  {data.disk?.used !== undefined
                    ? data.disk.unit === "gb"
                      ? formatGb(data.disk.used, 1)
                      : formatMb(data.disk.used, 0)
                    : <Unavailable />}
                </KeyValue>
                <KeyValue label="Inode usage">
                  {data.disk?.inodes?.percent !== undefined ? (
                    formatPercent(data.disk.inodes.percent)
                  ) : data.disk?.inodes?.used !== undefined ? (
                    String(data.disk.inodes.used)
                  ) : (
                    <Unavailable />
                  )}
                </KeyValue>
              </KeyValueGrid>
            )}
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Bandwidth"
          description={
            data?.bandwidth?.month?.label
              ? `${data.bandwidth.month.label} usage`
              : "Monthly transfer reported by the panel"
          }
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <PanelBody className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-card border border-border bg-surface-muted/40 px-4 py-3">
              <p className="text-2xs uppercase tracking-wide text-content-subtle">Used</p>
              <p className="tabular mt-1 text-lg font-semibold text-content">
                {data?.bandwidth?.usedGb !== undefined ? formatGb(data.bandwidth.usedGb, 1) : "Unavailable"}
              </p>
            </div>
            <div className="rounded-card border border-border bg-surface-muted/40 px-4 py-3">
              <p className="text-2xs uppercase tracking-wide text-content-subtle">Limit</p>
              <p className="tabular mt-1 text-lg font-semibold text-content">
                {data?.bandwidth?.limitGb !== undefined ? formatGb(data.bandwidth.limitGb, 1) : "Unavailable"}
              </p>
            </div>
            <div className="rounded-card border border-border bg-surface-muted/40 px-4 py-3">
              <p className="text-2xs uppercase tracking-wide text-content-subtle">Inbound / Outbound</p>
              <p className="tabular mt-1 text-lg font-semibold text-content">
                {data?.bandwidth?.inbound?.total !== undefined || data?.bandwidth?.outbound?.total !== undefined
                  ? `${data?.bandwidth?.inbound?.total ?? 0} / ${data?.bandwidth?.outbound?.total ?? 0}`
                  : "Unavailable"}
              </p>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : bandwidthPoints.length >= 2 ? (
            <div>
              <BarSeries points={bandwidthPoints} height={96} />
              <div className="mt-2 flex justify-between text-2xs text-content-disabled">
                <span>{bandwidthPoints[0]?.label}</span>
                <span>{bandwidthPoints[bandwidthPoints.length - 1]?.label}</span>
              </div>
            </div>
          ) : (
            <p className="rounded-card border border-border bg-surface-muted/40 px-3 py-4 text-xs text-content-subtle">
              Per-day bandwidth samples are not exposed by this panel.
            </p>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}

export default function MonitoringPage() {
  return <VpsGate>{(vpsId) => <MonitoringBody vpsId={vpsId} />}</VpsGate>;
}
