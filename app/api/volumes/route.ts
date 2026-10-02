import { apiGet, apiMutation, parseJsonBody } from "@/lib/api/handlers";
import { addVolume, getVolumes } from "@/lib/virtualizor/actions";
import { volumeSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(() => getVolumes());

export const POST = apiMutation(async (request) => {
  const input = await parseJsonBody(request, volumeSchema);
  const vpsId = request.nextUrl.searchParams.get("vpsId") ?? undefined;
  return addVolume(input, vpsId);
});
