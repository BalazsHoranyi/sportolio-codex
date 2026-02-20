import { NextResponse } from "next/server";

import { validateCredentials } from "../../../../features/auth/credentials";
import { sanitizeRedirectTarget } from "../../../../features/auth/redirect";
import {
  createSessionToken,
  SessionConfigurationError,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "../../../../features/auth/session";

interface LoginRequestBody {
  email?: unknown;
  password?: unknown;
  next?: unknown;
}

function noStoreHeaders(): HeadersInit {
  return {
    "cache-control": "no-store",
  };
}

function parseBody(value: unknown): LoginRequestBody {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as LoginRequestBody;
}

export async function POST(request: Request): Promise<Response> {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  const body = parseBody(rawBody);
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const next = typeof body.next === "string" ? body.next : undefined;

  const user = validateCredentials({ email, password });
  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  let sessionToken: string;
  try {
    sessionToken = await createSessionToken(user);
  } catch (error) {
    if (error instanceof SessionConfigurationError) {
      return NextResponse.json(
        { error: "Unable to sign in right now. Please try again." },
        { status: 503, headers: noStoreHeaders() },
      );
    }

    throw error;
  }

  const response = NextResponse.json(
    {
      authenticated: true,
      user,
      redirectTo: sanitizeRedirectTarget(next),
    },
    { headers: noStoreHeaders() },
  );

  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions);

  return response;
}
