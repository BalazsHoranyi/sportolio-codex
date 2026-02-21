import type {
  ExplainabilityContributor,
  ScoreExplainability,
  TodayAccumulationResponse,
  TodayContributorSession,
} from "./types";

export type ThresholdState = "low" | "moderate" | "high";
export type GaugeId = "neural" | "metabolic" | "mechanical";

export interface AxisGaugeViewModel {
  id: GaugeId;
  label: string;
  value: number;
  percent: number;
  thresholdState: ThresholdState;
}

export interface WhyThisLink {
  sessionId: string;
  label: string;
  href: string;
  shareLabel?: string;
}

export interface ScoreExplainabilityViewModel {
  axisMeaning: string;
  decisionHint: string;
  contributors: WhyThisLink[];
}

export interface TodayDashboardViewModel {
  asOf: string;
  boundarySourceLabel: string;
  boundaryWindow: string;
  gauges: AxisGaugeViewModel[];
  scoreExplainability: {
    neural: ScoreExplainabilityViewModel;
    metabolic: ScoreExplainabilityViewModel;
    mechanical: ScoreExplainabilityViewModel;
    recruitment: ScoreExplainabilityViewModel;
    combined: ScoreExplainabilityViewModel;
  };
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

function formatDateTime(value: string, timezone: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
      timeZoneName: "short",
    }).format(date);
  } catch {
    return value;
  }
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

function toShareLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function byMagnitudeDesc(
  a: ExplainabilityContributor,
  b: ExplainabilityContributor,
): number {
  if (a.contributionMagnitude === b.contributionMagnitude) {
    return a.sessionId.localeCompare(b.sessionId);
  }
  return b.contributionMagnitude - a.contributionMagnitude;
}

function buildFallbackContributorLinks(
  includedSessionIds: string[],
  contributors?: TodayContributorSession[],
): WhyThisLink[] {
  if (!contributors || contributors.length < 1) {
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

function buildExplainabilityContributorLinks(
  explainabilityContributors: ExplainabilityContributor[],
  includedSessionIds: string[],
): WhyThisLink[] {
  if (explainabilityContributors.length < 1) {
    return [];
  }

  const includedSet = new Set(includedSessionIds);
  return explainabilityContributors
    .filter((contributor) => includedSet.has(contributor.sessionId))
    .sort(byMagnitudeDesc)
    .slice(0, 3)
    .map((contributor) => ({
      sessionId: contributor.sessionId,
      label: contributor.label,
      href: contributor.href ?? defaultSessionHref(contributor.sessionId),
      shareLabel: toShareLabel(contributor.contributionShare),
    }));
}

function resolveContributorLinks(
  explainabilityContributors: ExplainabilityContributor[],
  includedSessionIds: string[],
  contributors?: TodayContributorSession[],
): WhyThisLink[] {
  const explainabilityLinks = buildExplainabilityContributorLinks(
    explainabilityContributors,
    includedSessionIds,
  );

  if (explainabilityLinks.length > 0) {
    return explainabilityLinks;
  }

  return buildFallbackContributorLinks(includedSessionIds, contributors).slice(
    0,
    3,
  );
}

function buildScoreExplainabilityViewModel(
  explainability: ScoreExplainability,
  includedSessionIds: string[],
  contributors?: TodayContributorSession[],
): ScoreExplainabilityViewModel {
  return {
    axisMeaning: explainability.axisMeaning,
    decisionHint: explainability.decisionHint,
    contributors: resolveContributorLinks(
      explainability.contributors,
      includedSessionIds,
      contributors,
    ),
  };
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
    asOf: formatDateTime(snapshot.asOf, snapshot.boundary.timezone),
    boundarySourceLabel: mapBoundarySource(snapshot.boundary.boundarySource),
    boundaryWindow: `${formatDateTime(snapshot.boundary.boundaryStart, snapshot.boundary.timezone)} to ${formatDateTime(snapshot.boundary.boundaryEnd, snapshot.boundary.timezone)}`,
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
    scoreExplainability: {
      neural: buildScoreExplainabilityViewModel(
        snapshot.explainability.neural,
        snapshot.includedSessionIds,
        contributors,
      ),
      metabolic: buildScoreExplainabilityViewModel(
        snapshot.explainability.metabolic,
        snapshot.includedSessionIds,
        contributors,
      ),
      mechanical: buildScoreExplainabilityViewModel(
        snapshot.explainability.mechanical,
        snapshot.includedSessionIds,
        contributors,
      ),
      recruitment: buildScoreExplainabilityViewModel(
        snapshot.explainability.recruitment,
        snapshot.includedSessionIds,
        contributors,
      ),
      combined: buildScoreExplainabilityViewModel(
        snapshot.explainability.combined,
        snapshot.includedSessionIds,
        contributors,
      ),
    },
    recruitmentValue: recruitment,
    recruitmentState: toThresholdState(recruitment),
    combinedScoreValue: combinedScore,
    combinedThresholdState: toThresholdState(combinedScore),
    combinedInterpretation: snapshot.combinedScore.interpretation,
    capacityFactor,
    capacityState,
    capacityLabel: toCapacityLabel(capacityState),
    whyThisLinks: resolveContributorLinks(
      snapshot.explainability.combined.contributors,
      snapshot.includedSessionIds,
      contributors,
    ),
  };
}
