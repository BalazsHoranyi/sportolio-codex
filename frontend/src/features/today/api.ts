import type {
  TodayAccumulationRequest,
  TodayAccumulationResponse,
} from "./types";

function defaultApiBaseUrl(): string | undefined {
  return process.env.SPORTOLO_API_BASE_URL;
}

function defaultAthleteId(): string {
  return process.env.SPORTOLO_DEMO_ATHLETE_ID ?? "athlete-1";
}

interface LoadTodaySnapshotOptions {
  request: TodayAccumulationRequest;
  athleteId?: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

function todayEndpoint(baseUrl: string, athleteId: string): string {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const path = `v1/athletes/${encodeURIComponent(athleteId)}/fatigue/today/accumulation`;

  return new URL(path, normalizedBaseUrl).toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function hasNumber(value: unknown, key: string): boolean {
  return isRecord(value) && typeof value[key] === "number";
}

function hasString(value: unknown, key: string): boolean {
  return isRecord(value) && typeof value[key] === "string";
}

function isFatigueAxes(value: unknown): boolean {
  return (
    hasNumber(value, "neural") &&
    hasNumber(value, "metabolic") &&
    hasNumber(value, "mechanical") &&
    hasNumber(value, "recruitment")
  );
}

function isCombinedScoreDebug(value: unknown): boolean {
  return (
    hasString(value, "workoutType") &&
    isRecord(value) &&
    typeof value.defaultSleepApplied === "boolean" &&
    isRecord(value.baseWeights) &&
    isRecord(value.modifierWeights) &&
    isRecord(value.effectiveWeights) &&
    hasNumber(value, "baseWeightedScore") &&
    hasNumber(value, "neuralGateFactor") &&
    hasNumber(value, "neuralGatedScore") &&
    hasNumber(value, "capacityGateFactor") &&
    hasNumber(value, "capacityGatedScore")
  );
}

function isTodayAccumulationResponse(
  value: unknown,
): value is TodayAccumulationResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasString(value, "asOf") &&
    isRecord(value.boundary) &&
    hasString(value.boundary, "boundaryStart") &&
    hasString(value.boundary, "boundaryEnd") &&
    hasString(value.boundary, "boundarySource") &&
    hasString(value.boundary, "timezone") &&
    Array.isArray(value.includedSessionIds) &&
    value.includedSessionIds.every(
      (sessionId) => typeof sessionId === "string",
    ) &&
    Array.isArray(value.excludedSessionIds) &&
    value.excludedSessionIds.every(
      (sessionId) => typeof sessionId === "string",
    ) &&
    isFatigueAxes(value.accumulatedFatigue) &&
    isRecord(value.combinedScore) &&
    hasNumber(value.combinedScore, "value") &&
    hasString(value.combinedScore, "interpretation") &&
    isCombinedScoreDebug(value.combinedScore.debug)
  );
}

export async function loadTodaySnapshot({
  request,
  athleteId,
  apiBaseUrl,
  fetchImpl = fetch,
}: LoadTodaySnapshotOptions): Promise<TodayAccumulationResponse | undefined> {
  const resolvedApiBaseUrl = apiBaseUrl ?? defaultApiBaseUrl();
  if (!resolvedApiBaseUrl) {
    return undefined;
  }

  const endpoint = todayEndpoint(
    resolvedApiBaseUrl,
    athleteId ?? defaultAthleteId(),
  );
  try {
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
    return isTodayAccumulationResponse(payload) ? payload : undefined;
  } catch {
    return undefined;
  }
}
