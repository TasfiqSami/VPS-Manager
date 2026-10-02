import { z } from "zod";

import { apiMutation, parseJsonBody, requireRouteParam } from "@/lib/api/handlers";
import { disableRescue, enableRescue } from "@/lib/virtualizor/actions";
import { passwordSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = apiMutation(async (request, context) => {
  const id = await requireRouteParam(context, "id");
  const { password } = await parseJsonBody(request, z.object({ password: passwordSchema }));
  return enableRescue(password, id);
});

export const DELETE = apiMutation(async (_request, context) => disableRescue(await requireRouteParam(context, "id")));
