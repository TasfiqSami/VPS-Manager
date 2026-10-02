import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Meter, type MeterTone } from "./progress";

export function MetricCard({
  label,
  value,
  unit,
  hint,
  icon,
  percent,
  tone = "primary",
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  percent?: number | undefined;
  tone?: MeterTone;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("orbit-panel orbit-hairline flex flex-col gap-3 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-content-subtle">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="tabular text-2xl font-semibold tracking-tight text-content">{value}</span>
            {unit ? <span className="text-xs font-medium text-content-subtle">{unit}</span> : null}
          </div>
        </div>
        {icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-card border border-border bg-surface-muted/60 text-primary">
            {icon}
          </span>
        ) : null}
      </div>
      {percent !== undefined ? <Meter value={percent} tone={tone} /> : null}
      {hint ? <p className="text-xs text-content-subtle">{hint}</p> : null}
      {footer}
    </div>
  );
}
