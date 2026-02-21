import type {
  EnduranceIntervalDraft,
  EnduranceTargetType,
  RoutineDraft,
  RoutinePath,
  StrengthExerciseDraft,
} from "./types";

interface ParseRoutineDslSuccess {
  ok: true;
  value: RoutineDraft;
}

interface ParseRoutineDslFailure {
  ok: false;
  errors: string[];
}

export type ParseRoutineDslResult =
  | ParseRoutineDslSuccess
  | ParseRoutineDslFailure;

const allowedRoutinePaths = new Set<RoutinePath>(["strength", "endurance"]);
const allowedTargetTypes = new Set<EnduranceTargetType>([
  "power_watts",
  "pace",
  "heart_rate",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toPath(value: unknown): RoutinePath | null {
  if (typeof value !== "string") {
    return null;
  }

  return allowedRoutinePaths.has(value as RoutinePath)
    ? (value as RoutinePath)
    : null;
}

function toTargetType(value: unknown): EnduranceTargetType | null {
  if (typeof value !== "string") {
    return null;
  }

  return allowedTargetTypes.has(value as EnduranceTargetType)
    ? (value as EnduranceTargetType)
    : null;
}

function parseStrengthExercises(
  value: unknown,
  errors: string[],
): StrengthExerciseDraft[] {
  if (!Array.isArray(value)) {
    errors.push("strength.exercises must be an array.");
    return [];
  }

  const exercises: StrengthExerciseDraft[] = [];

  value.forEach((candidate, index) => {
    if (!isRecord(candidate)) {
      errors.push(`strength.exercises[${index}] must be an object.`);
      return;
    }

    const exerciseId = candidate.exerciseId;
    const canonicalName = candidate.canonicalName;
    const selectedEquipment = candidate.selectedEquipment;
    const regionTags = candidate.regionTags;

    if (!isNonEmptyString(exerciseId)) {
      errors.push(`strength.exercises[${index}].exerciseId must be a string.`);
      return;
    }

    if (!isNonEmptyString(canonicalName)) {
      errors.push(
        `strength.exercises[${index}].canonicalName must be a string.`,
      );
      return;
    }

    if (
      !(selectedEquipment === null || typeof selectedEquipment === "string")
    ) {
      errors.push(
        `strength.exercises[${index}].selectedEquipment must be string or null.`,
      );
      return;
    }

    if (!Array.isArray(regionTags) || !regionTags.every(isNonEmptyString)) {
      errors.push(
        `strength.exercises[${index}].regionTags must be an array of strings.`,
      );
      return;
    }

    exercises.push({
      exerciseId,
      canonicalName,
      selectedEquipment,
      regionTags: [...regionTags],
    });
  });

  return exercises;
}

function parseEnduranceIntervals(
  value: unknown,
  errors: string[],
): EnduranceIntervalDraft[] {
  if (!Array.isArray(value)) {
    errors.push("endurance.intervals must be an array.");
    return [];
  }

  const intervals: EnduranceIntervalDraft[] = [];

  value.forEach((candidate, index) => {
    if (!isRecord(candidate)) {
      errors.push(`endurance.intervals[${index}] must be an object.`);
      return;
    }

    const intervalId = candidate.intervalId;
    const label = candidate.label;
    const durationSeconds = candidate.durationSeconds;
    const targetType = toTargetType(candidate.targetType);
    const targetValue = candidate.targetValue;

    if (!isNonEmptyString(intervalId)) {
      errors.push(`endurance.intervals[${index}].intervalId must be a string.`);
      return;
    }

    if (!isNonEmptyString(label)) {
      errors.push(`endurance.intervals[${index}].label must be a string.`);
      return;
    }

    if (
      typeof durationSeconds !== "number" ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0
    ) {
      errors.push(
        `endurance.intervals[${index}].durationSeconds must be a positive number.`,
      );
      return;
    }

    if (!targetType) {
      errors.push(
        `endurance.intervals[${index}].targetType must be one of power_watts, pace, heart_rate.`,
      );
      return;
    }

    if (typeof targetValue !== "number" || !Number.isFinite(targetValue)) {
      errors.push(
        `endurance.intervals[${index}].targetValue must be a valid number.`,
      );
      return;
    }

    intervals.push({
      intervalId,
      label,
      durationSeconds,
      targetType,
      targetValue,
    });
  });

  return intervals;
}

export function parseRoutineDsl(input: string): ParseRoutineDslResult {
  let payload: unknown;

  try {
    payload = JSON.parse(input);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected JSON parse error.";
    return {
      ok: false,
      errors: [`Invalid JSON: ${message}`],
    };
  }

  if (!isRecord(payload)) {
    return {
      ok: false,
      errors: ["Routine DSL root must be an object."],
    };
  }

  const errors: string[] = [];

  const routineId = payload.routineId;
  const routineName = payload.routineName;
  const path = toPath(payload.path);
  const strength = payload.strength;
  const endurance = payload.endurance;

  if (!isNonEmptyString(routineId)) {
    errors.push("routineId must be a non-empty string.");
  }

  if (!isNonEmptyString(routineName)) {
    errors.push("routineName must be a non-empty string.");
  }

  const normalizedRoutineId = isNonEmptyString(routineId) ? routineId : "";
  const normalizedRoutineName = isNonEmptyString(routineName)
    ? routineName
    : "";

  if (!path) {
    errors.push("path must be either strength or endurance.");
  }

  if (!isRecord(strength)) {
    errors.push("strength must be an object.");
  }

  if (!isRecord(endurance)) {
    errors.push("endurance must be an object.");
  }

  const exercises = isRecord(strength)
    ? parseStrengthExercises(strength.exercises, errors)
    : [];
  const intervals = isRecord(endurance)
    ? parseEnduranceIntervals(endurance.intervals, errors)
    : [];

  if (errors.length > 0 || !path) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      routineId: normalizedRoutineId,
      routineName: normalizedRoutineName,
      path,
      strength: {
        exercises,
      },
      endurance: {
        intervals,
      },
    },
  };
}

export function serializeRoutineDsl(routine: RoutineDraft): string {
  return JSON.stringify(routine, null, 2);
}
