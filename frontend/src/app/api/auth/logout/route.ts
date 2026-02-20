import { NextResponse } from "next/server";

import { sanitizeRedirectTarget } from "../../../../features/auth/redirect";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "../../../../features/auth/session";

export async function POST(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const redirectTarget = sanitizeRedirectTarget(
    requestUrl.searchParams.get("redirect"),
    "/login",
  );

  const response = NextResponse.redirect(
    new URL(redirectTarget, request.url),
    303,
  );

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions,
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
