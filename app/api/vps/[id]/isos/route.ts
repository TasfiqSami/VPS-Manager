import { apiGet, apiMutation, parseJsonBody, requireRouteParam } from "@/lib/api/handlers";
import { addIso, getIsos } from "@/lib/virtualizor/actions";
import { isoAddSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(async (_request, context) => getIsos(await requireRouteParam(context, "id")));

export const POST = apiMutation(async (request, context) => {
  const id = await requireRouteParam(context, "id");
  const input = await parseJsonBody(request, isoAddSchema);
  return addIso(input, id);
});
