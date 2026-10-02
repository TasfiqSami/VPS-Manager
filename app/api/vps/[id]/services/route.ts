import { apiGet, apiMutation, parseJsonBody, requireRouteParam } from "@/lib/api/handlers";
import { getServices, manageService } from "@/lib/virtualizor/actions";
import { serviceActionSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(async (_request, context) => getServices(await requireRouteParam(context, "id")));

export const POST = apiMutation(async (request, context) => {
  const id = await requireRouteParam(context, "id");
  const { action, services } = await parseJsonBody(request, serviceActionSchema);
  return manageService(action, services, id);
});
