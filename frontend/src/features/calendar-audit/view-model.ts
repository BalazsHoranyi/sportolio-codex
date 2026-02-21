import type {
  WeeklyAuditApiResponse,
  WeeklyAuditContributor,
  WeeklyAuditPoint,
} from "./types";

const CHART_MIN = 0;
const CHART_MAX = 10;
const THRESHOLD_VALUE = 7;
const CHART_WIDTH = 720;
const CHART_HEIGHT = 320;
const PAD_LEFT = 56;
const PAD_RIGHT = 28;
const PAD_TOP = 24;
const PAD_BOTTOM = 42;
const RECRUITMENT_BAND_RADIUS = 0.45;
const WINDOW_DAYS = 7;

export interface WeeklyAuditSeriesPoint {
  id: string;
  date: string;
  label: string;
  x: number;
  y: number;
  value: number;
  isHighRisk: boolean;
}

export interface WeeklyAuditPointViewModel {
  id: string;
  date: string;
  label: string;
  x: number;
  neural: number;
  metabolic: number;
  mechanical: number;
  recruitment: number;
  contributors: Required<WeeklyAuditContributor>[];
}

export interface WeeklyAuditViewModel {
  width: number;
  height: number;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  thresholdValue: number;
  thresholdY: number;
  points: WeeklyAuditPointViewModel[];
  series: {
    neural: WeeklyAuditSeriesPoint[];
    metabolic: WeeklyAuditSeriesPoint[];
    mechanical: WeeklyAuditSeriesPoint[];
  };
  neuralPath: string;
  metabolicPath: string;
  mechanicalPath: string;
  recruitmentBandPath: string;
}

function clampScore(value: number): number {
  if (value < CHART_MIN) {
    return CHART_MIN;
  }
  if (value > CHART_MAX) {
    return CHART_MAX;
  }
  return value;
}

function parseIsoDay(value: string): Date | undefined {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateLabel(isoDay: string): string {
  const parsed = parseIsoDay(isoDay);
  if (!parsed) {
    return isoDay;
  }
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function defaultContributorHref(sessionId: string): string {
  return `/calendar?sessionId=${encodeURIComponent(sessionId)}`;
}

function normalizeContributors(
  contributors: WeeklyAuditContributor[],
): Required<WeeklyAuditContributor>[] {
  return contributors.map((contributor) => ({
    ...contributor,
    href: contributor.href ?? defaultContributorHref(contributor.sessionId),
  }));
}

function normalizeWindowPoints(
  response: WeeklyAuditApiResponse,
): WeeklyAuditPoint[] {
  const byDate = new Map<string, WeeklyAuditPoint>(
    response.points.map((point) => [point.date, point]),
  );

  const startDate =
    parseIsoDay(response.startDate) ?? new Date("2026-01-01T00:00:00Z");
  const points: WeeklyAuditPoint[] = [];

  for (let dayIndex = 0; dayIndex < WINDOW_DAYS; dayIndex += 1) {
    const date = new Date(startDate.getTime());
    date.setUTCDate(startDate.getUTCDate() + dayIndex);

    const isoDay = formatIsoDay(date);
    const point = byDate.get(isoDay);
    points.push(
      point ?? {
        date: isoDay,
        completedAxes: {
          neural: 0,
          metabolic: 0,
          mechanical: 0,
        },
        recruitmentOverlay: 0,
        thresholdZoneState: "low",
        contributors: [],
      },
    );
  }

  return points;
}

function xAt(index: number): number {
  const plotWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  const step = WINDOW_DAYS > 1 ? plotWidth / (WINDOW_DAYS - 1) : 0;
  return PAD_LEFT + step * index;
}

function yAt(value: number): number {
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const normalized = (clampScore(value) - CHART_MIN) / (CHART_MAX - CHART_MIN);
  return PAD_TOP + (1 - normalized) * plotHeight;
}

function buildPath(points: WeeklyAuditSeriesPoint[]): string {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(" ");
}

function buildRecruitmentBandPath(points: WeeklyAuditPointViewModel[]): string {
  const upper = points.map((point) => ({
    x: point.x,
    y: yAt(point.recruitment + RECRUITMENT_BAND_RADIUS),
  }));
  const lower = points
    .map((point) => ({
      x: point.x,
      y: yAt(point.recruitment - RECRUITMENT_BAND_RADIUS),
    }))
    .reverse();

  const combined = [...upper, ...lower];
  if (combined.length === 0) {
    return "";
  }

  return [
    ...combined.map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    ),
    "Z",
  ].join(" ");
}

export function buildWeeklyAuditViewModel(
  response: WeeklyAuditApiResponse,
): WeeklyAuditViewModel {
  const points = normalizeWindowPoints(response).map((point, index) => ({
    id: `point-${point.date}`,
    date: point.date,
    label: dateLabel(point.date),
    x: xAt(index),
    neural: clampScore(point.completedAxes.neural),
    metabolic: clampScore(point.completedAxes.metabolic),
    mechanical: clampScore(point.completedAxes.mechanical),
    recruitment: clampScore(point.recruitmentOverlay),
    contributors: normalizeContributors(point.contributors),
  }));

  const neuralSeries = points.map((point) => ({
    id: `${point.id}-neural`,
    date: point.date,
    label: point.label,
    x: point.x,
    y: yAt(point.neural),
    value: point.neural,
    isHighRisk: point.neural >= THRESHOLD_VALUE,
  }));
  const metabolicSeries = points.map((point) => ({
    id: `${point.id}-metabolic`,
    date: point.date,
    label: point.label,
    x: point.x,
    y: yAt(point.metabolic),
    value: point.metabolic,
    isHighRisk: point.metabolic >= THRESHOLD_VALUE,
  }));
  const mechanicalSeries = points.map((point) => ({
    id: `${point.id}-mechanical`,
    date: point.date,
    label: point.label,
    x: point.x,
    y: yAt(point.mechanical),
    value: point.mechanical,
    isHighRisk: point.mechanical >= THRESHOLD_VALUE,
  }));

  return {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    plotLeft: PAD_LEFT,
    plotRight: CHART_WIDTH - PAD_RIGHT,
    plotTop: PAD_TOP,
    plotBottom: CHART_HEIGHT - PAD_BOTTOM,
    thresholdValue: THRESHOLD_VALUE,
    thresholdY: yAt(THRESHOLD_VALUE),
    points,
    series: {
      neural: neuralSeries,
      metabolic: metabolicSeries,
      mechanical: mechanicalSeries,
    },
    neuralPath: buildPath(neuralSeries),
    metabolicPath: buildPath(metabolicSeries),
    mechanicalPath: buildPath(mechanicalSeries),
    recruitmentBandPath: buildRecruitmentBandPath(points),
  };
}
