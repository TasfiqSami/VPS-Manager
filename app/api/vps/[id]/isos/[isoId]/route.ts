import { apiMutation, requireRouteParam } from "@/lib/api/handlers";
import { deleteIso } from "@/lib/virtualizor/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = apiMutation(async (_request, context) => {
  const id = await requireRouteParam(context, "id");
  const isoId = await requireRouteParam(context, "isoId");
  return deleteIso(isoId, id);
});
