import type { WeeklyAuditApiResponse, WeeklyAuditPoint } from "./types";
import type {
  PlanningMutationEvent,
  PlanningWorkoutIntensity,
  PlanningWorkoutType,
} from "../planning-calendar/types";

interface AxisLoad {
  neural: number;
  metabolic: number;
  mechanical: number;
}

const MIN_SCORE = 0;
const MAX_SCORE = 10;

const loadByWorkoutType: Record<PlanningWorkoutType, AxisLoad> = {
  strength: {
    neural: 0.9,
    metabolic: 0.5,
    mechanical: 1,
  },
  endurance: {
    neural: 0.55,
    metabolic: 0.95,
    mechanical: 0.65,
  },
  recovery: {
    neural: 0.25,
    metabolic: 0.3,
    mechanical: 0.25,
  },
};

const loadMultiplierByIntensity: Record<PlanningWorkoutIntensity, number> = {
  easy: 0.5,
  moderate: 0.75,
  hard: 1,
};

function normalizeIsoDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) {
    return undefined;
  }

  return asDate.toISOString().slice(0, 10);
}

function clampScore(value: number): number {
  if (value < MIN_SCORE) {
    return MIN_SCORE;
  }

  if (value > MAX_SCORE) {
    return MAX_SCORE;
  }

  return Number(value.toFixed(2));
}

function fallbackWorkoutType(title: string): PlanningWorkoutType {
  const normalized = title.toLowerCase();
  if (normalized.includes("recovery") || normalized.includes("easy")) {
    return "recovery";
  }

  if (normalized.includes("ride") || normalized.includes("run")) {
    return "endurance";
  }

  return "strength";
}

function fallbackIntensity(
  workoutType: PlanningWorkoutType,
): PlanningWorkoutIntensity {
  if (workoutType === "recovery") {
    return "easy";
  }

  if (workoutType === "endurance") {
    return "moderate";
  }

  return "hard";
}

function buildDelta(mutation: PlanningMutationEvent): AxisLoad {
  const workoutType =
    mutation.workoutType ?? fallbackWorkoutType(mutation.title);
  const intensity = mutation.intensity ?? fallbackIntensity(workoutType);
  const baseLoad = loadByWorkoutType[workoutType];
  const multiplier = loadMultiplierByIntensity[intensity];

  return {
    neural: baseLoad.neural * multiplier,
    metabolic: baseLoad.metabolic * multiplier,
    mechanical: baseLoad.mechanical * multiplier,
  };
}

function resolveThresholdState(
  completedAxes: WeeklyAuditPoint["completedAxes"],
): WeeklyAuditPoint["thresholdZoneState"] {
  const peak = Math.max(
    completedAxes.neural,
    completedAxes.metabolic,
    completedAxes.mechanical,
  );

  if (peak >= 7) {
    return "high";
  }

  if (peak >= 5) {
    return "moderate";
  }

  return "low";
}

function applyDateDelta(
  byDate: Map<string, WeeklyAuditPoint>,
  isoDate: string | undefined,
  delta: AxisLoad,
  multiplier: 1 | -1,
) {
  if (!isoDate) {
    return;
  }

  const point = byDate.get(isoDate);
  if (!point) {
    return;
  }

  const completedAxes = {
    neural: clampScore(point.completedAxes.neural + delta.neural * multiplier),
    metabolic: clampScore(
      point.completedAxes.metabolic + delta.metabolic * multiplier,
    ),
    mechanical: clampScore(
      point.completedAxes.mechanical + delta.mechanical * multiplier,
    ),
  };

  const recruitmentOverlay = clampScore(
    (completedAxes.neural +
      completedAxes.metabolic +
      completedAxes.mechanical) /
      3,
  );

  byDate.set(isoDate, {
    ...point,
    completedAxes,
    recruitmentOverlay,
    thresholdZoneState: resolveThresholdState(completedAxes),
  });
}

function clonePoints(points: WeeklyAuditPoint[]): WeeklyAuditPoint[] {
  return points.map((point) => ({
    ...point,
    completedAxes: {
      ...point.completedAxes,
    },
    contributors: point.contributors.map((contributor) => ({
      ...contributor,
    })),
  }));
}

export function recomputeWeeklyAuditResponse(
  response: WeeklyAuditApiResponse,
  mutations: PlanningMutationEvent[],
): WeeklyAuditApiResponse {
  if (mutations.length === 0) {
    return response;
  }

  const nextPoints = clonePoints(response.points);
  const byDate = new Map(nextPoints.map((point) => [point.date, point]));

  for (const mutation of mutations) {
    const delta = buildDelta(mutation);
    const fromDate = normalizeIsoDate(mutation.fromDate);
    const toDate = normalizeIsoDate(mutation.toDate);

    if (mutation.type === "workout_added") {
      applyDateDelta(byDate, toDate, delta, 1);
      continue;
    }

    if (mutation.type === "workout_removed") {
      applyDateDelta(byDate, fromDate, delta, -1);
      continue;
    }

    if (mutation.type === "workout_moved") {
      applyDateDelta(byDate, fromDate, delta, -1);
      applyDateDelta(byDate, toDate, delta, 1);
    }
  }

  return {
    ...response,
    points: response.points.map(
      (point) =>
        byDate.get(point.date) ?? {
          ...point,
          completedAxes: {
            ...point.completedAxes,
          },
          contributors: point.contributors.map((contributor) => ({
            ...contributor,
          })),
        },
    ),
  };
}
