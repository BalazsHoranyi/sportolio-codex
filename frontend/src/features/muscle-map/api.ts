import type { MicrocycleUsageRequest, MuscleUsageApiResponse } from "./types";

const DEFAULT_API_BASE_URL = process.env.SPORTOLO_API_BASE_URL;
const DEFAULT_ATHLETE_ID = process.env.SPORTOLO_DEMO_ATHLETE_ID ?? "athlete-1";

interface LoadMuscleUsageResponseOptions {
  request: MicrocycleUsageRequest;
  athleteId?: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

function toEndpoint(baseUrl: string, athleteId: string): string {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const endpoint = `v1/athletes/${encodeURIComponent(athleteId)}/muscle-usage/aggregate`;

  return new URL(endpoint, normalizedBaseUrl).toString();
}

function isMuscleUsageApiResponse(
  value: unknown,
): value is MuscleUsageApiResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<MuscleUsageApiResponse>;
  return (
    Array.isArray(candidate.exerciseSummaries) &&
    Array.isArray(candidate.routineSummaries) &&
    !!candidate.microcycleSummary &&
    typeof candidate.microcycleSummary === "object"
  );
}

export async function loadMuscleUsageResponse({
  request,
  athleteId = DEFAULT_ATHLETE_ID,
  apiBaseUrl = DEFAULT_API_BASE_URL,
  fetchImpl = fetch,
}: LoadMuscleUsageResponseOptions): Promise<
  MuscleUsageApiResponse | undefined
> {
  if (!apiBaseUrl) {
    return undefined;
  }

  const endpoint = toEndpoint(apiBaseUrl, athleteId);
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
    cache: "no-store",
  });

  if (!response.ok) {
    return undefined;
  }

  const payload = (await response.json()) as unknown;
  return isMuscleUsageApiResponse(payload) ? payload : undefined;
}
