import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  buildLoginRedirect,
  sanitizeRedirectTarget,
} from "./features/auth/redirect";
import {
  getSessionFromToken,
  SESSION_COOKIE_NAME,
} from "./features/auth/session";

function isPublicAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await getSessionFromToken(token) : null;

  if (pathname.startsWith("/api/")) {
    if (session) {
      return NextResponse.next();
    }

    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  if (pathname === "/login") {
    if (!session) {
      return NextResponse.next();
    }

    const redirectTarget = sanitizeRedirectTarget(
      request.nextUrl.searchParams.get("next"),
    );
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  }

  if (!session) {
    const loginRedirect = buildLoginRedirect(pathname, search);
    return NextResponse.redirect(new URL(loginRedirect, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
