import { apiGet, apiMutation, parseJsonBody, requireRouteParam } from "@/lib/api/handlers";
import { getVncInfo, setVncPassword } from "@/lib/virtualizor/actions";
import { vncPasswordSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(async (_request, context) => getVncInfo(await requireRouteParam(context, "id")));

export const POST = apiMutation(async (request, context) => {
  const id = await requireRouteParam(context, "id");
  const { password } = await parseJsonBody(request, vncPasswordSchema);
  return setVncPassword(password, id);
});
