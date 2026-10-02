import { NextResponse } from "next/server";

import { getAuthConfig } from "@/lib/auth";
import { createRequestId } from "@/lib/api/handlers";
import { jsonSuccess } from "@/lib/api/response";
import { getConfigStatus, loadVirtualizorConfig } from "@/lib/virtualizor/config";
import { getVirtualizorClient } from "@/lib/virtualizor/client";
import { VirtualizorError } from "@/lib/virtualizor/errors";
import type { HealthCheckResult, HealthReport } from "@/lib/virtualizor/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function buildReport(): Promise<HealthReport> {
  const status = getConfigStatus();
  const auth = getAuthConfig();
  const checks: HealthCheckResult[] = [];

  checks.push({
    id: "config",
    label: "Virtualizor configuration",
    status: status.configured ? "pass" : "fail",
    detail: status.configured ? undefined : `Missing: ${status.missing.join(", ")}`,
  });
  checks.push({
    id: "auth",
    label: "Dashboard authentication",
    status: auth.mode === "enabled" ? "pass" : auth.mode === "dev-open" ? "skip" : "fail",
    detail: auth.mode === "dev-open" ? "Authentication disabled for local development." : auth.reason,
  });

  const report: HealthReport = {
    configured: status.configured,
    ok: status.configured && auth.mode !== "blocked",
    checks,
    lastCheckedAt: new Date().toISOString(),
  };
  if (status.baseUrl) report.baseUrl = status.baseUrl;

  const loaded = loadVirtualizorConfig();
  if (!loaded.ok) {
    report.error = loaded.error.toShape();
    return report;
  }

  try {
    const startedAt = Date.now();
    await getVirtualizorClient(loaded.config).ping();
    const latencyMs = Date.now() - startedAt;
    report.latencyMs = latencyMs;
    checks.push({ id: "api", label: "Virtualizor API reachability", status: "pass", latencyMs });
  } catch (error) {
    const normalized = VirtualizorError.is(error) ? error : undefined;
    checks.push({
      id: "api",
      label: "Virtualizor API reachability",
      status: "fail",
      detail: normalized?.message ?? "Unavailable",
    });
    report.ok = false;
    if (normalized) report.error = normalized.toShape();
  }

  return report;
}

export async function GET(): Promise<NextResponse> {
  const requestId = createRequestId();
  const report = await buildReport();
  return jsonSuccess(report, requestId);
}
