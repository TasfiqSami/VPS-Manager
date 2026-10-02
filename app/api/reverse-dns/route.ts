import { apiGet, apiMutation, parseJsonBody } from "@/lib/api/handlers";
import { addReverseDns, getReverseDns } from "@/lib/virtualizor/actions";
import { reverseDnsSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(() => getReverseDns());

export const POST = apiMutation(async (request) => {
  const { ip, domain } = await parseJsonBody(request, reverseDnsSchema);
  return addReverseDns(ip, domain);
});
