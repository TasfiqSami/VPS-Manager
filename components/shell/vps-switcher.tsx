"use client";

import { Check, ChevronsUpDown, Server } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusDot, type StatusTone } from "@/components/ui/status-pill";
import { useActiveVps } from "@/hooks/use-active-vps";
import { cn } from "@/lib/utils";
import type { VpsStatus } from "@/lib/virtualizor/types";

function toTone(status: VpsStatus): StatusTone {
  if (status === "running" || status === "stopped" || status === "suspended") return status;
  return "unknown";
}

export function VpsSwitcher() {
  const { vpsId, vpsList, isLoading, setSelectedVpsId } = useActiveVps();
  const active = vpsList.find((item) => item.id === vpsId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-9 items-center gap-2 rounded-control border border-border bg-surface-muted/50 px-2.5 text-sm transition-colors",
          "hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring",
        )}
        aria-label="Select VPS"
      >
        <Server className="h-4 w-4 text-content-subtle" />
        <span className="max-w-[10rem] truncate font-medium text-content">
          {isLoading ? "Loading…" : (active?.name ?? "No VPS")}
        </span>
        {active ? <StatusDot tone={toTone(active.status)} /> : null}
        <ChevronsUpDown className="h-3.5 w-3.5 text-content-disabled" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Your servers</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {vpsList.length === 0 ? (
          <div className="px-2.5 py-2 text-xs text-content-subtle">No Virtualizor servers were returned.</div>
        ) : (
          vpsList.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onSelect={() => setSelectedVpsId(item.id)}
              className="justify-between gap-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                <StatusDot tone={toTone(item.status)} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-content">{item.name}</span>
                  {item.primaryIp ? (
                    <span className="tabular truncate text-2xs text-content-subtle">{item.primaryIp}</span>
                  ) : null}
                </span>
              </span>
              {item.id === vpsId ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
