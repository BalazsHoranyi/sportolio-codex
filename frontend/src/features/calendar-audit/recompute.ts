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

export interface WeeklyAuditIncrementalMutationResult {
  response: WeeklyAuditApiResponse;
  applied: boolean;
  touchedDates: string[];
  durationMs: number;
  warning?: string;
}

interface DeltaOperation {
  date: string;
  multiplier: 1 | -1;
}

function nowMs(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

function toResult(params: {
  startedAtMs: number;
  response: WeeklyAuditApiResponse;
  applied: boolean;
  touchedDates?: string[];
  warning?: string;
}): WeeklyAuditIncrementalMutationResult {
  return {
    response: params.response,
    applied: params.applied,
    touchedDates: params.touchedDates ?? [],
    durationMs: nowMs() - params.startedAtMs,
    warning: params.warning,
  };
}

function resolveDeltaOperations(mutation: PlanningMutationEvent): {
  operations: DeltaOperation[];
  warning?: string;
} {
  const fromDate = normalizeIsoDate(mutation.fromDate);
  const toDate = normalizeIsoDate(mutation.toDate);

  if (mutation.type === "workout_reordered") {
    return { operations: [] };
  }

  if (mutation.type === "workout_added") {
    if (!toDate) {
      return {
        operations: [],
        warning:
          "Calendar recompute cannot be applied: added workout is missing a valid target date.",
      };
    }

    return {
      operations: [
        {
          date: toDate,
          multiplier: 1,
        },
      ],
    };
  }

  if (mutation.type === "workout_removed") {
    if (!fromDate) {
      return {
        operations: [],
        warning:
          "Calendar recompute cannot be applied: removed workout is missing a valid source date.",
      };
    }

    return {
      operations: [
        {
          date: fromDate,
          multiplier: -1,
        },
      ],
    };
  }

  if (mutation.type === "workout_moved") {
    if (!fromDate || !toDate) {
      return {
        operations: [],
        warning:
          "Calendar recompute cannot be applied: moved workout requires valid source and target dates.",
      };
    }

    if (fromDate === toDate) {
      return { operations: [] };
    }

    return {
      operations: [
        {
          date: fromDate,
          multiplier: -1,
        },
        {
          date: toDate,
          multiplier: 1,
        },
      ],
    };
  }

  return { operations: [] };
}

function applyDeltaToPoint(
  point: WeeklyAuditPoint,
  delta: AxisLoad,
  multiplier: 1 | -1,
): WeeklyAuditPoint {
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

  return {
    ...point,
    completedAxes,
    recruitmentOverlay,
    thresholdZoneState: resolveThresholdState(completedAxes),
  };
}

export function applyWeeklyAuditMutationIncrementally(
  response: WeeklyAuditApiResponse,
  mutation: PlanningMutationEvent,
): WeeklyAuditIncrementalMutationResult {
  const startedAtMs = nowMs();
  const { operations, warning } = resolveDeltaOperations(mutation);

  if (warning) {
    return toResult({
      startedAtMs,
      response,
      applied: false,
      warning,
    });
  }

  if (operations.length === 0) {
    return toResult({
      startedAtMs,
      response,
      applied: false,
    });
  }

  const delta = buildDelta(mutation);
  const dateToIndex = new Map(
    response.points.map((point, index) => [point.date, index]),
  );
  let nextPoints: WeeklyAuditPoint[] | undefined;
  const touchedDates = new Set<string>();

  for (const operation of operations) {
    const index = dateToIndex.get(operation.date);
    if (index === undefined) {
      continue;
    }

    if (!nextPoints) {
      nextPoints = [...response.points];
    }

    nextPoints[index] = applyDeltaToPoint(
      nextPoints[index] ?? response.points[index],
      delta,
      operation.multiplier,
    );
    touchedDates.add(operation.date);
  }

  if (!nextPoints || touchedDates.size === 0) {
    const attemptedDates = operations.map((operation) => operation.date);

    return toResult({
      startedAtMs,
      response,
      applied: false,
      warning: `Calendar recompute could not be applied for dates outside the loaded weekly audit window: ${attemptedDates.join(
        ", ",
      )}.`,
    });
  }

  return toResult({
    startedAtMs,
    response: {
      ...response,
      points: nextPoints,
    },
    applied: true,
    touchedDates: [...touchedDates],
  });
}

export function recomputeWeeklyAuditResponse(
  response: WeeklyAuditApiResponse,
  mutations: PlanningMutationEvent[],
): WeeklyAuditApiResponse {
  if (mutations.length === 0) {
    return response;
  }

  return mutations.reduce(
    (currentResponse, mutation) =>
      applyWeeklyAuditMutationIncrementally(currentResponse, mutation).response,
    response,
  );
}
