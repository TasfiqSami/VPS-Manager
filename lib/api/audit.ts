import "server-only";

import { logger } from "./logger";

/**
 * In-memory audit trail.
 *
 * Every mutating API request that flows through the dashboard is recorded here
 * so the Logs, Activity, API and Admin surfaces can display real operations.
 *
 * Persistence is intentionally process-local: Vantage is designed to run on
 * serverless/edge runtimes without a database. When the process is recycled the
 * trail resets, and the UI labels it as a best-effort, in-memory record rather
 * than pretending it is durable.
 */

export interface AuditRecord {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  /** First meaningful path segment, e.g. `vps`, `volumes`, `ssh-keys`. */
  resource: string;
  /** Last path segment or explicit target, e.g. a VPS id. */
  target?: string;
  actor: string;
  ip: string;
  success: boolean;
  status: number;
  code?: string;
  durationMs: number;
  requestId: string;
}

export interface AuditInput {
  method: string;
  path: string;
  target?: string;
  actor: string;
  ip: string;
  success: boolean;
  status: number;
  code?: string;
  durationMs: number;
  requestId: string;
}

export interface AuditQuery {
  limit?: number;
  resource?: string;
  success?: boolean;
  search?: string;
}

function limitFromEnv(): number {
  const parsed = Number(process.env.VANTAGE_AUDIT_LIMIT ?? "500");
  if (Number.isFinite(parsed) && parsed > 0) return Math.min(Math.floor(parsed), 5000);
  return 500;
}

let buffer: AuditRecord[] = [];
let sequence = 0;

function deriveResource(path: string): { resource: string; target?: string } {
  const segments = path.split("/").filter(Boolean);
  // Drop the leading `api` segment when present.
  const meaningful = segments[0] === "api" ? segments.slice(1) : segments;
  const resource = meaningful[0] ?? "root";
  const last = meaningful[meaningful.length - 1];
  const target = meaningful.length > 1 && last !== resource ? last : undefined;
  return { resource, target };
}

export function recordAudit(input: AuditInput): void {
  try {
    sequence += 1;
    const { resource, target } = deriveResource(input.path);
    const record: AuditRecord = {
      id: `aud_${Date.now().toString(36)}_${sequence.toString(36)}`,
      timestamp: new Date().toISOString(),
      method: input.method,
      path: input.path,
      resource,
      target: input.target ?? target,
      actor: input.actor,
      ip: input.ip,
      success: input.success,
      status: input.status,
      durationMs: input.durationMs,
      requestId: input.requestId,
    };
    if (input.code) record.code = input.code;
    buffer = [record, ...buffer].slice(0, limitFromEnv());
  } catch (error) {
    // Auditing must never break the request it is observing.
    logger.warn("audit_record_failed", { message: error instanceof Error ? error.message : "unknown" });
  }
}

export function listAudit(query: AuditQuery = {}): AuditRecord[] {
  const term = query.search?.trim().toLowerCase();
  let rows = buffer;
  if (query.resource && query.resource !== "all") {
    rows = rows.filter((entry) => entry.resource === query.resource);
  }
  if (typeof query.success === "boolean") {
    rows = rows.filter((entry) => entry.success === query.success);
  }
  if (term) {
    rows = rows.filter((entry) =>
      [entry.path, entry.actor, entry.ip, entry.code, entry.target, entry.requestId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }
  const limit = query.limit && query.limit > 0 ? Math.min(query.limit, limitFromEnv()) : limitFromEnv();
  return rows.slice(0, limit);
}

export function auditResources(): string[] {
  return Array.from(new Set(buffer.map((entry) => entry.resource))).sort();
}

export function auditStoreSize(): number {
  return buffer.length;
}

/** Test helper: clear the in-memory trail. */
export function resetAudit(): void {
  buffer = [];
  sequence = 0;
}
