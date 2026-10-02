import { apiGet, apiMutation, parseJsonBody, requireRouteParam } from "@/lib/api/handlers";
import { getReinstallOptions, reinstallOs } from "@/lib/virtualizor/actions";
import { osReinstallSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(async (_request, context) => getReinstallOptions(await requireRouteParam(context, "id")));

export const POST = apiMutation(async (request, context) => {
  const id = await requireRouteParam(context, "id");
  const input = await parseJsonBody(request, osReinstallSchema);
  return reinstallOs(
    { osId: input.osId, newPassword: input.newPassword, rebuildSshKey: input.rebuildSshKey },
    id,
  );
});
