"use client";

import { Activity, Database, Globe2, MemoryStick } from "lucide-react";

import { MetricCard } from "@/components/ui/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStats } from "@/hooks/use-virtualizor";
import { formatMb, formatPercent } from "@/lib/utils";
import type { StatsBundle } from "@/lib/virtualizor/types";

function toneFor(percent: number | undefined): "success" | "warning" | "danger" {
  if (percent === undefined) return "success";
  if (percent >= 90) return "danger";
  if (percent >= 70) return "warning";
  return "success";
}

function diskLabel(stats: StatsBundle): { value: string; unit?: string; hint: string; percent?: number } {
  const disk = stats.disk;
  if (!disk || (disk.used === undefined && disk.limit === undefined)) {
    return { value: "Unavailable", hint: stats.errors.disk ?? "Disk statistics are not exposed by this panel." };
  }
  const unit = disk.unit;
  const fmt = (value: number | undefined) =>
    value === undefined ? "—" : unit === "gb" ? `${value.toFixed(1)} GB` : `${Math.round(value)} MB`;
  return {
    value: fmt(disk.used),
    unit: disk.limit !== undefined ? `of ${fmt(disk.limit)}` : undefined,
    hint:
      disk.inodes?.used !== undefined
        ? `Inodes: ${disk.inodes.used}${disk.inodes.limit !== undefined ? ` / ${disk.inodes.limit}` : ""}`
        : "Filesystem utilisation",
    percent: disk.percent,
  };
}

export function StatGrid({ vpsId }: { vpsId: string }) {
  const { data, isLoading } = useStats(vpsId);

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-card" />
        ))}
      </div>
    );
  }

  const cpuPercent = data.cpu?.percent ?? data.cpu?.usage.percent;
  const ramPercent = data.ram?.percent ?? data.ram?.usage.percent;
  const disk = diskLabel(data);
  const bwPercent = data.bandwidth?.percent ?? data.bandwidth?.usage.percent;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="CPU"
        value={cpuPercent === undefined ? "Unavailable" : cpuPercent.toFixed(1)}
        unit={cpuPercent === undefined ? undefined : "%"}
        icon={<Activity className="h-4 w-4" />}
        percent={cpuPercent}
        tone={toneFor(cpuPercent)}
        hint={
          data.errors.cpu ??
          (data.cpu?.used !== undefined && data.cpu?.limit !== undefined
            ? `${data.cpu.used} of ${data.cpu.limit} cores`
            : "Processor load")
        }
      />
      <MetricCard
        label="Memory"
        value={data.ram?.used === undefined ? "Unavailable" : formatMb(data.ram.used, 1)}
        icon={<MemoryStick className="h-4 w-4" />}
        percent={ramPercent}
        tone={toneFor(ramPercent)}
        hint={
          data.errors.ram ??
          (ramPercent === undefined ? "Memory utilisation" : `${formatPercent(ramPercent)} of provisioned RAM`)
        }
      />
      <MetricCard
        label="Disk"
        value={disk.value}
        unit={disk.unit}
        icon={<Database className="h-4 w-4" />}
        percent={disk.percent}
        tone={toneFor(disk.percent)}
        hint={disk.hint}
      />
      <MetricCard
        label="Bandwidth"
        value={data.bandwidth?.usedGb === undefined ? "Unavailable" : data.bandwidth.usedGb.toFixed(1)}
        unit={data.bandwidth?.usedGb === undefined ? undefined : "GB"}
        icon={<Globe2 className="h-4 w-4" />}
        percent={bwPercent}
        tone={toneFor(bwPercent)}
        hint={
          data.errors.bandwidth ??
          (data.bandwidth?.limitGb !== undefined
            ? `of ${data.bandwidth.limitGb} GB this cycle`
            : "Monthly transfer")
        }
      />
    </div>
  );
}
