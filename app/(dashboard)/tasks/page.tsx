"use client";

import { ListChecks, RotateCw } from "lucide-react";

import { VpsGate } from "@/components/dashboard/vps-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Meter } from "@/components/ui/progress";
import { useTasks } from "@/hooks/use-virtualizor";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import type { TaskInfo, TaskStatus } from "@/lib/virtualizor/types";

const STATUS_TONE: Record<TaskStatus, "neutral" | "info" | "success" | "danger" | "warning"> = {
  pending: "neutral",
  running: "info",
  completed: "success",
  failed: "danger",
  unknown: "neutral",
};

function ProgressCell({ task }: { task: TaskInfo }) {
  if (task.progress === undefined) {
    return <span className="text-xs text-content-disabled">—</span>;
  }
  return (
    <div className="w-36">
      <span className="tabular text-2xs text-content-subtle">{task.progress.toFixed(0)}%</span>
      <Meter
        value={task.progress}
        tone={task.status === "failed" ? "danger" : task.status === "completed" ? "success" : "info"}
        indeterminate={task.status === "running" && task.progress === 0}
        className="mt-1"
      />
    </div>
  );
}

function TasksBody({ vpsId }: { vpsId: string }) {
  const query = useTasks(vpsId);
  const tasks = query.data ?? [];
  const running = tasks.filter((task) => task.status === "running").length;
  const failed = tasks.filter((task) => task.status === "failed").length;

  const columns: DataTableColumn<TaskInfo>[] = [
    {
      key: "task",
      header: "Task",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-content">{row.action ?? `Task ${row.id}`}</p>
          <p className="tabular text-2xs text-content-subtle">#{row.id}</p>
        </div>
      ),
      sortValue: (row) => row.action ?? row.id,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{row.statusLabel}</Badge>,
      sortValue: (row) => row.status,
    },
    {
      key: "progress",
      header: "Progress",
      render: (row) => <ProgressCell task={row} />,
      sortValue: (row) => row.progress ?? -1,
    },
    {
      key: "created",
      header: "Created",
      render: (row) =>
        row.createdAt ? (
          <div className="text-xs text-content-subtle">
            <span>{formatDateTime(row.createdAt)}</span>
            <span className="ml-1 text-content-disabled">({formatRelativeTime(new Date(row.createdAt))})</span>
          </div>
        ) : (
          <span className="text-content-disabled">—</span>
        ),
      sortValue: (row) => row.createdAt ?? "",
    },
    {
      key: "message",
      header: "Message",
      render: (row) => (
        <span className="block max-w-[22rem] truncate text-xs text-content-muted" title={row.message}>
          {row.message ?? "—"}
        </span>
      ),
      sortValue: (row) => row.message ?? "",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operate"
        title="Tasks"
        description="Long-running operations queued by the panel. This view refreshes automatically."
        actions={
          <div className="flex items-center gap-2">
            {running > 0 ? <Badge tone="info">{running} running</Badge> : null}
            {failed > 0 ? <Badge tone="danger">{failed} failed</Badge> : null}
            <Button variant="secondary" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RotateCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />
      <DataTable
        data={tasks}
        columns={columns}
        getRowId={(row) => row.id}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        errorTitle="Tasks unavailable"
        onRetry={() => query.refetch()}
        searchPlaceholder="Search tasks…"
        initialSort={{ key: "created", direction: "desc" }}
        emptyIcon={<ListChecks className="h-5 w-5" />}
        emptyTitle="No tasks"
        emptyDescription="Operations you trigger, like reinstall or backup, will appear here."
      />
    </div>
  );
}

export default function TasksPage() {
  return <VpsGate>{(vpsId) => <TasksBody vpsId={vpsId} />}</VpsGate>;
}
