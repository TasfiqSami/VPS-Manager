"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Persistent browser-local preference.
 *
 * Used for genuine client-side settings (dashboard layout, units, alert
 * thresholds, console theme). This is real persistence scoped to the operator's
 * browser — it never pretends to change server state.
 */
export function useLocalPreference<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // Ignore malformed or unavailable storage; fall back to the default.
    }
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage may be unavailable (private mode); state still updates.
      }
    },
    [key],
  );

  return [value, update];
}
