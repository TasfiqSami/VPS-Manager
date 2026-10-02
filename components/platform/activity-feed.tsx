"use client";

import { ScrollText } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Timeline, type TimelineEntry } from "@/components/ui/timeline";
import { useAuditLog, useTasks } from "@/hooks/use-virtualizor";
import { formatDateTime } from "@/lib/utils";
import type { TaskInfo } from "@/lib/virtualizor/types";

export type ActivitySource = "audit" | "tasks" | "all";

function auditEntries(
  records: ReturnType<typeof useAuditLog>["data"],
): TimelineEntry[] {
  if (!records) return [];
  return records.records.slice(0, 25).map((record) => ({
    id: record.id,
    title: `${record.method} ${record.path}`,
    description: `${record.actor} · ${record.status}${record.code ? ` · ${record.code}` : ""} · ${record.durationMs}ms`,
    timestamp: formatDateTime(record.timestamp),
    tone: record.success ? "success" : "danger",
  }));
}

function taskEntries(tasks: TaskInfo[] | undefined): TimelineEntry[] {
  if (!tasks) return [];
  return tasks.slice(0, 25).map((task) => ({
    id: `task-${task.id}`,
    title: task.action ?? task.message ?? `Task ${task.id}`,
    description: [task.statusLabel, task.progress !== undefined ? `${task.progress}%` : undefined]
      .filter(Boolean)
      .join(" · "),
    timestamp: task.createdAt ? formatDateTime(task.createdAt) : undefined,
    tone:
      task.status === "failed"
        ? "danger"
        : task.status === "completed"
          ? "success"
          : task.status === "running"
            ? "info"
            : "neutral",
  }));
}

export function ActivityFeed({
  vpsId,
  source = "all",
  limit = 12,
  title = "Recent activity",
  description = "Operations recorded by this Vantage instance (best-effort, in-memory).",
  embedded = false,
}: {
  vpsId?: string | null;
  source?: ActivitySource;
  limit?: number;
  title?: string;
  description?: string;
  embedded?: boolean;
}) {
  const audit = useAuditLog();
  const tasks = useTasks(source === "audit" ? null : vpsId ?? null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string>>(new Set());

  const entries = useMemo(() => {
    const list: TimelineEntry[] = [];
    if (source === "audit" || source === "all") list.push(...auditEntries(audit.data));
    if (source === "tasks" || source === "all") list.push(...taskEntries(tasks.data));
    return list.slice(0, limit);
  }, [audit.data, tasks.data, source, limit]);

  useEffect(() => {
    const fresh = new Set<string>();
    for (const entry of entries) {
      if (!seen.current.has(entry.id)) fresh.add(entry.id);
    }
    if (seen.current.size > 0 && fresh.size > 0) setNewIds(fresh);
    for (const entry of entries) seen.current.add(entry.id);
  }, [entries]);

  const isLoading = audit.isLoading && tasks.isLoading && entries.length === 0;
  const isError = audit.isError && tasks.isError && entries.length === 0;

  const body = (
    <>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="Activity unavailable" onRetry={() => void audit.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Operations you perform from Vantage will appear here as you use the platform."
        />
      ) : (
        <Timeline
          entries={entries.map((entry) =>
            newIds.has(entry.id) ? { ...entry, tone: entry.tone ?? "primary" } : entry,
          )}
        />
      )}
    </>
  );

  if (embedded) return body;

  return (
    <Panel>
      <PanelHeader
        title={title}
        description={description}
        icon={<ScrollText className="h-4 w-4" />}
        action={
          <Link href="/logs" className="text-2xs font-medium text-primary hover:underline">
            View all logs
          </Link>
        }
      />
      <PanelBody>{body}</PanelBody>
    </Panel>
  );
}
