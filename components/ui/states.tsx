import type { ReactNode } from "react";

import { Button, type ButtonProps } from "./button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      {icon ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-card border border-border bg-surface-muted/60 text-content-subtle">
          {icon}
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-content">{title}</p>
        {description ? <p className="mx-auto max-w-sm text-xs text-content-subtle">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-content">{title}</p>
        {description ? <p className="mx-auto max-w-md text-xs text-content-subtle">{description}</p> : null}
      </div>
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry} type="button">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function Unavailable({ label = "Unavailable" }: { label?: string }) {
  return <span className="text-content-disabled">{label}</span>;
}

export function InlineAlert({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const tones: Record<string, string> = {
    info: "border-info/30 bg-info-soft text-info",
    warning: "border-warning/30 bg-warning-soft text-warning",
    danger: "border-danger/30 bg-danger-soft text-danger",
    success: "border-success/30 bg-success-soft text-success",
  };
  return (
    <div className={cn("flex items-start justify-between gap-4 rounded-card border px-4 py-3", tones[tone])}>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold">{title}</p>
        {children ? <div className="text-xs text-content-muted">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ActionButton(props: ButtonProps) {
  return <Button {...props} />;
}
