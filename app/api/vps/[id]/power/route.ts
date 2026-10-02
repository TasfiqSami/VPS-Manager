import { apiMutation, parseJsonBody, requireRouteParam } from "@/lib/api/handlers";
import { powerAction } from "@/lib/virtualizor/actions";
import { powerActionSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = apiMutation(async (request, context) => {
  const id = await requireRouteParam(context, "id");
  const { action } = await parseJsonBody(request, powerActionSchema);
  return powerAction(action, id);
});
