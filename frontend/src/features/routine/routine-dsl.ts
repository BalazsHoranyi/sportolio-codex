import type {
  EnduranceIntervalDraft,
  EnduranceTargetType,
  RoutineDraft,
  RoutinePath,
  StrengthBlockDraft,
  StrengthExerciseDraft,
  StrengthProgressionStrategy,
  StrengthSetDraft,
  StrengthSetProgressionDraft,
  StrengthVariableDraft,
} from "./types";
import { createDefaultStrengthSet } from "./types";

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
const allowedProgressionStrategies = new Set<StrengthProgressionStrategy>([
  "linear_add_load",
  "linear_add_reps",
  "percentage_wave",
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

function parseOptionalCondition(
  value: unknown,
  path: string,
  errors: string[],
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  errors.push(`${path} must be a string or null.`);
  return null;
}

function parseStrengthVariables(
  value: unknown,
  errors: string[],
): StrengthVariableDraft[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    errors.push("strength.variables must be an array.");
    return [];
  }

  const variables: StrengthVariableDraft[] = [];

  value.forEach((candidate, index) => {
    if (!isRecord(candidate)) {
      errors.push(`strength.variables[${index}] must be an object.`);
      return;
    }

    const variableId = candidate.variableId;
    const name = candidate.name;
    const expression = candidate.expression;

    if (!isNonEmptyString(variableId)) {
      errors.push(`strength.variables[${index}].variableId must be a string.`);
      return;
    }

    if (!isNonEmptyString(name)) {
      errors.push(`strength.variables[${index}].name must be a string.`);
      return;
    }

    if (!isNonEmptyString(expression)) {
      errors.push(`strength.variables[${index}].expression must be a string.`);
      return;
    }

    variables.push({
      variableId,
      name,
      expression,
    });
  });

  return variables;
}

function parseProgression(
  value: unknown,
  path: string,
  errors: string[],
): StrengthSetProgressionDraft | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (!isRecord(value)) {
    errors.push(`${path} must be an object or null.`);
    return null;
  }

  const strategy = value.strategy;
  const progressionValue = value.value;

  if (
    typeof strategy !== "string" ||
    !allowedProgressionStrategies.has(strategy as StrengthProgressionStrategy)
  ) {
    errors.push(
      `${path}.strategy must be one of linear_add_load, linear_add_reps, percentage_wave.`,
    );
    return null;
  }

  if (
    typeof progressionValue !== "number" ||
    !Number.isFinite(progressionValue) ||
    progressionValue <= 0
  ) {
    errors.push(`${path}.value must be a positive number.`);
    return null;
  }

  return {
    strategy: strategy as StrengthProgressionStrategy,
    value: progressionValue,
  };
}

function parseStrengthSets(
  value: unknown,
  path: string,
  errors: string[],
): StrengthSetDraft[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [];
  }

  if (value.length === 0) {
    errors.push(`${path} must include at least one set.`);
    return [];
  }

  const sets: StrengthSetDraft[] = [];

  value.forEach((candidate, index) => {
    const setPath = `${path}[${index}]`;
    if (!isRecord(candidate)) {
      errors.push(`${setPath} must be an object.`);
      return;
    }

    const setId = candidate.setId;
    const reps = candidate.reps;
    const restSeconds = candidate.restSeconds;
    const timerSeconds = candidate.timerSeconds;

    if (!isNonEmptyString(setId)) {
      errors.push(`${setPath}.setId must be a string.`);
      return;
    }

    if (typeof reps !== "number" || !Number.isFinite(reps) || reps <= 0) {
      errors.push(`${setPath}.reps must be a positive number.`);
      return;
    }

    if (
      typeof restSeconds !== "number" ||
      !Number.isFinite(restSeconds) ||
      restSeconds < 0
    ) {
      errors.push(`${setPath}.restSeconds must be a non-negative number.`);
      return;
    }

    if (
      !(
        timerSeconds === null ||
        timerSeconds === undefined ||
        (typeof timerSeconds === "number" &&
          Number.isFinite(timerSeconds) &&
          timerSeconds > 0)
      )
    ) {
      errors.push(`${setPath}.timerSeconds must be a positive number or null.`);
      return;
    }

    const progression = parseProgression(
      candidate.progression,
      `${setPath}.progression`,
      errors,
    );

    sets.push({
      setId,
      reps,
      restSeconds,
      timerSeconds:
        typeof timerSeconds === "number" && Number.isFinite(timerSeconds)
          ? timerSeconds
          : null,
      progression,
    });
  });

  return sets;
}

function parseStrengthExercises(
  value: unknown,
  path: string,
  errors: string[],
): StrengthExerciseDraft[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [];
  }

  const exercises: StrengthExerciseDraft[] = [];

  value.forEach((candidate, index) => {
    const exercisePath = `${path}[${index}]`;
    if (!isRecord(candidate)) {
      errors.push(`${exercisePath} must be an object.`);
      return;
    }

    const exerciseId = candidate.exerciseId;
    const canonicalName = candidate.canonicalName;
    const selectedEquipment = candidate.selectedEquipment;
    const regionTags = candidate.regionTags;
    const condition = parseOptionalCondition(
      candidate.condition,
      `${exercisePath}.condition`,
      errors,
    );

    if (!isNonEmptyString(exerciseId)) {
      errors.push(`${exercisePath}.exerciseId must be a string.`);
      return;
    }

    if (!isNonEmptyString(canonicalName)) {
      errors.push(`${exercisePath}.canonicalName must be a string.`);
      return;
    }

    if (
      !(selectedEquipment === null || typeof selectedEquipment === "string")
    ) {
      errors.push(`${exercisePath}.selectedEquipment must be string or null.`);
      return;
    }

    if (!Array.isArray(regionTags) || !regionTags.every(isNonEmptyString)) {
      errors.push(`${exercisePath}.regionTags must be an array of strings.`);
      return;
    }

    const sets = parseStrengthSets(
      candidate.sets,
      `${exercisePath}.sets`,
      errors,
    );

    exercises.push({
      exerciseId,
      canonicalName,
      selectedEquipment,
      regionTags: [...regionTags],
      condition,
      sets,
    });
  });

  return exercises;
}

function parseLegacyStrengthExercises(
  value: unknown,
  errors: string[],
): StrengthExerciseDraft[] {
  if (!Array.isArray(value)) {
    errors.push("strength.exercises must be an array.");
    return [];
  }

  const exercises: StrengthExerciseDraft[] = [];

  value.forEach((candidate, index) => {
    const path = `strength.exercises[${index}]`;
    if (!isRecord(candidate)) {
      errors.push(`${path} must be an object.`);
      return;
    }

    const exerciseId = candidate.exerciseId;
    const canonicalName = candidate.canonicalName;
    const selectedEquipment = candidate.selectedEquipment;
    const regionTags = candidate.regionTags;

    if (!isNonEmptyString(exerciseId)) {
      errors.push(`${path}.exerciseId must be a string.`);
      return;
    }

    if (!isNonEmptyString(canonicalName)) {
      errors.push(`${path}.canonicalName must be a string.`);
      return;
    }

    if (
      !(selectedEquipment === null || typeof selectedEquipment === "string")
    ) {
      errors.push(`${path}.selectedEquipment must be string or null.`);
      return;
    }

    if (!Array.isArray(regionTags) || !regionTags.every(isNonEmptyString)) {
      errors.push(`${path}.regionTags must be an array of strings.`);
      return;
    }

    exercises.push({
      exerciseId,
      canonicalName,
      selectedEquipment,
      regionTags: [...regionTags],
      condition: null,
      sets: [createDefaultStrengthSet()],
    });
  });

  return exercises;
}

function parseStrengthBlocks(
  value: unknown,
  errors: string[],
): StrengthBlockDraft[] {
  if (!Array.isArray(value)) {
    errors.push("strength.blocks must be an array.");
    return [];
  }

  const blocks: StrengthBlockDraft[] = [];

  value.forEach((candidate, index) => {
    if (!isRecord(candidate)) {
      errors.push(`strength.blocks[${index}] must be an object.`);
      return;
    }

    const blockId = candidate.blockId;
    const label = candidate.label;
    const repeatCount = candidate.repeatCount;

    if (!isNonEmptyString(blockId)) {
      errors.push(`strength.blocks[${index}].blockId must be a string.`);
      return;
    }

    if (!isNonEmptyString(label)) {
      errors.push(`strength.blocks[${index}].label must be a string.`);
      return;
    }

    if (
      typeof repeatCount !== "number" ||
      !Number.isFinite(repeatCount) ||
      repeatCount <= 0
    ) {
      errors.push(
        `strength.blocks[${index}].repeatCount must be a positive number.`,
      );
      return;
    }

    const condition = parseOptionalCondition(
      candidate.condition,
      `strength.blocks[${index}].condition`,
      errors,
    );
    const exercises = parseStrengthExercises(
      candidate.exercises,
      `strength.blocks[${index}].exercises`,
      errors,
    );

    blocks.push({
      blockId,
      label,
      repeatCount,
      condition,
      exercises,
    });
  });

  return blocks;
}

function parseStrength(
  value: unknown,
  errors: string[],
): RoutineDraft["strength"] {
  if (!isRecord(value)) {
    errors.push("strength must be an object.");
    return {
      variables: [],
      blocks: [
        {
          blockId: "block-1",
          label: "Main block",
          repeatCount: 1,
          condition: null,
          exercises: [],
        },
      ],
    };
  }

  const variables = parseStrengthVariables(value.variables, errors);

  let blocks: StrengthBlockDraft[] = [];
  if (value.blocks !== undefined) {
    blocks = parseStrengthBlocks(value.blocks, errors);
  } else if (value.exercises !== undefined) {
    const legacyExercises = parseLegacyStrengthExercises(
      value.exercises,
      errors,
    );
    blocks = [
      {
        blockId: "block-1",
        label: "Imported block",
        repeatCount: 1,
        condition: null,
        exercises: legacyExercises,
      },
    ];
  } else {
    errors.push("strength.blocks must be an array.");
  }

  if (blocks.length === 0) {
    blocks = [
      {
        blockId: "block-1",
        label: "Main block",
        repeatCount: 1,
        condition: null,
        exercises: [],
      },
    ];
  }

  return {
    variables,
    blocks,
  };
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

  const strength = parseStrength(payload.strength, errors);

  if (!isRecord(endurance)) {
    errors.push("endurance must be an object.");
  }

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
      strength,
      endurance: {
        intervals,
      },
    },
  };
}

export function serializeRoutineDsl(routine: RoutineDraft): string {
  return JSON.stringify(routine, null, 2);
}
