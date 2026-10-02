"use client";

import { ListChecks, Layers, ServerCog, MemoryStick } from "lucide-react";

import { MetricCard } from "@/components/ui/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProcesses, useServices, useStats, useTasks } from "@/hooks/use-virtualizor";
import { formatMb } from "@/lib/utils";

export function ExtendedStats({ vpsId }: { vpsId: string }) {
  const processes = useProcesses(vpsId);
  const services = useServices(vpsId);
  const tasks = useTasks(vpsId);
  const stats = useStats(vpsId);

  const loading = processes.isLoading && services.isLoading && tasks.isLoading;
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-card" />
        ))}
      </div>
    );
  }

  const processCount = processes.data?.length;
  const runningServices = services.data?.filter((service) => service.running).length;
  const serviceCount = services.data?.length;
  const pendingTasks = tasks.data?.filter((task) => task.status === "pending" || task.status === "running").length;
  const swapMb = stats.data?.ram?.swap;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Processes"
        value={processCount ?? "Unavailable"}
        icon={<Layers className="h-4 w-4" />}
        hint={processes.isError ? "Process list not exposed by this panel." : "Running processes reported by the guest"}
      />
      <MetricCard
        label="Services"
        value={serviceCount === undefined ? "Unavailable" : `${runningServices ?? 0}/${serviceCount}`}
        icon={<ServerCog className="h-4 w-4" />}
        hint={services.isError ? "Service inventory not exposed." : "Running / total system services"}
      />
      <MetricCard
        label="Active tasks"
        value={pendingTasks ?? "Unavailable"}
        icon={<ListChecks className="h-4 w-4" />}
        hint={tasks.isError ? "Task queue not exposed." : "Pending or running Virtualizor tasks"}
      />
      <MetricCard
        label="Swap"
        value={swapMb === undefined ? "Unavailable" : formatMb(swapMb, 0)}
        icon={<MemoryStick className="h-4 w-4" />}
        hint={stats.data?.errors.ram ?? "Configured swap for this instance"}
      />
    </div>
  );
}
