import { apiGet, apiMutation, parseJsonBody, requireRouteParam } from "@/lib/api/handlers";
import { addDnsRecord, getZoneRecords } from "@/lib/virtualizor/actions";
import { dnsRecordSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(async (_request, context) => getZoneRecords(await requireRouteParam(context, "zoneId")));

export const POST = apiMutation(async (request, context) => {
  const domainId = await requireRouteParam(context, "zoneId");
  const input = await parseJsonBody(request, dnsRecordSchema.omit({ domainId: true }));
  return addDnsRecord({ ...input, domainId });
});
