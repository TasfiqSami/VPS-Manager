import { NextResponse, type NextRequest } from "next/server";

import { createSessionToken, getAuthConfig, sessionCookieOptions, verifyPassword, SESSION_COOKIE } from "@/lib/auth";
import { createRequestId, parseJsonBody } from "@/lib/api/handlers";
import { logger } from "@/lib/api/logger";
import { enforceRateLimit, getClientKey, getLoginRule } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/api/errors";
import { loginSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = createRequestId();
  try {
    const config = getAuthConfig();
    if (config.mode === "blocked") {
      throw new AppError({ code: "AUTH_CONFIG", message: config.reason ?? "Authentication is not configured." });
    }
    if (config.mode === "dev-open") {
      return jsonSuccess({ authenticated: true, mode: config.mode }, requestId);
    }

    enforceRateLimit(`login:${getClientKey(request.headers)}`, getLoginRule());

    const { password } = await parseJsonBody(request, loginSchema);
    if (!verifyPassword(password)) {
      logger.warn("login_failed", { requestId });
      throw new AppError({ code: "AUTH_REQUIRED", message: "Incorrect password." });
    }

    const token = await createSessionToken(config.sessionSeconds);
    if (!token) {
      throw new AppError({ code: "AUTH_CONFIG", message: "Unable to create a session. Check AUTH_SECRET." });
    }

    const forwardedProto = request.headers.get("x-forwarded-proto");
    const secure = forwardedProto ? forwardedProto.split(",")[0]?.trim() === "https" : request.nextUrl.protocol === "https:";
    const response = jsonSuccess({ authenticated: true, mode: config.mode }, requestId);
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(config.sessionSeconds, secure));
    logger.info("login_succeeded", { requestId });
    return response;
  } catch (error) {
    return jsonError(error, requestId);
  }
}
