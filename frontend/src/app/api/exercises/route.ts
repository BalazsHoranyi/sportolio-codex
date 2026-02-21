import { NextRequest, NextResponse } from "next/server";

const DEFAULT_API_BASE_URL = "http://localhost:8000";

function buildBackendCatalogUrl(request: NextRequest): string {
  const backendBaseUrl =
    process.env.SPORTOLO_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  const normalizedBaseUrl = backendBaseUrl.endsWith("/")
    ? backendBaseUrl
    : `${backendBaseUrl}/`;
  const endpoint = new URL("v1/exercises", normalizedBaseUrl);

  const allowedParams = ["scope", "search", "equipment", "muscle"];
  for (const key of allowedParams) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) {
      endpoint.searchParams.set(key, value);
    }
  }

  if (!endpoint.searchParams.has("scope")) {
    endpoint.searchParams.set("scope", "all");
  }

  return endpoint.toString();
}

export async function GET(request: NextRequest) {
  const backendUrl = buildBackendCatalogUrl(request);

  try {
    const response = await fetch(backendUrl, {
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ items: [] });
    }

    const payload = (await response.json()) as unknown;
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ items: [] });
  }
}
