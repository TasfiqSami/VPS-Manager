"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "vantage.selectedVpsId";

interface VpsContextValue {
  selectedVpsId: string | null;
  setSelectedVpsId: (vpsId: string | null) => void;
  ready: boolean;
}

const VpsContext = createContext<VpsContextValue | undefined>(undefined);

export function VpsProvider({ children }: { children: ReactNode }) {
  const [selectedVpsId, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setSelected(stored);
    } catch {
      // localStorage may be unavailable (private mode); selection stays in memory.
    }
    setReady(true);
  }, []);

  const setSelectedVpsId = useCallback((vpsId: string | null) => {
    setSelected(vpsId);
    try {
      if (vpsId) window.localStorage.setItem(STORAGE_KEY, vpsId);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const value = useMemo<VpsContextValue>(
    () => ({ selectedVpsId, setSelectedVpsId, ready }),
    [selectedVpsId, setSelectedVpsId, ready],
  );

  return <VpsContext.Provider value={value}>{children}</VpsContext.Provider>;
}

export function useVpsSelection(): VpsContextValue {
  const context = useContext(VpsContext);
  if (!context) {
    throw new Error("useVpsSelection must be used within VpsProvider.");
  }
  return context;
}
