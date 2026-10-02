import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth";
import { createRequestId } from "@/lib/api/handlers";
import { jsonSuccess } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const requestId = createRequestId();
  const response = jsonSuccess({ authenticated: false }, requestId);
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
