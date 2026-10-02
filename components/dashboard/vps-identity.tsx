"use client";

import { Cpu, Globe, MapPin, MemoryStick } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import type { VpsInfo } from "@/lib/virtualizor/types";
import { formatDateTime } from "@/lib/utils";

function toneOf(vps: VpsInfo): StatusTone {
  if (vps.status === "running" || vps.status === "stopped" || vps.status === "suspended") return vps.status;
  return "unknown";
}

export function VpsIdentity({ vps }: { vps: VpsInfo | undefined }) {
  if (!vps) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  const primaryIp = vps.ips[0] ?? vps.ipv6[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-content">{vps.name}</h1>
        <StatusPill tone={toneOf(vps)} label={vps.statusLabel} />
        {vps.suspended ? <Badge tone="warning">Suspended</Badge> : null}
        {vps.rescue ? <Badge tone="info">Rescue mode</Badge> : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-content-muted">
        {primaryIp ? (
          <span className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-content-subtle" />
            <span className="tabular">{primaryIp}</span>
            <CopyButton value={primaryIp} label="IP" />
          </span>
        ) : null}
        <span className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-content-subtle" />
          {vps.cpuCores !== undefined ? `${vps.cpuCores} vCPU` : "CPU Unavailable"}
          {vps.cpuLimit !== undefined ? ` · ${vps.cpuLimit}% cap` : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <MemoryStick className="h-3.5 w-3.5 text-content-subtle" />
          {vps.ramMb !== undefined ? `${vps.ramMb} MB RAM` : "RAM Unavailable"}
        </span>
        {vps.location ? (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-content-subtle" />
            {vps.location}
          </span>
        ) : null}
        {vps.createdAt ? <span>Created {formatDateTime(vps.createdAt)}</span> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-content-subtle">
        {vps.os ? <Badge tone="neutral">{vps.os}</Badge> : null}
        {vps.virtualization ? <Badge tone="neutral">{vps.virtualization}</Badge> : null}
        {vps.diskGb !== undefined ? <Badge tone="neutral">{vps.diskGb} GB disk</Badge> : null}
        {vps.bandwidthGb !== undefined ? <Badge tone="neutral">{vps.bandwidthGb} GB bandwidth</Badge> : null}
      </div>
    </div>
  );
}
