import { NextResponse } from "next/server";

import {
  getSessionFromToken,
  readCookieValue,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "../../../../features/auth/session";

function noStoreHeaders(): HeadersInit {
  return {
    "cache-control": "no-store",
  };
}

export async function GET(request: Request): Promise<Response> {
  const token = readCookieValue(
    request.headers.get("cookie"),
    SESSION_COOKIE_NAME,
  );

  if (!token) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  const user = await getSessionFromToken(token);
  if (!user) {
    const response = NextResponse.json(
      { authenticated: false },
      { status: 401, headers: noStoreHeaders() },
    );

    response.cookies.set(SESSION_COOKIE_NAME, "", {
      ...sessionCookieOptions,
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  }

  return NextResponse.json(
    { authenticated: true, user },
    { headers: noStoreHeaders() },
  );
}
