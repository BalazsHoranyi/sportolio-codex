import type { SearchableExerciseCatalogItem } from "./state";

interface ExerciseCatalogResponse {
  items: SearchableExerciseCatalogItem[];
}

interface LoadExerciseCatalogOptions {
  endpoint?: string;
  scope?: "global" | "user" | "all";
  searchText?: string;
  equipment?: string;
  muscle?: string;
  fetchImpl?: typeof fetch;
}

function buildCatalogQueryUrl({
  endpoint,
  scope,
  searchText,
  equipment,
  muscle,
}: {
  endpoint: string;
  scope: "global" | "user" | "all";
  searchText?: string;
  equipment?: string;
  muscle?: string;
}): string {
  const params = new URLSearchParams();
  params.set("scope", scope);

  const trimmedSearch = searchText?.trim();
  if (trimmedSearch) {
    params.set("search", trimmedSearch);
  }
  if (equipment && equipment !== "all") {
    params.set("equipment", equipment);
  }
  if (muscle && muscle !== "all") {
    params.set("muscle", muscle);
  }

  const query = params.toString();
  if (!query) {
    return endpoint;
  }
  return `${endpoint}?${query}`;
}

function isSearchableExerciseCatalogItem(
  value: unknown,
): value is SearchableExerciseCatalogItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SearchableExerciseCatalogItem>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.canonicalName === "string" &&
    Array.isArray(candidate.aliases) &&
    candidate.aliases.every((alias) => typeof alias === "string") &&
    Array.isArray(candidate.regionTags) &&
    candidate.regionTags.every((tag) => typeof tag === "string") &&
    Array.isArray(candidate.equipmentOptions) &&
    candidate.equipmentOptions.every((option) => typeof option === "string")
  );
}

export function isExerciseCatalogResponse(
  value: unknown,
): value is ExerciseCatalogResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ExerciseCatalogResponse>;
  return (
    Array.isArray(candidate.items) &&
    candidate.items.every((item) => isSearchableExerciseCatalogItem(item))
  );
}

export async function loadExerciseCatalog({
  endpoint = "/api/exercises",
  scope = "all",
  searchText,
  equipment,
  muscle,
  fetchImpl = fetch,
}: LoadExerciseCatalogOptions): Promise<SearchableExerciseCatalogItem[]> {
  const queryUrl = buildCatalogQueryUrl({
    endpoint,
    scope,
    searchText,
    equipment,
    muscle,
  });
  const response = await fetchImpl(queryUrl, { cache: "no-store" });
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as unknown;
  return isExerciseCatalogResponse(payload) ? payload.items : [];
}
