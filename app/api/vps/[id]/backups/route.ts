import { apiGet, apiMutation, requireRouteParam } from "@/lib/api/handlers";
import { createBackup, getBackups } from "@/lib/virtualizor/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(async (_request, context) => getBackups(await requireRouteParam(context, "id")));

export const POST = apiMutation(async (_request, context) => createBackup(await requireRouteParam(context, "id")));
