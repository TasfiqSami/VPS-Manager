import { apiMutation, parseJsonBody, requireRouteParam } from "@/lib/api/handlers";
import { deleteDnsRecord, editDnsRecord } from "@/lib/virtualizor/actions";
import { dnsRecordSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PUT = apiMutation(async (request, context) => {
  const domainId = await requireRouteParam(context, "zoneId");
  const recordId = await requireRouteParam(context, "recordId");
  const input = await parseJsonBody(request, dnsRecordSchema.omit({ domainId: true }));
  return editDnsRecord({ ...input, domainId, recordId });
});

export const DELETE = apiMutation(async (_request, context) => {
  const domainId = await requireRouteParam(context, "zoneId");
  const recordId = await requireRouteParam(context, "recordId");
  return deleteDnsRecord(domainId, recordId);
});
