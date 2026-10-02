import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { CapabilityReport } from "@/lib/virtualizor/types";

export type CapabilityState = "supported" | "unsupported" | "unknown";

export function capabilityState(report: CapabilityReport | undefined, act: string): CapabilityState {
  const value = report?.supported[act];
  if (value === true) return "supported";
  if (value === false) return "unsupported";
  return "unknown";
}

export function CapabilityNotice({
  report,
  act,
  feature,
  className,
  children,
}: {
  report: CapabilityReport | undefined;
  act: string;
  feature: string;
  className?: string;
  children?: ReactNode;
}) {
  const state = capabilityState(report, act);

  if (state === "supported") return <>{children}</>;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-card border border-border bg-surface-muted/40 px-4 py-4",
        className,
      )}
      role="status"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-content-disabled" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-content">
          {feature} is {state === "unsupported" ? "not supported" : "status unknown"}
        </p>
        <p className="text-xs text-content-subtle">
          {state === "unsupported"
            ? "This Virtualizor panel does not expose the required API action, so this section is read-only and shows Unavailable for unsupported data."
            : "Capability detection could not confirm this API action. Data is shown only when the panel returns it; otherwise it is labeled Unavailable."}
        </p>
        {children ? <div className="pt-1 text-xs text-content-muted">{children}</div> : null}
      </div>
    </div>
  );
}
