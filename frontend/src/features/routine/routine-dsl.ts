import type {
  EnduranceBlockDraft,
  EnduranceIntervalDraft,
  EnduranceSegmentDraft,
  EnduranceTargetType,
  RoutineDraft,
  RoutineLineageReferences,
  RoutinePath,
  StrengthBlockDraft,
  StrengthExerciseDraft,
  StrengthLoadUnit,
  StrengthProgressionStrategy,
  StrengthSetDraft,
  StrengthSetLoadDraft,
  StrengthSetProgressionDraft,
  StrengthVariableDraft,
} from "./types";
import { ROUTINE_DSL_VERSION, createDefaultStrengthSet } from "./types";

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
const allowedLoadUnits = new Set<StrengthLoadUnit>(["kg", "lb", "percent_1rm"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function pushValidationError(
  errors: string[],
  path: string,
  message: string,
  hint: string,
) {
  errors.push(`${path} ${message} Hint: ${hint}`);
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

function toLoadUnit(value: unknown): StrengthLoadUnit | null {
  if (typeof value !== "string") {
    return null;
  }

  return allowedLoadUnits.has(value as StrengthLoadUnit)
    ? (value as StrengthLoadUnit)
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

  pushValidationError(
    errors,
    path,
    "must be a string or null.",
    "Use a plain string condition or null.",
  );
  return null;
}

function parseOptionalBoundedNumber(
  value: unknown,
  path: string,
  errors: string[],
  minimum: number,
  maximum: number,
): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    pushValidationError(
      errors,
      path,
      `must be a number between ${minimum} and ${maximum}.`,
      `Use a numeric value in the ${minimum}-${maximum} range or null.`,
    );
    return null;
  }

  return value;
}

function resolveExerciseInstanceId(
  candidate: unknown,
  fallbackIndex: number,
  seenInstanceIds: Set<string>,
): string {
  const preferred =
    typeof candidate === "string" && candidate.trim().length > 0
      ? candidate
      : `exercise-${fallbackIndex + 1}`;

  if (!seenInstanceIds.has(preferred)) {
    seenInstanceIds.add(preferred);
    return preferred;
  }

  let sequence = fallbackIndex + 1;
  while (seenInstanceIds.has(`exercise-${sequence}`)) {
    sequence += 1;
  }

  const fallback = `exercise-${sequence}`;
  seenInstanceIds.add(fallback);
  return fallback;
}

function parseStrengthVariables(
  value: unknown,
  errors: string[],
): StrengthVariableDraft[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    pushValidationError(
      errors,
      "strength.variables",
      "must be an array.",
      "Provide [] or a list of variable objects with variableId, name, and expression.",
    );
    return [];
  }

  const variables: StrengthVariableDraft[] = [];

  value.forEach((candidate, index) => {
    const variablePath = `strength.variables[${index}]`;

    if (!isRecord(candidate)) {
      pushValidationError(
        errors,
        variablePath,
        "must be an object.",
        "Provide { variableId, name, expression }.",
      );
      return;
    }

    const variableId = candidate.variableId;
    const name = candidate.name;
    const expression = candidate.expression;

    if (!isNonEmptyString(variableId)) {
      pushValidationError(
        errors,
        `${variablePath}.variableId`,
        "must be a non-empty string.",
        "Use a stable identifier like training-max.",
      );
      return;
    }

    if (!isNonEmptyString(name)) {
      pushValidationError(
        errors,
        `${variablePath}.name`,
        "must be a non-empty string.",
        "Use a display label such as Training Max.",
      );
      return;
    }

    if (!isNonEmptyString(expression)) {
      pushValidationError(
        errors,
        `${variablePath}.expression`,
        "must be a non-empty string.",
        "Provide the formula as a string.",
      );
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
    pushValidationError(
      errors,
      path,
      "must be an object or null.",
      "Provide { strategy, value } or null.",
    );
    return null;
  }

  const strategy = value.strategy;
  const progressionValue = value.value;

  if (
    typeof strategy !== "string" ||
    !allowedProgressionStrategies.has(strategy as StrengthProgressionStrategy)
  ) {
    pushValidationError(
      errors,
      `${path}.strategy`,
      "must be one of linear_add_load, linear_add_reps, percentage_wave.",
      "Use a supported progression strategy keyword.",
    );
    return null;
  }

  if (
    typeof progressionValue !== "number" ||
    !Number.isFinite(progressionValue) ||
    progressionValue <= 0
  ) {
    pushValidationError(
      errors,
      `${path}.value`,
      "must be a positive number.",
      "Use a value greater than zero.",
    );
    return null;
  }

  return {
    strategy: strategy as StrengthProgressionStrategy,
    value: progressionValue,
  };
}

function parseSetLoad(
  value: unknown,
  path: string,
  errors: string[],
): StrengthSetLoadDraft | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (!isRecord(value)) {
    pushValidationError(
      errors,
      path,
      "must be an object or null.",
      "Provide { unit, value } or null.",
    );
    return null;
  }

  const unit = toLoadUnit(value.unit);
  const loadValue = value.value;

  if (!unit) {
    pushValidationError(
      errors,
      `${path}.unit`,
      "must be one of kg, lb, percent_1rm.",
      "Use a supported load unit keyword.",
    );
    return null;
  }

  if (
    typeof loadValue !== "number" ||
    !Number.isFinite(loadValue) ||
    loadValue <= 0
  ) {
    pushValidationError(
      errors,
      `${path}.value`,
      "must be a positive number.",
      "Use a load value greater than zero.",
    );
    return null;
  }

  return {
    unit,
    value: loadValue,
  };
}

function parseStrengthSets(
  value: unknown,
  path: string,
  errors: string[],
): StrengthSetDraft[] {
  if (!Array.isArray(value)) {
    pushValidationError(
      errors,
      path,
      "must be an array.",
      "Provide at least one set object.",
    );
    return [];
  }

  if (value.length === 0) {
    pushValidationError(
      errors,
      path,
      "must include at least one set.",
      "Keep one set minimum for each exercise.",
    );
    return [];
  }

  const sets: StrengthSetDraft[] = [];

  value.forEach((candidate, index) => {
    const setPath = `${path}[${index}]`;

    if (!isRecord(candidate)) {
      pushValidationError(
        errors,
        setPath,
        "must be an object.",
        "Provide { setId, reps, restSeconds, ... }.",
      );
      return;
    }

    const setId = candidate.setId;
    const reps = candidate.reps;
    const restSeconds = candidate.restSeconds;
    const timerSeconds = candidate.timerSeconds;

    if (!isNonEmptyString(setId)) {
      pushValidationError(
        errors,
        `${setPath}.setId`,
        "must be a non-empty string.",
        "Use a stable id like set-1.",
      );
      return;
    }

    if (typeof reps !== "number" || !Number.isFinite(reps) || reps <= 0) {
      pushValidationError(
        errors,
        `${setPath}.reps`,
        "must be a positive number.",
        "Use a reps value greater than zero.",
      );
      return;
    }

    if (
      typeof restSeconds !== "number" ||
      !Number.isFinite(restSeconds) ||
      restSeconds < 0
    ) {
      pushValidationError(
        errors,
        `${setPath}.restSeconds`,
        "must be a non-negative number.",
        "Use 0 or a positive rest duration in seconds.",
      );
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
      pushValidationError(
        errors,
        `${setPath}.timerSeconds`,
        "must be a positive number or null.",
        "Use null to omit timer or a value greater than zero.",
      );
      return;
    }

    const load = parseSetLoad(candidate.load, `${setPath}.load`, errors);
    const rpe = parseOptionalBoundedNumber(
      candidate.rpe,
      `${setPath}.rpe`,
      errors,
      1,
      10,
    );
    const rir = parseOptionalBoundedNumber(
      candidate.rir,
      `${setPath}.rir`,
      errors,
      0,
      10,
    );
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
      load,
      rpe,
      rir,
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
    pushValidationError(
      errors,
      path,
      "must be an array.",
      "Provide [] or a list of exercise objects.",
    );
    return [];
  }

  const exercises: StrengthExerciseDraft[] = [];
  const seenInstanceIds = new Set<string>();

  value.forEach((candidate, index) => {
    const exercisePath = `${path}[${index}]`;
    if (!isRecord(candidate)) {
      pushValidationError(
        errors,
        exercisePath,
        "must be an object.",
        "Provide exercise fields and sets.",
      );
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
      pushValidationError(
        errors,
        `${exercisePath}.exerciseId`,
        "must be a non-empty string.",
        "Use a canonical exercise id.",
      );
      return;
    }

    if (!isNonEmptyString(canonicalName)) {
      pushValidationError(
        errors,
        `${exercisePath}.canonicalName`,
        "must be a non-empty string.",
        "Use a display exercise name.",
      );
      return;
    }

    if (
      !(selectedEquipment === null || typeof selectedEquipment === "string")
    ) {
      pushValidationError(
        errors,
        `${exercisePath}.selectedEquipment`,
        "must be string or null.",
        "Use equipment id text or null.",
      );
      return;
    }

    if (!Array.isArray(regionTags) || !regionTags.every(isNonEmptyString)) {
      pushValidationError(
        errors,
        `${exercisePath}.regionTags`,
        "must be an array of strings.",
        "Provide at least one region tag string.",
      );
      return;
    }

    const sets = parseStrengthSets(
      candidate.sets,
      `${exercisePath}.sets`,
      errors,
    );
    const instanceId = resolveExerciseInstanceId(
      candidate.instanceId,
      index,
      seenInstanceIds,
    );

    exercises.push({
      instanceId,
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
    pushValidationError(
      errors,
      "strength.exercises",
      "must be an array.",
      "Provide [] or exercise objects in the legacy shape.",
    );
    return [];
  }

  const exercises: StrengthExerciseDraft[] = [];
  const seenInstanceIds = new Set<string>();

  value.forEach((candidate, index) => {
    const path = `strength.exercises[${index}]`;
    if (!isRecord(candidate)) {
      pushValidationError(
        errors,
        path,
        "must be an object.",
        "Provide exercise fields in legacy shape.",
      );
      return;
    }

    const exerciseId = candidate.exerciseId;
    const canonicalName = candidate.canonicalName;
    const selectedEquipment = candidate.selectedEquipment;
    const regionTags = candidate.regionTags;

    if (!isNonEmptyString(exerciseId)) {
      pushValidationError(
        errors,
        `${path}.exerciseId`,
        "must be a non-empty string.",
        "Use a canonical exercise id.",
      );
      return;
    }

    if (!isNonEmptyString(canonicalName)) {
      pushValidationError(
        errors,
        `${path}.canonicalName`,
        "must be a non-empty string.",
        "Use a display exercise name.",
      );
      return;
    }

    if (
      !(selectedEquipment === null || typeof selectedEquipment === "string")
    ) {
      pushValidationError(
        errors,
        `${path}.selectedEquipment`,
        "must be string or null.",
        "Use equipment id text or null.",
      );
      return;
    }

    if (!Array.isArray(regionTags) || !regionTags.every(isNonEmptyString)) {
      pushValidationError(
        errors,
        `${path}.regionTags`,
        "must be an array of strings.",
        "Provide at least one region tag string.",
      );
      return;
    }

    exercises.push({
      instanceId: resolveExerciseInstanceId(
        candidate.instanceId,
        index,
        seenInstanceIds,
      ),
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
    pushValidationError(
      errors,
      "strength.blocks",
      "must be an array.",
      "Provide [] or block objects with exercises.",
    );
    return [];
  }

  const blocks: StrengthBlockDraft[] = [];

  value.forEach((candidate, index) => {
    const blockPath = `strength.blocks[${index}]`;
    if (!isRecord(candidate)) {
      pushValidationError(
        errors,
        blockPath,
        "must be an object.",
        "Provide block fields with exercises.",
      );
      return;
    }

    const blockId = candidate.blockId;
    const label = candidate.label;
    const repeatCount = candidate.repeatCount;

    if (!isNonEmptyString(blockId)) {
      pushValidationError(
        errors,
        `${blockPath}.blockId`,
        "must be a non-empty string.",
        "Use a stable block id like block-1.",
      );
      return;
    }

    if (!isNonEmptyString(label)) {
      pushValidationError(
        errors,
        `${blockPath}.label`,
        "must be a non-empty string.",
        "Use a human-readable block label.",
      );
      return;
    }

    if (
      typeof repeatCount !== "number" ||
      !Number.isFinite(repeatCount) ||
      repeatCount <= 0
    ) {
      pushValidationError(
        errors,
        `${blockPath}.repeatCount`,
        "must be a positive number.",
        "Use repeatCount >= 1.",
      );
      return;
    }

    const condition = parseOptionalCondition(
      candidate.condition,
      `${blockPath}.condition`,
      errors,
    );
    const exercises = parseStrengthExercises(
      candidate.exercises,
      `${blockPath}.exercises`,
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

function defaultStrengthBlocks(): StrengthBlockDraft[] {
  return [
    {
      blockId: "block-1",
      label: "Main block",
      repeatCount: 1,
      condition: null,
      exercises: [],
    },
  ];
}

function parseStrength(
  value: unknown,
  errors: string[],
): RoutineDraft["strength"] {
  if (!isRecord(value)) {
    pushValidationError(
      errors,
      "strength",
      "must be an object.",
      "Provide { variables, blocks }.",
    );
    return {
      variables: [],
      blocks: defaultStrengthBlocks(),
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
    pushValidationError(
      errors,
      "strength.blocks",
      "must be an array.",
      "Provide blocks or legacy exercises.",
    );
  }

  if (blocks.length === 0) {
    blocks = defaultStrengthBlocks();
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
    pushValidationError(
      errors,
      "endurance.intervals",
      "must be an array.",
      "Provide [] or interval objects.",
    );
    return [];
  }

  const intervals: EnduranceIntervalDraft[] = [];

  value.forEach((candidate, index) => {
    const intervalPath = `endurance.intervals[${index}]`;
    if (!isRecord(candidate)) {
      pushValidationError(
        errors,
        intervalPath,
        "must be an object.",
        "Provide interval fields and target values.",
      );
      return;
    }

    const intervalId = candidate.intervalId;
    const label = candidate.label;
    const durationSeconds = candidate.durationSeconds;
    const targetType = toTargetType(candidate.targetType);
    const targetValue = candidate.targetValue;

    if (!isNonEmptyString(intervalId)) {
      pushValidationError(
        errors,
        `${intervalPath}.intervalId`,
        "must be a non-empty string.",
        "Use a stable id like interval-1.",
      );
      return;
    }

    if (!isNonEmptyString(label)) {
      pushValidationError(
        errors,
        `${intervalPath}.label`,
        "must be a non-empty string.",
        "Use a clear interval label.",
      );
      return;
    }

    if (
      typeof durationSeconds !== "number" ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0
    ) {
      pushValidationError(
        errors,
        `${intervalPath}.durationSeconds`,
        "must be a positive number.",
        "Use durationSeconds > 0.",
      );
      return;
    }

    if (!targetType) {
      pushValidationError(
        errors,
        `${intervalPath}.targetType`,
        "must be one of power_watts, pace, heart_rate.",
        "Use a supported target type.",
      );
      return;
    }

    if (typeof targetValue !== "number" || !Number.isFinite(targetValue)) {
      pushValidationError(
        errors,
        `${intervalPath}.targetValue`,
        "must be a valid number.",
        "Use a numeric target value.",
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

function parseEnduranceSegments(
  value: unknown,
  blockPath: string,
  errors: string[],
): EnduranceSegmentDraft[] {
  if (!Array.isArray(value)) {
    pushValidationError(
      errors,
      `${blockPath}.segments`,
      "must be an array.",
      "Provide one or more segment objects.",
    );
    return [];
  }

  if (value.length === 0) {
    pushValidationError(
      errors,
      `${blockPath}.segments`,
      "must include at least one segment.",
      "Add at least one work/recovery segment.",
    );
    return [];
  }

  const segments: EnduranceSegmentDraft[] = [];

  value.forEach((candidate, index) => {
    const segmentPath = `${blockPath}.segments[${index}]`;
    if (!isRecord(candidate)) {
      pushValidationError(
        errors,
        segmentPath,
        "must be an object.",
        "Provide segment id, label, duration, and target.",
      );
      return;
    }

    const segmentId = candidate.segmentId;
    const label = candidate.label;
    const durationSeconds = candidate.durationSeconds;
    const target = candidate.target;

    if (!isNonEmptyString(segmentId)) {
      pushValidationError(
        errors,
        `${segmentPath}.segmentId`,
        "must be a non-empty string.",
        "Use a stable id like seg-1.",
      );
      return;
    }

    if (!isNonEmptyString(label)) {
      pushValidationError(
        errors,
        `${segmentPath}.label`,
        "must be a non-empty string.",
        "Use a readable segment label.",
      );
      return;
    }

    if (
      typeof durationSeconds !== "number" ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0
    ) {
      pushValidationError(
        errors,
        `${segmentPath}.durationSeconds`,
        "must be a positive number.",
        "Use durationSeconds > 0.",
      );
      return;
    }

    if (!isRecord(target)) {
      pushValidationError(
        errors,
        `${segmentPath}.target`,
        "must be an object.",
        "Provide { type, value }.",
      );
      return;
    }

    const targetType = toTargetType(target.type);
    if (!targetType) {
      pushValidationError(
        errors,
        `${segmentPath}.target.type`,
        "must be one of power_watts, pace, heart_rate.",
        "Use a supported target type.",
      );
      return;
    }

    const targetValue = target.value;
    if (typeof targetValue !== "number" || !Number.isFinite(targetValue)) {
      pushValidationError(
        errors,
        `${segmentPath}.target.value`,
        "must be a valid number.",
        "Use a numeric target value.",
      );
      return;
    }

    segments.push({
      segmentId,
      label,
      durationSeconds,
      target: {
        type: targetType,
        value: targetValue,
      },
    });
  });

  return segments;
}

function parseEnduranceBlocks(
  value: unknown,
  errors: string[],
): EnduranceBlockDraft[] {
  if (!Array.isArray(value)) {
    pushValidationError(
      errors,
      "endurance.blocks",
      "must be an array.",
      "Provide [] or interval block objects.",
    );
    return [];
  }

  const blocks: EnduranceBlockDraft[] = [];

  value.forEach((candidate, index) => {
    const blockPath = `endurance.blocks[${index}]`;
    if (!isRecord(candidate)) {
      pushValidationError(
        errors,
        blockPath,
        "must be an object.",
        "Provide block id, label, repeatCount, and segments.",
      );
      return;
    }

    const blockId = candidate.blockId;
    const label = candidate.label;
    const repeatCount = candidate.repeatCount;

    if (!isNonEmptyString(blockId)) {
      pushValidationError(
        errors,
        `${blockPath}.blockId`,
        "must be a non-empty string.",
        "Use a stable id like endurance-block-1.",
      );
      return;
    }

    if (!isNonEmptyString(label)) {
      pushValidationError(
        errors,
        `${blockPath}.label`,
        "must be a non-empty string.",
        "Use a clear block label.",
      );
      return;
    }

    if (
      typeof repeatCount !== "number" ||
      !Number.isFinite(repeatCount) ||
      repeatCount <= 0
    ) {
      pushValidationError(
        errors,
        `${blockPath}.repeatCount`,
        "must be a positive number.",
        "Use repeatCount >= 1.",
      );
      return;
    }

    const segments = parseEnduranceSegments(
      candidate.segments,
      blockPath,
      errors,
    );

    blocks.push({
      blockId,
      label,
      repeatCount,
      segments,
    });
  });

  return blocks;
}

function blocksToIntervals(
  blocks: EnduranceBlockDraft[],
): EnduranceIntervalDraft[] {
  const intervals: EnduranceIntervalDraft[] = [];
  let cursor = 0;

  blocks.forEach((block) => {
    block.segments.forEach((segment) => {
      cursor += 1;
      intervals.push({
        intervalId: `interval-${cursor}`,
        label: `${block.label}: ${segment.label}`,
        durationSeconds: segment.durationSeconds,
        targetType: segment.target.type,
        targetValue: segment.target.value,
      });
    });
  });

  return intervals;
}

function intervalsToBlocks(
  intervals: EnduranceIntervalDraft[],
): EnduranceBlockDraft[] {
  return intervals.map((interval, index) => ({
    blockId: `block-${index + 1}`,
    label: interval.label,
    repeatCount: 1,
    segments: [
      {
        segmentId: `segment-${index + 1}`,
        label: interval.label,
        durationSeconds: interval.durationSeconds,
        target: {
          type: interval.targetType,
          value: interval.targetValue,
        },
      },
    ],
  }));
}

function cloneStrengthSet(setDraft: StrengthSetDraft): StrengthSetDraft {
  return {
    setId: setDraft.setId,
    reps: setDraft.reps,
    restSeconds: setDraft.restSeconds,
    timerSeconds: setDraft.timerSeconds ?? null,
    load: setDraft.load
      ? {
          unit: setDraft.load.unit,
          value: setDraft.load.value,
        }
      : null,
    rpe: typeof setDraft.rpe === "number" ? setDraft.rpe : null,
    rir: typeof setDraft.rir === "number" ? setDraft.rir : null,
    progression: setDraft.progression
      ? {
          strategy: setDraft.progression.strategy,
          value: setDraft.progression.value,
        }
      : null,
  };
}

function cloneStrengthExercise(
  exercise: StrengthExerciseDraft,
): StrengthExerciseDraft {
  return {
    instanceId: exercise.instanceId,
    exerciseId: exercise.exerciseId,
    canonicalName: exercise.canonicalName,
    selectedEquipment: exercise.selectedEquipment,
    regionTags: [...exercise.regionTags],
    condition: exercise.condition,
    sets: exercise.sets.map(cloneStrengthSet),
  };
}

function cloneStrengthBlock(block: StrengthBlockDraft): StrengthBlockDraft {
  return {
    blockId: block.blockId,
    label: block.label,
    repeatCount: block.repeatCount,
    condition: block.condition,
    exercises: block.exercises.map(cloneStrengthExercise),
  };
}

function cloneEnduranceIntervals(
  intervals: EnduranceIntervalDraft[],
): EnduranceIntervalDraft[] {
  return intervals.map((interval) => ({
    intervalId: interval.intervalId,
    label: interval.label,
    durationSeconds: interval.durationSeconds,
    targetType: interval.targetType,
    targetValue: interval.targetValue,
  }));
}

function cloneEnduranceBlocks(
  blocks: EnduranceBlockDraft[],
): EnduranceBlockDraft[] {
  return blocks.map((block) => ({
    blockId: block.blockId,
    label: block.label,
    repeatCount: block.repeatCount,
    segments: block.segments.map((segment) => ({
      segmentId: segment.segmentId,
      label: segment.label,
      durationSeconds: segment.durationSeconds,
      target: {
        type: segment.target.type,
        value: segment.target.value,
      },
    })),
  }));
}

function normalizeEndurance(
  endurance: RoutineDraft["endurance"],
): RoutineDraft["endurance"] {
  let intervals = cloneEnduranceIntervals(endurance.intervals);
  let blocks = cloneEnduranceBlocks(endurance.blocks);

  if (intervals.length === 0 && blocks.length > 0) {
    intervals = blocksToIntervals(blocks);
  }

  if (blocks.length === 0 && intervals.length > 0) {
    blocks = intervalsToBlocks(intervals);
  }

  return {
    intervals,
    blocks,
  };
}

function parseEndurance(
  value: unknown,
  errors: string[],
): RoutineDraft["endurance"] {
  if (!isRecord(value)) {
    pushValidationError(
      errors,
      "endurance",
      "must be an object.",
      "Provide intervals or blocks.",
    );
    return {
      intervals: [],
      blocks: [],
    };
  }

  const hasIntervals = value.intervals !== undefined;
  const hasBlocks = value.blocks !== undefined;

  if (!hasIntervals && !hasBlocks) {
    pushValidationError(
      errors,
      "endurance",
      "must include intervals or blocks.",
      "Provide endurance.intervals or endurance.blocks.",
    );
    return {
      intervals: [],
      blocks: [],
    };
  }

  let intervals: EnduranceIntervalDraft[] = hasIntervals
    ? parseEnduranceIntervals(value.intervals, errors)
    : [];
  let blocks: EnduranceBlockDraft[] = hasBlocks
    ? parseEnduranceBlocks(value.blocks, errors)
    : [];

  if (hasBlocks && !hasIntervals) {
    intervals = blocksToIntervals(blocks);
  } else if (hasIntervals && !hasBlocks) {
    blocks = intervalsToBlocks(intervals);
  }

  return {
    intervals,
    blocks,
  };
}

function parseDslVersion(
  value: unknown,
  errors: string[],
): typeof ROUTINE_DSL_VERSION {
  if (value === undefined || value === null) {
    return ROUTINE_DSL_VERSION;
  }

  if (value === "1.0" || value === "2.0") {
    return ROUTINE_DSL_VERSION;
  }

  pushValidationError(
    errors,
    "dslVersion",
    "must be 1.0 or 2.0.",
    'Use dslVersion: "2.0".',
  );
  return ROUTINE_DSL_VERSION;
}

function parseLineageReferences(
  value: unknown,
  errors: string[],
): RoutineLineageReferences {
  const defaults: RoutineLineageReferences = {
    macrocycleId: null,
    mesocycleId: null,
    microcycleId: null,
  };

  if (value === undefined || value === null) {
    return defaults;
  }

  if (!isRecord(value)) {
    pushValidationError(
      errors,
      "references",
      "must be an object.",
      "Provide { macrocycleId, mesocycleId, microcycleId }.",
    );
    return defaults;
  }

  function parseReferenceValue(
    candidate: unknown,
    path: string,
  ): string | null {
    if (candidate === undefined || candidate === null) {
      return null;
    }

    if (typeof candidate === "string") {
      return candidate;
    }

    pushValidationError(
      errors,
      path,
      "must be a string or null.",
      "Use a string identifier or null.",
    );
    return null;
  }

  return {
    macrocycleId: parseReferenceValue(
      value.macrocycleId,
      "references.macrocycleId",
    ),
    mesocycleId: parseReferenceValue(
      value.mesocycleId,
      "references.mesocycleId",
    ),
    microcycleId: parseReferenceValue(
      value.microcycleId,
      "references.microcycleId",
    ),
  };
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

  const dslVersion = parseDslVersion(payload.dslVersion, errors);
  const references = parseLineageReferences(payload.references, errors);
  const routineId = payload.routineId;
  const routineName = payload.routineName;
  const path = toPath(payload.path);

  if (!isNonEmptyString(routineId)) {
    pushValidationError(
      errors,
      "routineId",
      "must be a non-empty string.",
      "Use a stable routine identifier.",
    );
  }

  if (!isNonEmptyString(routineName)) {
    pushValidationError(
      errors,
      "routineName",
      "must be a non-empty string.",
      "Provide a readable routine name.",
    );
  }

  const normalizedRoutineId = isNonEmptyString(routineId) ? routineId : "";
  const normalizedRoutineName = isNonEmptyString(routineName)
    ? routineName
    : "";

  if (!path) {
    pushValidationError(
      errors,
      "path",
      "must be either strength or endurance.",
      'Use path: "strength" or "endurance".',
    );
  }

  const strength = parseStrength(payload.strength, errors);
  const endurance = parseEndurance(payload.endurance, errors);

  if (errors.length > 0 || !path) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      dslVersion,
      references,
      routineId: normalizedRoutineId,
      routineName: normalizedRoutineName,
      path,
      strength: {
        variables: strength.variables.map((variable) => ({ ...variable })),
        blocks: strength.blocks.map(cloneStrengthBlock),
      },
      endurance: normalizeEndurance(endurance),
    },
  };
}

export function serializeRoutineDsl(routine: RoutineDraft): string {
  const normalized = {
    dslVersion: ROUTINE_DSL_VERSION,
    references: {
      macrocycleId: routine.references.macrocycleId ?? null,
      mesocycleId: routine.references.mesocycleId ?? null,
      microcycleId: routine.references.microcycleId ?? null,
    },
    routineId: routine.routineId,
    routineName: routine.routineName,
    path: routine.path,
    strength: {
      variables: routine.strength.variables.map((variable) => ({
        ...variable,
      })),
      blocks: routine.strength.blocks.map(cloneStrengthBlock),
    },
    endurance: normalizeEndurance(routine.endurance),
  } satisfies RoutineDraft;

  return JSON.stringify(normalized, null, 2);
}
