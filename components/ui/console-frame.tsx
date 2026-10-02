"use client";

import { Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "./button";
import { Skeleton } from "./skeleton";
import { ErrorState } from "./states";
import { cn } from "@/lib/utils";

export type ConsoleStatus = "connected" | "connecting" | "disconnected" | "error";

const STATUS_TONE: Record<ConsoleStatus, { dot: string; label: string; text: string }> = {
  connected: { dot: "bg-success", label: "Connected", text: "text-success" },
  connecting: { dot: "bg-info", label: "Connecting", text: "text-info" },
  disconnected: { dot: "bg-content-subtle", label: "Disconnected", text: "text-content-muted" },
  error: { dot: "bg-danger", label: "Error", text: "text-danger" },
};

export function ConsoleFrame({
  title,
  subtitle,
  status = "disconnected",
  toolbar,
  footer,
  loading,
  error,
  errorTitle = "Console unavailable",
  onRetry,
  onReconnect,
  children,
  className,
  contentClassName,
  allowFullscreen = true,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ConsoleStatus;
  toolbar?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  error?: unknown;
  errorTitle?: string;
  onRetry?: () => void;
  onReconnect?: () => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  allowFullscreen?: boolean;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const tone = STATUS_TONE[status];

  return (
    <div
      className={cn(
        "orbit-panel orbit-hairline flex flex-col overflow-hidden",
        fullscreen && "fixed inset-4 z-50 shadow-e4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-muted/40 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-content">{title}</p>
            {subtitle ? <p className="truncate text-2xs text-content-subtle">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-2xs font-medium">
            <span className={cn("h-2 w-2 rounded-full", tone.dot, status === "connecting" && "animate-pulse-soft")} />
            <span className={cn("hidden sm:inline", tone.text)}>{tone.label}</span>
          </span>
          {toolbar}
          {onReconnect ? (
            <Button variant="ghost" size="sm" onClick={onReconnect} aria-label="Reconnect">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {allowFullscreen ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFullscreen((current) => !current)}
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          ) : null}
        </div>
      </div>

      <div className={cn("relative flex-1 bg-canvas", contentClassName)}>
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <ErrorState title={errorTitle} onRetry={onRetry} />
        ) : (
          children
        )}
      </div>

      {footer ? (
        <div className="border-t border-border bg-surface-muted/40 px-4 py-2 text-2xs text-content-subtle">{footer}</div>
      ) : null}
    </div>
  );
}
