import { apiGet, apiMutation } from "@/lib/api/handlers";
import { createApiKey, getApiKeys } from "@/lib/virtualizor/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(() => getApiKeys());

export const POST = apiMutation(() => createApiKey());
