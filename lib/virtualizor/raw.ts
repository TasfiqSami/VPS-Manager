import type { UnknownRecord } from "./types";

/**
 * Safe readers for values embedded in a Virtualizor record. These never invent
 * data: they return `undefined` when a key is absent, and the UI renders
 * `Unavailable` in that case.
 */

export function rawString(raw: UnknownRecord | undefined, keys: readonly string[]): string | undefined {
  if (!raw) return undefined;
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

export function rawNumber(raw: UnknownRecord | undefined, keys: readonly string[]): number | undefined {
  if (!raw) return undefined;
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

export function rawBoolean(raw: UnknownRecord | undefined, keys: readonly string[]): boolean | undefined {
  if (!raw) return undefined;
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1" || value === "true" || value === "on") return true;
    if (value === 0 || value === "0" || value === "false" || value === "off") return false;
  }
  return undefined;
}
