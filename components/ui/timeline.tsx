import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface TimelineEntry {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  timestamp?: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
}

const DOT: Record<NonNullable<TimelineEntry["tone"]>, string> = {
  neutral: "bg-content-disabled",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

export function Timeline({ entries, className }: { entries: TimelineEntry[]; className?: string }) {
  return (
    <ol className={cn("relative space-y-5 border-l border-border pl-5", className)}>
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            className={cn(
              "absolute -left-[1.4375rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface",
              DOT[entry.tone ?? "neutral"],
            )}
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="text-sm font-medium text-content">{entry.title}</p>
            {entry.timestamp ? (
              <span className="tabular text-2xs text-content-disabled">{entry.timestamp}</span>
            ) : null}
          </div>
          {entry.description ? (
            <div className="mt-0.5 text-xs text-content-subtle">{entry.description}</div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
