import "server-only";

import { loadVirtualizorConfig } from "./config";
import { getVirtualizorClient } from "./client";
import { VirtualizorError } from "./errors";
import type { CapabilityReport } from "./types";

/**
 * Runtime capability detection.
 *
 * Different Virtualizor builds expose different `act` endpoints. Rather than
 * assuming, we probe a curated set of read-only actions and cache the result.
 * No destructive action is ever probed.
 */

const PROBE_ACTS: readonly string[] = [
  "listvs",
  "cpu",
  "ram",
  "disk",
  "bandwidth",
  "monitor",
  "services",
  "processes",
  "backup2",
  "firewallplan",
  "sshkeys",
  "euiso",
  "volume",
  "rdns",
  "pdns",
  "ctasks",
  "apikey",
  "vnc",
  "ostemplate",
  "ips",
  "statuslogs",
];

interface CacheEntry {
  report: CapabilityReport;
  expiresAt: number;
  key: string;
}

let cache: CacheEntry | undefined;

function isUnsupported(error: unknown): boolean {
  if (!VirtualizorError.is(error)) return false;
  return (
    error.code === "VIRTUALIZOR_UNSUPPORTED" ||
    error.code === "VIRTUALIZOR_NOT_FOUND" ||
    error.code === "VIRTUALIZOR_HTTP_ERROR"
  );
}

export async function detectCapabilities(force = false): Promise<CapabilityReport> {
  const result = loadVirtualizorConfig();
  if (!result.ok) throw result.error;
  const { config } = result;
  const key = `${config.baseUrl}|${config.apiKey.slice(-4)}`;
  const now = Date.now();
  if (!force && cache && cache.key === key && cache.expiresAt > now) {
    return cache.report;
  }

  const client = getVirtualizorClient(config);
  const supported: Record<string, boolean> = {};

  await Promise.all(
    PROBE_ACTS.map(async (act) => {
      try {
        await client.request({
          act,
          vpsId: null,
          timeoutMs: Math.min(config.timeoutMs, 10_000),
        });
        supported[act] = true;
      } catch (error) {
        if (isUnsupported(error)) {
          supported[act] = false;
          return;
        }
        // Auth/config/network failures are not capability signals; leave the
        // entry undefined so callers can distinguish "unknown" from "no".
      }
    }),
  );

  const report: CapabilityReport = { detectedAt: new Date().toISOString(), supported };
  cache = { report, expiresAt: now + config.capabilityTtlMs, key };
  return report;
}

export function resetCapabilityCache(): void {
  cache = undefined;
}
