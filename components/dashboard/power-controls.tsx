"use client";

import { Loader2, Play, Power, RotateCw, Square } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiFetch } from "@/lib/api-client";
import type { ActionSuccess } from "@/lib/virtualizor/types";
import { invalidateVps, useApiMutation } from "@/hooks/use-virtualizor";
import { useQueryClient } from "@tanstack/react-query";

export type PowerAction = "start" | "stop" | "restart" | "poweroff";

interface PowerControlsProps {
  vpsId: string;
  status: "running" | "stopped" | "suspended" | "unknown";
  size?: "sm" | "md";
}

const ACTION_META: Record<PowerAction, { label: string; icon: typeof Play; destructive?: boolean }> = {
  start: { label: "Start", icon: Play },
  restart: { label: "Restart", icon: RotateCw },
  stop: { label: "Shut down", icon: Square },
  poweroff: { label: "Power off", icon: Power, destructive: true },
};

export function PowerControls({ vpsId, status, size = "md" }: PowerControlsProps) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<{ action: PowerAction } | null>(null);

  const mutation = useApiMutation<PowerAction, ActionSuccess>({
    mutationFn: (action) => apiFetch<ActionSuccess>(`/api/vps/${vpsId}/power`, { method: "POST", body: { action } }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId], ["vps-list"]],
  });

  const running = status === "running";
  const suspended = status === "suspended";

  function run(action: PowerAction) {
    mutation.mutate(action, {
      onSettled: () => {
        setPending(null);
        invalidateVps(queryClient, vpsId);
      },
    });
  }

  const destructive = pending?.action ? ACTION_META[pending.action].destructive : false;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size={size}
          disabled={running || suspended || mutation.isPending}
          onClick={() => run("start")}
        >
          <Play className="h-3.5 w-3.5" />
          Start
        </Button>
        <Button
          variant="secondary"
          size={size}
          disabled={!running || mutation.isPending}
          onClick={() => run("restart")}
        >
          <RotateCw className="h-3.5 w-3.5" />
          Restart
        </Button>
        <Button
          variant="secondary"
          size={size}
          disabled={!running || mutation.isPending}
          onClick={() => setPending({ action: "stop" })}
        >
          <Square className="h-3.5 w-3.5" />
          Shut down
        </Button>
        <Button
          variant="ghost"
          size={size}
          disabled={!running || mutation.isPending}
          onClick={() => setPending({ action: "poweroff" })}
        >
          {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
          Power off
        </Button>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        destructive={destructive}
        loading={mutation.isPending}
        title={pending ? `${ACTION_META[pending.action].label} this server?` : ""}
        description={
          pending?.action === "poweroff"
            ? "Power off forcibly cuts power and may risk filesystem integrity. Prefer shutting down gracefully."
            : "The command is sent to Virtualizor and applied to the running instance."
        }
        confirmLabel={pending ? ACTION_META[pending.action].label : "Confirm"}
        onConfirm={() => {
          if (pending) run(pending.action);
        }}
      />
    </>
  );
}
