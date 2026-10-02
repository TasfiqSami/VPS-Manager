"use client";

import { ServerOff } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState, ErrorState } from "@/components/ui/states";
import { PanelSkeleton } from "@/components/ui/skeleton";
import { useActiveVps } from "@/hooks/use-active-vps";
import { isApiError } from "@/lib/api-client";

/**
 * Resolves the active VPS and renders loading / error / empty states before
 * handing the concrete VPS id to the page body.
 */
export function VpsGate({ children }: { children: (vpsId: string) => ReactNode }) {
  const { vpsId, isLoading, isError, error } = useActiveVps();

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelSkeleton rows={4} />
        <PanelSkeleton rows={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load your servers"
        description={isApiError(error) ? error.message : "The Virtualizor API did not respond as expected."}
      />
    );
  }

  if (!vpsId) {
    return (
      <EmptyState
        icon={<ServerOff className="h-5 w-5" />}
        title="No VPS available"
        description="The API key returned no servers for this Virtualizor account. Verify VIRTUALIZOR_VPS_ID and the account permissions."
      />
    );
  }

  return <>{children(vpsId)}</>;
}
