import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE, getAuthConfig, verifySessionToken } from "@/lib/auth";
import { createRequestId } from "@/lib/api/handlers";
import { jsonSuccess } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const requestId = createRequestId();
  const config = getAuthConfig();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const authenticated = config.mode === "dev-open" ? true : await verifySessionToken(token);

  return jsonSuccess(
    {
      authenticated,
      mode: config.mode,
      reason: config.reason,
      sessionSeconds: config.sessionSeconds,
    },
    requestId,
  );
}
