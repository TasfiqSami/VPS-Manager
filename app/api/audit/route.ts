import { auditResources, listAudit } from "@/lib/api/audit";
import { apiGet } from "@/lib/api/handlers";
import type { AuditResponse } from "@/lib/virtualizor/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(async (request): Promise<AuditResponse> => {
  const params = request.nextUrl.searchParams;
  const resource = params.get("resource") ?? undefined;
  const search = params.get("search") ?? undefined;
  const successParam = params.get("success");
  const limitParam = Number(params.get("limit") ?? "");

  const records = listAudit({
    resource,
    search,
    limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined,
    success: successParam === "true" ? true : successParam === "false" ? false : undefined,
  });

  return { records, resources: auditResources(), retention: "in-memory" };
});
