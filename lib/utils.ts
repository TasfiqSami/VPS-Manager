import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names while resolving Tailwind conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

/** Format a byte count using binary units. Returns "Unavailable" for invalid input. */
export function formatBytes(value: number | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) {
    return "Unavailable";
  }
  if (value === 0) return "0 B";
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), BYTE_UNITS.length - 1);
  const scaled = value / Math.pow(1024, exponent);
  const digits = scaled >= 100 || exponent === 0 ? 0 : fractionDigits;
  return `${scaled.toFixed(digits)} ${BYTE_UNITS[exponent]}`;
}

/** Virtualizor reports memory/disk in megabytes. Convert to bytes for display. */
export function formatMb(value: number | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Unavailable";
  return formatBytes(value * 1024 * 1024, fractionDigits);
}

/** Format a gigabyte quantity with a fixed unit label. */
export function formatGb(value: number | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Unavailable";
  return `${value.toFixed(fractionDigits)} GB`;
}

/** Format a percentage with a fixed number of decimals. */
export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Unavailable";
  return `${value.toFixed(fractionDigits)}%`;
}

/** Human readable duration from seconds. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return "Unavailable";
  }
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = Math.round(seconds % 60);
  if (minutes < 60) return `${minutes}m ${remainderSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainderMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remainderMinutes}m`;
  const days = Math.floor(hours / 24);
  const remainderHours = hours % 24;
  return `${days}d ${remainderHours}h`;
}

/** Relative "time ago" label used for freshness indicators. */
export function formatRelativeTime(from: Date | number | null | undefined, now = Date.now()): string {
  if (from === null || from === undefined) return "never";
  const timestamp = typeof from === "number" ? from : from.getTime();
  if (!Number.isFinite(timestamp)) return "never";
  const deltaSeconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (deltaSeconds < 5) return "just now";
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Coerce an unknown value to a finite number or undefined. */
export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/** Coerce an unknown value to a trimmed string or undefined. */
export function toStringValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

/**
 * Strict boolean coercion.
 *
 * Never use JavaScript truthiness on strings: `Boolean("false")` and
 * `Boolean("0")` are both `true`. This is the fix for the v1 volume
 * `attached` defect.
 */
export function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on", "enabled", "active"].includes(normalized)) return true;
    if (["0", "false", "no", "off", "disabled", "inactive", ""].includes(normalized)) return false;
  }
  return undefined;
}

/** Safe calculation of a percentage, guarding against divide-by-zero. */
export function safePercent(used: number | undefined, total: number | undefined): number | undefined {
  if (used === undefined || total === undefined || total <= 0) return undefined;
  return Math.min(100, Math.max(0, (used / total) * 100));
}

/** Clamp a number between a minimum and maximum. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const IPV4_PATTERN =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

/** Loose IPv6 check: contains a colon, only hex/colon/dot characters. */
export function isIpv6(value: string): boolean {
  if (!value.includes(":")) return false;
  if (!/^[0-9a-fA-F:.]+$/.test(value)) return false;
  const compression = value.split("::");
  if (compression.length > 2) return false;
  return true;
}

export function isIpv4(value: string): boolean {
  return IPV4_PATTERN.test(value);
}

export function isIp(value: string): boolean {
  return isIpv4(value) || isIpv6(value);
}

/** Convert an unknown date representation into an ISO string, if possible. */
export function toIsoString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 0) {
      const fromEpoch = new Date(numeric < 1e12 ? numeric * 1000 : numeric);
      if (!Number.isNaN(fromEpoch.getTime())) return fromEpoch.toISOString();
    }
    return undefined;
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const fromEpoch = new Date(value < 1e12 ? value * 1000 : value);
    if (!Number.isNaN(fromEpoch.getTime())) return fromEpoch.toISOString();
  }
  return undefined;
}

/** Format an ISO timestamp for display. */
export function formatDateTime(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "Unavailable";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  }).format(date);
}

/** Sleep for a bounded number of milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
