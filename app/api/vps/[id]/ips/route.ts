import { apiGet, requireRouteParam } from "@/lib/api/handlers";
import { getIps } from "@/lib/virtualizor/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(async (_request, context) => getIps(await requireRouteParam(context, "id")));
