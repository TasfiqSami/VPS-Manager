import { apiGet } from "@/lib/api/handlers";
import { detectCapabilities } from "@/lib/virtualizor/capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(() => detectCapabilities());
