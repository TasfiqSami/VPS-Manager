import { apiMutation, requireRouteParam } from "@/lib/api/handlers";
import { deleteApiKey } from "@/lib/virtualizor/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = apiMutation(async (_request, context) => deleteApiKey(await requireRouteParam(context, "keyId")));
