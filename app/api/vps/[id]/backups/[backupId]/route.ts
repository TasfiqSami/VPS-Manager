import { apiMutation, requireRouteParam } from "@/lib/api/handlers";
import { deleteBackup, restoreBackup } from "@/lib/virtualizor/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = apiMutation(async (_request, context) => {
  const id = await requireRouteParam(context, "id");
  const backupId = await requireRouteParam(context, "backupId");
  return deleteBackup(backupId, id);
});

export const POST = apiMutation(async (_request, context) => {
  const id = await requireRouteParam(context, "id");
  const backupId = await requireRouteParam(context, "backupId");
  return restoreBackup(backupId, id);
});
