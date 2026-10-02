import { apiGet, requireRouteParam } from "@/lib/api/handlers";
import { getTasks } from "@/lib/virtualizor/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(async (_request, context) => getTasks(await requireRouteParam(context, "id")));
