"use client";

import { useEffect } from "react";

import { useVpsList } from "./use-virtualizor";
import { useVpsSelection } from "./use-vps";

/**
 * Resolve the VPS currently in focus.
 * Falls back to the first VPS when nothing is selected, and repairs a stale
 * selection that no longer exists on the account.
 */
export function useActiveVps() {
  const list = useVpsList();
  const { selectedVpsId, setSelectedVpsId, ready } = useVpsSelection();
  const firstId = list.data?.[0]?.id ?? null;
  const activeId = selectedVpsId ?? firstId;

  useEffect(() => {
    if (!ready) return;
    const items = list.data;
    if (!items || items.length === 0) return;
    if (!selectedVpsId) {
      if (firstId) setSelectedVpsId(firstId);
      return;
    }
    if (!items.some((item) => item.id === selectedVpsId)) {
      setSelectedVpsId(firstId);
    }
  }, [ready, selectedVpsId, list.data, firstId, setSelectedVpsId]);

  return {
    vpsId: activeId,
    vpsList: list.data ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error,
    setSelectedVpsId,
  };
}
