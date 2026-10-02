"use client";

import { Activity } from "lucide-react";

import { AreaSparkline, type ChartPoint } from "@/components/ui/charts";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { RadialGauge } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { useMonitor, useMonitorHistory } from "@/hooks/use-virtualizor";
import { formatMb, formatPercent, formatRelativeTime } from "@/lib/utils";
import type { MonitorSnapshot } from "@/lib/virtualizor/types";

function seriesFromHistory(
  history: MonitorSnapshot[] | undefined,
  key: "cpuPercent" | "ramPercent",
): ChartPoint[] {
  if (!history) return [];
  const points: ChartPoint[] = [];
  for (const entry of history) {
    const value = entry[key];
    if (typeof value === "number") points.push({ label: entry.capturedAt, value });
  }
  return points.slice(-48);
}

export function MonitorPanel({ vpsId }: { vpsId: string }) {
  const monitor = useMonitor(vpsId);
  const history = useMonitorHistory(vpsId);

  const snapshot = monitor.data;
  const cpuPercent = snapshot?.cpuPercent;
  const ramPercent = snapshot?.ramPercent;
  const diskPercent = snapshot?.diskPercent;
  const cpuSeries = seriesFromHistory(history.data, "cpuPercent");
  const ramSeries = seriesFromHistory(history.data, "ramPercent");

  return (
    <Panel>
      <PanelHeader
        title="Live monitoring"
        description="Refreshes automatically every few seconds"
        icon={<Activity className="h-4 w-4" />}
        action={
          <span className="text-2xs text-content-subtle">
            {snapshot ? `Updated ${formatRelativeTime(new Date(snapshot.capturedAt))}` : "Waiting…"}
          </span>
        }
      />
      <PanelBody className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-2">
            <RadialGauge value={cpuPercent} sublabel="CPU" tone="primary" />
            <p className="text-xs text-content-subtle">
              {cpuPercent === undefined ? "Unavailable" : formatPercent(cpuPercent)}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <RadialGauge value={ramPercent} sublabel="Memory" tone="info" />
            <p className="text-xs text-content-subtle">
              {snapshot?.ramMb === undefined ? "Unavailable" : formatMb(snapshot.ramMb, 0)}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <RadialGauge value={diskPercent} sublabel="Disk" tone="success" />
            <p className="text-xs text-content-subtle">
              {snapshot?.diskMb === undefined ? "Unavailable" : formatMb(snapshot.diskMb, 0)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-2xs uppercase tracking-wide text-content-subtle">
              <span>CPU history</span>
              <span>{cpuSeries.length} samples</span>
            </div>
            {history.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : cpuSeries.length >= 2 ? (
              <AreaSparkline points={cpuSeries} tone="primary" showGrid />
            ) : (
              <p className="rounded-card border border-border bg-surface-muted/40 px-3 py-4 text-xs text-content-subtle">
                Historical samples are not exposed by this panel. Live values remain available above.
              </p>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-2xs uppercase tracking-wide text-content-subtle">
              <span>Memory history</span>
              <span>{ramSeries.length} samples</span>
            </div>
            {history.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : ramSeries.length >= 2 ? (
              <AreaSparkline points={ramSeries} tone="info" showGrid />
            ) : (
              <p className="rounded-card border border-border bg-surface-muted/40 px-3 py-4 text-xs text-content-subtle">
                Historical samples are not exposed by this panel.
              </p>
            )}
          </div>
        </div>

        {monitor.isError ? (
          <EmptyState
            title="Live monitor unavailable"
            description="This Virtualizor build does not expose the monitor endpoint for this VPS."
          />
        ) : null}
      </PanelBody>
    </Panel>
  );
}
