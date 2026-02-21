import { todayContributorSample } from "./sample-data";

export interface CalendarSessionFocus {
  sessionId: string;
  label: string;
  description: string;
}

const contributorLabelBySessionId = new Map(
  todayContributorSample.map((contributor) => [
    contributor.sessionId,
    contributor.label,
  ]),
);

export function normalizeSessionId(
  sessionId: string | string[] | undefined,
): string | undefined {
  const value = Array.isArray(sessionId) ? sessionId[0] : sessionId;

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : undefined;
}

export function resolveCalendarSessionFocus(
  sessionId: string,
): CalendarSessionFocus {
  const knownLabel = contributorLabelBySessionId.get(sessionId);

  if (knownLabel) {
    return {
      sessionId,
      label: knownLabel,
      description:
        "This completed session was selected from Today contributors and is now pinned for review.",
    };
  }

  return {
    sessionId,
    label: "Linked contributor session",
    description:
      "This session was linked from Today and can be traced by id until detailed calendar cards are available.",
  };
}
