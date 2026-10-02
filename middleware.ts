import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, getAuthConfig, verifySessionToken } from "@/lib/auth";

const PUBLIC_API_PREFIXES = ["/api/auth/login", "/api/auth/logout", "/api/auth/session", "/api/health"];
const PUBLIC_PAGE_PATHS = ["/login"];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGE_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (isAsset(pathname)) {
    return NextResponse.next();
  }

  const config = getAuthConfig();
  const isApi = pathname.startsWith("/api/");

  if (config.mode === "dev-open") {
    return NextResponse.next();
  }

  if (config.mode === "blocked") {
    if (isApi && !isPublicApi(pathname)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "AUTH_CONFIG",
            message: config.reason ?? "Dashboard authentication is not configured.",
            requestId: "middleware",
          },
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await verifySessionToken(token);

  if (authenticated) {
    if (isPublicPage(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isApi) {
    if (isPublicApi(pathname)) return NextResponse.next();
    return NextResponse.json(
      {
        success: false,
        error: { code: "AUTH_REQUIRED", message: "Authentication required.", requestId: "middleware" },
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (isPublicPage(pathname)) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
