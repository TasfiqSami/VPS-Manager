import { apiMutation, requireRouteParam } from "@/lib/api/handlers";
import { deleteReverseDns } from "@/lib/virtualizor/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = apiMutation(async (_request, context) =>
  deleteReverseDns(await requireRouteParam(context, "recordId")),
);
