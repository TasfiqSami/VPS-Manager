import { apiGet } from "@/lib/api/handlers";
import { getDnsZones } from "@/lib/virtualizor/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(() => getDnsZones());
