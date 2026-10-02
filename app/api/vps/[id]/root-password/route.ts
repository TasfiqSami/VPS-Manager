import { apiMutation, parseJsonBody, requireRouteParam } from "@/lib/api/handlers";
import { changeRootPassword } from "@/lib/virtualizor/actions";
import { passwordChangeSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = apiMutation(async (request, context) => {
  const id = await requireRouteParam(context, "id");
  const { newPassword } = await parseJsonBody(request, passwordChangeSchema);
  return changeRootPassword(newPassword, id);
});
