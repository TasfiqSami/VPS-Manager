import { apiGet, apiMutation, parseJsonBody } from "@/lib/api/handlers";
import { addSshKey, getSshKeys } from "@/lib/virtualizor/actions";
import { sshKeySchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(() => getSshKeys());

export const POST = apiMutation(async (request) => {
  const input = await parseJsonBody(request, sshKeySchema);
  return addSshKey(input);
});
