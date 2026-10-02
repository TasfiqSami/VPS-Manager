import { apiMutation, requireRouteParam } from "@/lib/api/handlers";
import { deleteDnsZone } from "@/lib/virtualizor/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = apiMutation(async (_request, context) =>
  deleteDnsZone(await requireRouteParam(context, "zoneId")),
);
