import type { WeeklyAuditApiResponse } from "./types";

function defaultApiBaseUrl(): string | undefined {
  return process.env.SPORTOLO_API_BASE_URL;
}

function defaultAthleteId(): string {
  return process.env.SPORTOLO_DEMO_ATHLETE_ID ?? "athlete-1";
}

function defaultStartDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface LoadWeeklyAuditResponseOptions {
  startDate?: string;
  athleteId?: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

function weeklyAuditEndpoint(
  baseUrl: string,
  athleteId: string,
  startDate: string,
): string {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const path = `v1/athletes/${encodeURIComponent(athleteId)}/calendar/weekly-audit`;
  const endpoint = new URL(path, normalizedBaseUrl);

  endpoint.searchParams.set("startDate", startDate);
  return endpoint.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function hasString(value: unknown, key: string): boolean {
  return isRecord(value) && typeof value[key] === "string";
}

function hasNumber(value: unknown, key: string): boolean {
  return isRecord(value) && typeof value[key] === "number";
}

function hasValidThresholdZoneState(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.thresholdZoneState === undefined ||
    value.thresholdZoneState === "low" ||
    value.thresholdZoneState === "moderate" ||
    value.thresholdZoneState === "high"
  );
}

function isContributor(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasString(value, "sessionId") &&
    hasString(value, "label") &&
    (value.href === undefined || typeof value.href === "string")
  );
}

function isAuditPoint(value: unknown): boolean {
  return (
    hasString(value, "date") &&
    isRecord(value) &&
    isRecord(value.completedAxes) &&
    hasNumber(value.completedAxes, "neural") &&
    hasNumber(value.completedAxes, "metabolic") &&
    hasNumber(value.completedAxes, "mechanical") &&
    hasNumber(value, "recruitmentOverlay") &&
    hasValidThresholdZoneState(value) &&
    Array.isArray(value.contributors) &&
    value.contributors.every((contributor) => isContributor(contributor))
  );
}

function isWeeklyAuditApiResponse(
  value: unknown,
): value is WeeklyAuditApiResponse {
  return (
    isRecord(value) &&
    hasString(value, "startDate") &&
    Array.isArray(value.points) &&
    value.points.every((point) => isAuditPoint(point))
  );
}

export async function loadWeeklyAuditResponse({
  startDate = defaultStartDate(),
  athleteId,
  apiBaseUrl,
  fetchImpl = fetch,
}: LoadWeeklyAuditResponseOptions): Promise<
  WeeklyAuditApiResponse | undefined
> {
  const resolvedApiBaseUrl = apiBaseUrl ?? defaultApiBaseUrl();
  if (!resolvedApiBaseUrl) {
    return undefined;
  }

  const endpoint = weeklyAuditEndpoint(
    resolvedApiBaseUrl,
    athleteId ?? defaultAthleteId(),
    startDate,
  );

  try {
    const response = await fetchImpl(endpoint, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as unknown;
    return isWeeklyAuditApiResponse(payload) ? payload : undefined;
  } catch {
    return undefined;
  }
}
