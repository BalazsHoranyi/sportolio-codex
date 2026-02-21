import type {
  TodayAccumulationResponse,
  TodayContributorSession,
} from "./types";

export type ThresholdState = "low" | "moderate" | "high";

export interface AxisGaugeViewModel {
  id: string;
  label: string;
  value: number;
  percent: number;
  thresholdState: ThresholdState;
}

export interface WhyThisLink {
  sessionId: string;
  label: string;
  href: string;
}

export interface TodayDashboardViewModel {
  asOf: string;
  boundarySourceLabel: string;
  boundaryWindow: string;
  gauges: AxisGaugeViewModel[];
  recruitmentValue: number;
  recruitmentState: ThresholdState;
  combinedScoreValue: number;
  combinedThresholdState: ThresholdState;
  combinedInterpretation: string;
  capacityFactor: number;
  capacityState: ThresholdState;
  capacityLabel: string;
  whyThisLinks: WhyThisLink[];
}

function toThresholdState(value: number): ThresholdState {
  if (value >= 7) {
    return "high";
  }
  if (value >= 4) {
    return "moderate";
  }
  return "low";
}

function clampScore(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 10) {
    return 10;
  }
  return value;
}

function mapBoundarySource(boundarySource: string): string {
  return boundarySource === "sleep_event"
    ? "Sleep event rollover"
    : "Local midnight rollover";
}

function toCapacityState(factor: number): ThresholdState {
  if (factor >= 1.1) {
    return "high";
  }
  if (factor >= 1) {
    return "moderate";
  }
  return "low";
}

function toCapacityLabel(state: ThresholdState): string {
  if (state === "high") {
    return "Limited capacity";
  }
  if (state === "moderate") {
    return "Constrained capacity";
  }
  return "Ready capacity";
}

function defaultSessionHref(sessionId: string): string {
  return `/calendar?sessionId=${encodeURIComponent(sessionId)}`;
}

function buildWhyThisLinks(
  includedSessionIds: string[],
  contributors?: TodayContributorSession[],
): WhyThisLink[] {
  if (!contributors || contributors.length === 0) {
    return includedSessionIds.map((sessionId) => ({
      sessionId,
      label: sessionId,
      href: defaultSessionHref(sessionId),
    }));
  }

  const includedSet = new Set(includedSessionIds);
  return contributors
    .filter((contributor) => includedSet.has(contributor.sessionId))
    .map((contributor) => ({
      sessionId: contributor.sessionId,
      label: contributor.label,
      href: contributor.href ?? defaultSessionHref(contributor.sessionId),
    }));
}

export function buildTodayDashboardViewModel(
  snapshot: TodayAccumulationResponse,
  contributors?: TodayContributorSession[],
): TodayDashboardViewModel {
  const neural = clampScore(snapshot.accumulatedFatigue.neural);
  const metabolic = clampScore(snapshot.accumulatedFatigue.metabolic);
  const mechanical = clampScore(snapshot.accumulatedFatigue.mechanical);
  const recruitment = clampScore(snapshot.accumulatedFatigue.recruitment);
  const combinedScore = clampScore(snapshot.combinedScore.value);
  const capacityFactor = Number(
    snapshot.combinedScore.debug.capacityGateFactor.toFixed(2),
  );
  const capacityState = toCapacityState(capacityFactor);

  return {
    asOf: snapshot.asOf,
    boundarySourceLabel: mapBoundarySource(snapshot.boundary.boundarySource),
    boundaryWindow: `${snapshot.boundary.boundaryStart} -> ${snapshot.boundary.boundaryEnd}`,
    gauges: [
      {
        id: "neural",
        label: "Neural",
        value: neural,
        percent: (neural / 10) * 100,
        thresholdState: toThresholdState(neural),
      },
      {
        id: "metabolic",
        label: "Metabolic",
        value: metabolic,
        percent: (metabolic / 10) * 100,
        thresholdState: toThresholdState(metabolic),
      },
      {
        id: "mechanical",
        label: "Mechanical",
        value: mechanical,
        percent: (mechanical / 10) * 100,
        thresholdState: toThresholdState(mechanical),
      },
    ],
    recruitmentValue: recruitment,
    recruitmentState: toThresholdState(recruitment),
    combinedScoreValue: combinedScore,
    combinedThresholdState: toThresholdState(combinedScore),
    combinedInterpretation: snapshot.combinedScore.interpretation,
    capacityFactor,
    capacityState,
    capacityLabel: toCapacityLabel(capacityState),
    whyThisLinks: buildWhyThisLinks(snapshot.includedSessionIds, contributors),
  };
}
