import type { ReactNode } from "react";

import { Unavailable } from "./states";
import { cn } from "@/lib/utils";

export function KeyValue({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-2", className)}>
      <span className="text-xs text-content-subtle">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-medium text-content">{children}</span>
    </div>
  );
}

export function KeyValueGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-x-8 sm:grid-cols-2", className)}>{children}</div>;
}

/**
 * Renders a value or a truthful `Unavailable` placeholder when the API did not
 * return anything. Empty strings, nulls and undefined all collapse to
 * `Unavailable` so the UI never fabricates data.
 */
export function ValueOrUnavailable({ value, fallback }: { value: ReactNode; fallback?: string }) {
  if (value === null || value === undefined || value === "" || value === false) {
    return <Unavailable label={fallback} />;
  }
  return <>{value}</>;
}

export function KeyValueSection({
  title,
  description,
  action,
  children,
  className,
  columns = 1,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  const gridClass =
    columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "";
  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-content-subtle">{title}</h3>
          {description ? <p className="text-xs text-content-disabled">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn("grid gap-x-8", gridClass)}>{children}</div>
    </section>
  );
}

export function DetailField({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1.5">
        <span className="text-2xs font-medium uppercase tracking-wide text-content-subtle">{label}</span>
        {hint ? <span className="text-2xs text-content-disabled">{hint}</span> : null}
      </div>
      <div className="text-sm text-content">{children}</div>
    </div>
  );
}
