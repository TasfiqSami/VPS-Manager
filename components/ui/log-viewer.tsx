"use client";

import { Download, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "./button";
import { Input, Select } from "./input";
import { EmptyState, ErrorState } from "./states";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

export type LogLevel = "debug" | "info" | "warning" | "error" | "critical";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
  actor?: string;
  target?: string;
  ip?: string;
  status?: string;
  details?: string;
}

const LEVEL_TONE: Record<LogLevel, string> = {
  debug: "text-content-disabled",
  info: "text-info",
  warning: "text-warning",
  error: "text-danger",
  critical: "text-danger",
};

const LEVEL_LABEL: Record<LogLevel, string> = {
  debug: "DEBUG",
  info: "INFO",
  warning: "WARN",
  error: "ERROR",
  critical: "CRIT",
};

export function LogViewer({
  entries,
  loading,
  error,
  onRetry,
  emptyTitle = "No log entries",
  emptyDescription,
  exportFilename = "logs",
  className,
  toolbar,
}: {
  entries: LogEntry[] | undefined;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  exportFilename?: string;
  className?: string;
  toolbar?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<"all" | LogLevel>("all");

  const filtered = useMemo(() => {
    const rows = entries ?? [];
    const term = query.trim().toLowerCase();
    return rows.filter((entry) => {
      if (level !== "all" && entry.level !== level) return false;
      if (!term) return true;
      return [entry.message, entry.source, entry.actor, entry.target, entry.ip, entry.details]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [entries, query, level]);

  function exportLogs() {
    const header = "timestamp\tlevel\tsource\tactor\ttarget\tip\tstatus\tmessage";
    const rows = filtered.map((entry) =>
      [entry.timestamp, entry.level, entry.source, entry.actor, entry.target, entry.ip, entry.status, entry.message]
        .map((value) => (value ?? "").toString().replace(/\t/g, " "))
        .join("\t"),
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportFilename}.log`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content-disabled" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search log messages…"
            className="h-9 pl-9"
            aria-label="Search logs"
          />
        </div>
        <Select
          aria-label="Filter by level"
          value={level}
          onChange={(event) => setLevel(event.target.value as typeof level)}
          className="h-9 w-full sm:w-36"
        >
          <option value="all">All levels</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </Select>
        <div className="flex items-center gap-2 sm:ml-auto">
          {toolbar}
          <Button variant="ghost" size="sm" onClick={exportLogs} disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Logs unavailable" onRetry={onRetry} />
      ) : filtered.length === 0 ? (
        <EmptyState title={emptyTitle} description={entries && entries.length > 0 ? "No entries match your filters." : emptyDescription} />
      ) : (
        <ul className="divide-y divide-border/60 font-mono text-xs">
          {filtered.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-surface-muted/40">
              <span className="tabular shrink-0 text-content-disabled">{entry.timestamp}</span>
              <span className={cn("w-12 shrink-0 font-semibold", LEVEL_TONE[entry.level])}>
                {LEVEL_LABEL[entry.level]}
              </span>
              <span className="min-w-0 flex-1 break-words text-content">
                {entry.message}
                {entry.details ? <span className="text-content-subtle"> — {entry.details}</span> : null}
              </span>
              {entry.source ? (
                <span className="hidden shrink-0 text-content-subtle sm:block">{entry.source}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
