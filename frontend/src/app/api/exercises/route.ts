import { NextRequest, NextResponse } from "next/server";

import fallbackCatalog from "../../../features/exercise-picker/fallback-catalog.json";
import { isExerciseCatalogResponse } from "../../../features/exercise-picker/api";
import { filterAndRankExercises } from "../../../features/exercise-picker/state";
import type { SearchableExerciseCatalogItem } from "../../../features/exercise-picker/state";

const DEFAULT_API_BASE_URL = "http://localhost:8000";
const fallbackCatalogItems =
  fallbackCatalog as unknown as SearchableExerciseCatalogItem[];

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

function fallbackFilteredCatalog(
  request: NextRequest,
): SearchableExerciseCatalogItem[] {
  const scope = request.nextUrl.searchParams.get("scope");
  if (scope === "user") {
    return [];
  }

  const searchText = request.nextUrl.searchParams.get("search") ?? "";
  const equipmentFilter =
    request.nextUrl.searchParams.get("equipment") ?? "all";
  const muscleFilter = request.nextUrl.searchParams.get("muscle") ?? "all";

  return filterAndRankExercises({
    catalog: fallbackCatalogItems,
    searchText,
    equipmentFilter,
    muscleFilter,
  });
}

export async function GET(request: NextRequest) {
  const backendUrl = buildBackendCatalogUrl(request);

  try {
    const response = await fetch(backendUrl, {
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({
        items: fallbackFilteredCatalog(request),
      });
    }

    const payload = (await response.json()) as unknown;
    if (isExerciseCatalogResponse(payload)) {
      return NextResponse.json(payload);
    }

    return NextResponse.json({
      items: fallbackFilteredCatalog(request),
    });
  } catch {
    return NextResponse.json({
      items: fallbackFilteredCatalog(request),
    });
  }
}
