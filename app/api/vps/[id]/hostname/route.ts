import { z } from "zod";

import { apiMutation, parseJsonBody, requireRouteParam } from "@/lib/api/handlers";
import { changeHostname } from "@/lib/virtualizor/actions";
import { hostnameSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = apiMutation(async (request, context) => {
  const id = await requireRouteParam(context, "id");
  const { hostname } = await parseJsonBody(request, z.object({ hostname: hostnameSchema }));
  return changeHostname(hostname, id);
});
