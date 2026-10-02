import { cn } from "@/lib/utils";

export type StatusTone = "running" | "stopped" | "suspended" | "unknown" | "pending";

const STATUS_STYLES: Record<StatusTone, { dot: string; text: string; label: string }> = {
  running: { dot: "bg-success", text: "text-success", label: "Running" },
  stopped: { dot: "bg-content-subtle", text: "text-content-muted", label: "Stopped" },
  suspended: { dot: "bg-warning", text: "text-warning", label: "Suspended" },
  pending: { dot: "bg-info", text: "text-info", label: "Pending" },
  unknown: { dot: "bg-content-disabled", text: "text-content-subtle", label: "Unknown" },
};

export function StatusDot({ tone, pulse }: { tone: StatusTone; pulse?: boolean }) {
  const style = STATUS_STYLES[tone];
  return (
    <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center">
      {tone === "running" || pulse ? (
        <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", style.dot)} />
      ) : null}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", style.dot)} />
    </span>
  );
}

export function StatusPill({ tone, label, className }: { tone: StatusTone; label?: string; className?: string }) {
  const style = STATUS_STYLES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted/60 px-2.5 py-1 text-xs font-medium",
        className,
      )}
    >
      <StatusDot tone={tone} />
      <span className={style.text}>{label ?? style.label}</span>
    </span>
  );
}
