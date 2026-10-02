import { apiMutation, parseJsonBody, requireRouteParam } from "@/lib/api/handlers";
import { applySshKeys } from "@/lib/virtualizor/actions";
import { applySshKeysSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = apiMutation(async (request, context) => {
  const id = await requireRouteParam(context, "id");
  const { keyIds } = await parseJsonBody(request, applySshKeysSchema);
  return applySshKeys(keyIds.map((keyId) => String(keyId)), id);
});
