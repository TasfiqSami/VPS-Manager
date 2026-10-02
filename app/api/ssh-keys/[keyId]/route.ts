import { apiMutation, parseJsonBody, requireRouteParam } from "@/lib/api/handlers";
import { deleteSshKey, editSshKey } from "@/lib/virtualizor/actions";
import { sshKeySchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PUT = apiMutation(async (request, context) => {
  const keyId = await requireRouteParam(context, "keyId");
  const input = await parseJsonBody(request, sshKeySchema);
  return editSshKey({ ...input, keyId });
});

export const DELETE = apiMutation(async (_request, context) =>
  deleteSshKey(await requireRouteParam(context, "keyId")),
);
