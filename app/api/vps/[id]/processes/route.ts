import { apiGet, apiMutation, parseJsonBody, requireRouteParam } from "@/lib/api/handlers";
import { getProcesses, killProcesses } from "@/lib/virtualizor/actions";
import { killProcessSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(async (_request, context) => getProcesses(await requireRouteParam(context, "id")));

export const POST = apiMutation(async (request, context) => {
  const id = await requireRouteParam(context, "id");
  const { pids } = await parseJsonBody(request, killProcessSchema);
  return killProcesses(
    pids.map((pid) => String(pid)),
    id,
  );
});
