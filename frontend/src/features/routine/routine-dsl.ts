import type {
  CadenceRangeRpmDraft,
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

function parseOptionalCadenceRange(
  value: unknown,
  path: string,
  errors: string[],
): CadenceRangeRpmDraft | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (!isRecord(value)) {
    pushValidationError(
      errors,
      path,
      "must be an object or null.",
      "Provide { min, max } cadence bounds or null.",
    );
    return null;
  }

  const min = value.min;
  const max = value.max;
  if (
    typeof min !== "number" ||
    !Number.isFinite(min) ||
    min <= 0 ||
    typeof max !== "number" ||
    !Number.isFinite(max) ||
    max <= 0 ||
    min > max
  ) {
    pushValidationError(
      errors,
      path,
      "must include positive numeric min/max where min <= max.",
      "Provide cadenceRangeRpm like { min: 90, max: 100 }.",
    );
    return null;
  }

  return { min, max };
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
    const note = parseOptionalCondition(
      candidate.note,
      `${exercisePath}.note`,
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
      ...(note !== null ? { note } : {}),
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
    const weekLabel = parseOptionalCondition(
      candidate.weekLabel,
      `${blockPath}.weekLabel`,
      errors,
    );
    const dayLabel = parseOptionalCondition(
      candidate.dayLabel,
      `${blockPath}.dayLabel`,
      errors,
    );

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
      ...(weekLabel !== null ? { weekLabel } : {}),
      ...(dayLabel !== null ? { dayLabel } : {}),
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
    const cadenceRangeRpm = parseOptionalCadenceRange(
      candidate.cadenceRangeRpm,
      `${intervalPath}.cadenceRangeRpm`,
      errors,
    );
    const note = parseOptionalCondition(
      candidate.note,
      `${intervalPath}.note`,
      errors,
    );

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
      ...(cadenceRangeRpm !== null ? { cadenceRangeRpm } : {}),
      ...(note !== null ? { note } : {}),
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
    const cadenceRangeRpm = parseOptionalCadenceRange(
      candidate.cadenceRangeRpm,
      `${segmentPath}.cadenceRangeRpm`,
      errors,
    );
    const note = parseOptionalCondition(
      candidate.note,
      `${segmentPath}.note`,
      errors,
    );

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
      ...(cadenceRangeRpm !== null ? { cadenceRangeRpm } : {}),
      ...(note !== null ? { note } : {}),
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
        ...(segment.cadenceRangeRpm
          ? { cadenceRangeRpm: segment.cadenceRangeRpm }
          : {}),
        ...(segment.note ? { note: segment.note } : {}),
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
        ...(interval.cadenceRangeRpm
          ? { cadenceRangeRpm: interval.cadenceRangeRpm }
          : {}),
        ...(interval.note ? { note: interval.note } : {}),
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
    ...(exercise.note ? { note: exercise.note } : {}),
    sets: exercise.sets.map(cloneStrengthSet),
  };
}

function cloneStrengthBlock(block: StrengthBlockDraft): StrengthBlockDraft {
  return {
    blockId: block.blockId,
    label: block.label,
    repeatCount: block.repeatCount,
    condition: block.condition,
    ...(block.weekLabel ? { weekLabel: block.weekLabel } : {}),
    ...(block.dayLabel ? { dayLabel: block.dayLabel } : {}),
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
    ...(interval.cadenceRangeRpm
      ? {
          cadenceRangeRpm: {
            min: interval.cadenceRangeRpm.min,
            max: interval.cadenceRangeRpm.max,
          },
        }
      : {}),
    ...(interval.note ? { note: interval.note } : {}),
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
      ...(segment.cadenceRangeRpm
        ? {
            cadenceRangeRpm: {
              min: segment.cadenceRangeRpm.min,
              max: segment.cadenceRangeRpm.max,
            },
          }
        : {}),
      ...(segment.note ? { note: segment.note } : {}),
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

function parseRoutineDslPayload(payload: unknown): ParseRoutineDslResult {
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

interface HumanParseFailure {
  ok: false;
  errors: string[];
}

interface HumanParseSuccess {
  ok: true;
  payload: Record<string, unknown>;
}

type HumanParseResult = HumanParseFailure | HumanParseSuccess;

function slugifyToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatHumanError(
  line: number,
  column: number,
  message: string,
  hint: string,
): string {
  return `Line ${line}, column ${column}: ${message} Hint: ${hint}`;
}

function findTokenColumn(rawLine: string, token: string): number {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    return 1;
  }

  const index = rawLine.indexOf(normalizedToken);
  return index >= 0 ? index + 1 : 1;
}

function parseHumanReferenceValue(value: string): string | null {
  return value.toLowerCase() === "null" ? null : value;
}

function parseHumanProgressionExpression(
  expression: string,
): StrengthSetProgressionDraft | null {
  const trimmed = expression.trim();
  const match = trimmed.match(
    /^([a-z_]+)\(([-+]?\d*\.?\d+)(?:\s*(lb|kg|%1rm|percent_1rm))?\)$/i,
  );
  if (!match) {
    return null;
  }

  const strategyToken = (match[1] ?? "").toLowerCase();
  const rawValue = Number.parseFloat(match[2] ?? "");
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return null;
  }

  let strategy: StrengthProgressionStrategy | null = null;
  if (strategyToken === "lp" || strategyToken === "linear_add_load") {
    strategy = "linear_add_load";
  } else if (strategyToken === "reps" || strategyToken === "linear_add_reps") {
    strategy = "linear_add_reps";
  } else if (strategyToken === "wave" || strategyToken === "percentage_wave") {
    strategy = "percentage_wave";
  }

  if (!strategy) {
    return null;
  }

  return {
    strategy,
    value: rawValue,
  };
}

function parseHumanSetLoadToken(value: string): StrengthSetLoadDraft | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  const match = normalized.match(/^([-+]?\d*\.?\d+)(kg|lb|%1rm|percent_1rm)$/);
  if (!match) {
    return null;
  }

  const numeric = Number.parseFloat(match[1] ?? "");
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  const rawUnit = match[2];
  if (!rawUnit) {
    return null;
  }
  const unit: StrengthLoadUnit =
    rawUnit === "%1rm" ? "percent_1rm" : (rawUnit as StrengthLoadUnit);

  return {
    unit,
    value: numeric,
  };
}

function parseHumanSetSpecs(
  rawValue: string,
  lineNumber: number,
  errors: string[],
): StrengthSetDraft[] | null {
  const trimmed = rawValue.trim();
  const normalized =
    trimmed.startsWith("[") && trimmed.endsWith("]")
      ? trimmed.slice(1, -1).trim()
      : trimmed;

  if (normalized.length === 0) {
    errors.push(
      formatHumanError(
        lineNumber,
        1,
        "sets declaration cannot be empty.",
        "Provide at least one set spec, for example sets: [reps=5,rest=180].",
      ),
    );
    return null;
  }

  const setSpecs = normalized
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (setSpecs.length === 0) {
    errors.push(
      formatHumanError(
        lineNumber,
        1,
        "sets declaration cannot be empty.",
        "Provide at least one set spec, for example sets: [reps=5,rest=180].",
      ),
    );
    return null;
  }

  const parsedSets: StrengthSetDraft[] = [];

  for (let index = 0; index < setSpecs.length; index += 1) {
    const spec = setSpecs[index] ?? "";
    const setDraft = createDefaultStrengthSet(`set-${index + 1}`);
    const fields = spec
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    let hasReps = false;

    for (const field of fields) {
      const [rawKey, rawValuePart] = field.split("=", 2);
      const key = (rawKey ?? "").trim().toLowerCase();
      const valuePart = (rawValuePart ?? "").trim();
      if (!key || !valuePart) {
        errors.push(
          formatHumanError(
            lineNumber,
            1,
            `Invalid set field "${field}".`,
            "Use key=value pairs such as reps=5 or rest=180.",
          ),
        );
        return null;
      }

      if (key === "id" || key === "setid") {
        setDraft.setId = valuePart;
      } else if (key === "reps") {
        const reps = Number.parseFloat(valuePart);
        if (!Number.isFinite(reps) || reps <= 0) {
          errors.push(
            formatHumanError(
              lineNumber,
              1,
              "Set reps must be a positive number.",
              "Use reps=5.",
            ),
          );
          return null;
        }
        setDraft.reps = reps;
        hasReps = true;
      } else if (key === "rest") {
        const rest = Number.parseFloat(valuePart.replace(/s$/i, ""));
        if (!Number.isFinite(rest) || rest < 0) {
          errors.push(
            formatHumanError(
              lineNumber,
              1,
              "Set rest must be a non-negative number.",
              "Use rest=180 or rest=180s.",
            ),
          );
          return null;
        }
        setDraft.restSeconds = rest;
      } else if (key === "timer") {
        if (valuePart.toLowerCase() === "null") {
          setDraft.timerSeconds = null;
        } else {
          const timer = Number.parseFloat(valuePart.replace(/s$/i, ""));
          if (!Number.isFinite(timer) || timer <= 0) {
            errors.push(
              formatHumanError(
                lineNumber,
                1,
                "Set timer must be positive or null.",
                "Use timer=45, timer=45s, or timer=null.",
              ),
            );
            return null;
          }
          setDraft.timerSeconds = timer;
        }
      } else if (key === "load") {
        const load = parseHumanSetLoadToken(valuePart);
        if (!load) {
          errors.push(
            formatHumanError(
              lineNumber,
              1,
              "Invalid set load token.",
              "Use load=145kg, load=315lb, or load=75%1rm.",
            ),
          );
          return null;
        }
        setDraft.load = load;
      } else if (key === "rpe") {
        const rpe = Number.parseFloat(valuePart);
        if (!Number.isFinite(rpe) || rpe < 1 || rpe > 10) {
          errors.push(
            formatHumanError(
              lineNumber,
              1,
              "Set RPE must be between 1 and 10.",
              "Use rpe=8.",
            ),
          );
          return null;
        }
        setDraft.rpe = rpe;
      } else if (key === "rir") {
        const rir = Number.parseFloat(valuePart);
        if (!Number.isFinite(rir) || rir < 0 || rir > 10) {
          errors.push(
            formatHumanError(
              lineNumber,
              1,
              "Set RIR must be between 0 and 10.",
              "Use rir=2.",
            ),
          );
          return null;
        }
        setDraft.rir = rir;
      } else if (key === "progress") {
        const progression = parseHumanProgressionExpression(valuePart);
        if (!progression) {
          errors.push(
            formatHumanError(
              lineNumber,
              1,
              "Invalid progression expression.",
              "Use progress=lp(5lb), progress=reps(1), or progress=wave(5).",
            ),
          );
          return null;
        }
        setDraft.progression = progression;
      } else {
        errors.push(
          formatHumanError(
            lineNumber,
            1,
            `Unsupported set field "${key}".`,
            "Use supported keys: reps, rest, timer, load, rpe, rir, progress, id.",
          ),
        );
        return null;
      }
    }

    if (!hasReps) {
      errors.push(
        formatHumanError(
          lineNumber,
          1,
          "Each set spec must include reps.",
          "Use reps=5 in each set declaration.",
        ),
      );
      return null;
    }

    parsedSets.push(setDraft);
  }

  return parsedSets;
}

function parseHumanStrengthDsl(
  lines: string[],
  startIndex: number,
  errors: string[],
): RoutineDraft["strength"] {
  const variables: StrengthVariableDraft[] = [];
  const blocks: StrengthBlockDraft[] = [];
  let currentWeekLabel: string | null = null;
  let currentBlock: StrengthBlockDraft | null = null;
  let pendingComment: string | null = null;

  function ensureBlock(
    lineNumber: number,
    explicitDayLabel?: string,
  ): StrengthBlockDraft {
    if (currentBlock) {
      return currentBlock;
    }
    const dayLabel = explicitDayLabel ?? "Day 1";
    const block: StrengthBlockDraft = {
      blockId: `block-${blocks.length + 1}`,
      label: currentWeekLabel ? `${currentWeekLabel} / ${dayLabel}` : dayLabel,
      repeatCount: 1,
      condition: null,
      ...(currentWeekLabel ? { weekLabel: currentWeekLabel } : {}),
      ...(dayLabel ? { dayLabel } : {}),
      exercises: [],
    };
    blocks.push(block);
    currentBlock = block;
    return block;
  }

  for (let index = startIndex; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? "";
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) {
      continue;
    }

    const variableMatch = trimmed.match(
      /^@var\s+([^|=]+?)(?:\s*\|\s*([^=]+?))?\s*=\s*(.+)$/i,
    );
    if (variableMatch) {
      const variableId = (variableMatch[1] ?? "").trim();
      const variableName = (variableMatch[2] ?? "").trim();
      const expression = (variableMatch[3] ?? "").trim();
      if (!variableId || !expression) {
        errors.push(
          formatHumanError(
            lineNumber,
            1,
            "Invalid variable declaration.",
            "Use @var variable-id | Variable Name = expression.",
          ),
        );
      } else {
        variables.push({
          variableId,
          name: variableName || variableId,
          expression,
        });
      }
      continue;
    }

    if (trimmed.startsWith("# ") && !trimmed.startsWith("##")) {
      currentWeekLabel = trimmed.slice(2).trim();
      currentBlock = null;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      const dayMatch = trimmed
        .slice(3)
        .trim()
        .match(/^(.+?)(?:\s+(\d+)x)?(?:\s+if\s+(.+))?$/i);
      const dayLabel = dayMatch?.[1]?.trim();
      if (!dayLabel) {
        errors.push(
          formatHumanError(
            lineNumber,
            1,
            "Day heading is missing a label.",
            "Use '## Day 1'.",
          ),
        );
        continue;
      }
      const repeatCountRaw = dayMatch?.[2];
      const repeatCount = repeatCountRaw
        ? Number.parseInt(repeatCountRaw, 10)
        : 1;
      const blockCondition = dayMatch?.[3]?.trim() || null;
      const block: StrengthBlockDraft = {
        blockId: `block-${blocks.length + 1}`,
        label: currentWeekLabel
          ? `${currentWeekLabel} / ${dayLabel}`
          : dayLabel,
        repeatCount:
          Number.isFinite(repeatCount) && repeatCount > 0 ? repeatCount : 1,
        condition: blockCondition,
        ...(currentWeekLabel ? { weekLabel: currentWeekLabel } : {}),
        ...(dayLabel ? { dayLabel } : {}),
        exercises: [],
      };
      blocks.push(block);
      currentBlock = block;
      continue;
    }

    if (trimmed.startsWith("//")) {
      pendingComment = trimmed.slice(2).trim();
      continue;
    }

    const targetBlock = ensureBlock(lineNumber);
    const tokens = trimmed
      .split("/")
      .map((token) => token.trim())
      .filter(Boolean);

    if (tokens.length < 2) {
      errors.push(
        formatHumanError(
          lineNumber,
          1,
          "Strength exercise line must include set notation.",
          "Use 'Squat / 5x5 / progress: lp(5lb)'.",
        ),
      );
      continue;
    }

    const canonicalName = tokens[0] ?? "";
    if (!canonicalName) {
      errors.push(
        formatHumanError(
          lineNumber,
          1,
          "Exercise name is required.",
          "Start with an exercise name before '/' tokens.",
        ),
      );
      continue;
    }

    let setCount = 0;
    let reps = 0;
    let restSeconds = 120;
    let timerSeconds: number | null = null;
    let progression: StrengthSetProgressionDraft | null = null;
    let load: StrengthSetLoadDraft | null = null;
    let rpe: number | null = null;
    let rir: number | null = null;
    let exerciseId = `dsl-${slugifyToken(canonicalName)}`;
    let instanceId = `exercise-${targetBlock.exercises.length + 1}`;
    let selectedEquipment: string | null = null;
    let regionTags: string[] = [];
    let condition: string | null = null;
    let explicitSets: StrengthSetDraft[] | null = null;

    for (const token of tokens.slice(1)) {
      const shorthandMatch = token.match(/^(\d+)x(\d+)$/i);
      if (shorthandMatch) {
        setCount = Number.parseInt(shorthandMatch[1] ?? "0", 10);
        reps = Number.parseInt(shorthandMatch[2] ?? "0", 10);
        continue;
      }

      if (/^sets\s*:/i.test(token)) {
        const parsedSets = parseHumanSetSpecs(
          token.replace(/^sets\s*:/i, "").trim(),
          lineNumber,
          errors,
        );
        if (!parsedSets) {
          continue;
        }
        explicitSets = parsedSets;
        continue;
      }

      const progressionToken = token.match(/^progress\s*:\s*(.+)$/i);
      if (progressionToken) {
        const parsedProgression = parseHumanProgressionExpression(
          progressionToken[1] ?? "",
        );
        if (!parsedProgression) {
          errors.push(
            formatHumanError(
              lineNumber,
              1,
              "Invalid progression token.",
              "Use progress: lp(5lb), progress: reps(1), or progress: wave(5).",
            ),
          );
          continue;
        }
        progression = parsedProgression;
        continue;
      }

      const restToken = token.match(/^rest\s*:\s*([-+]?\d*\.?\d+)\s*s?$/i);
      if (restToken) {
        restSeconds = Number.parseFloat(restToken[1] ?? "");
        continue;
      }

      const timerToken = token.match(/^timer\s*:\s*([-+]?\d*\.?\d+)\s*s?$/i);
      if (timerToken) {
        timerSeconds = Number.parseFloat(timerToken[1] ?? "");
        continue;
      }

      const idToken = token.match(/^id\s*:\s*(.+)$/i);
      if (idToken) {
        exerciseId = (idToken[1] ?? "").trim();
        continue;
      }

      const instanceToken = token.match(/^instance\s*:\s*(.+)$/i);
      if (instanceToken) {
        instanceId = (instanceToken[1] ?? "").trim();
        continue;
      }

      const equipmentToken = token.match(/^equip(?:ment)?\s*:\s*(.+)$/i);
      if (equipmentToken) {
        selectedEquipment = (equipmentToken[1] ?? "").trim();
        continue;
      }

      const regionsToken = token.match(/^regions\s*:\s*(.+)$/i);
      if (regionsToken) {
        regionTags = (regionsToken[1] ?? "")
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        continue;
      }

      const conditionToken = token.match(/^if\s*:\s*(.+)$/i);
      if (conditionToken) {
        condition = (conditionToken[1] ?? "").trim();
        continue;
      }

      const loadToken = token.match(/^load\s*:\s*(.+)$/i);
      if (loadToken) {
        const parsedLoad = parseHumanSetLoadToken(loadToken[1] ?? "");
        if (!parsedLoad) {
          errors.push(
            formatHumanError(
              lineNumber,
              1,
              "Invalid load token.",
              "Use load: 145kg, load: 315lb, or load: 75%1rm.",
            ),
          );
          continue;
        }
        load = parsedLoad;
        continue;
      }

      const rpeToken = token.match(/^rpe\s*:\s*([-+]?\d*\.?\d+)$/i);
      if (rpeToken) {
        rpe = Number.parseFloat(rpeToken[1] ?? "");
        continue;
      }

      const rirToken = token.match(/^rir\s*:\s*([-+]?\d*\.?\d+)$/i);
      if (rirToken) {
        rir = Number.parseFloat(rirToken[1] ?? "");
        continue;
      }

      errors.push(
        formatHumanError(
          lineNumber,
          findTokenColumn(rawLine, token),
          "Unsupported strength token.",
          "Use rest:, timer:, progress:, load:, rpe:, rir:, id:, instance:, equip:, regions:, if:, or sets:.",
        ),
      );
    }

    let sets: StrengthSetDraft[] = [];
    if (explicitSets) {
      sets = explicitSets.map((setDraft, idx) => ({
        ...setDraft,
        setId: setDraft.setId || `set-${idx + 1}`,
      }));
    } else {
      if (setCount <= 0 || reps <= 0) {
        errors.push(
          formatHumanError(
            lineNumber,
            1,
            "Set notation is required when no explicit sets are provided.",
            "Use 5x5 or sets: [reps=5,rest=180].",
          ),
        );
        continue;
      }

      for (let setIndex = 0; setIndex < setCount; setIndex += 1) {
        sets.push({
          setId: `set-${setIndex + 1}`,
          reps,
          restSeconds,
          timerSeconds,
          load,
          rpe,
          rir,
          progression,
        });
      }
    }

    targetBlock.exercises.push({
      instanceId,
      exerciseId,
      canonicalName,
      selectedEquipment,
      regionTags,
      condition,
      ...(pendingComment ? { note: pendingComment } : {}),
      sets,
    });
    pendingComment = null;
  }

  return {
    variables,
    blocks,
  };
}

function parseHumanEnduranceDsl(
  lines: string[],
  startIndex: number,
  errors: string[],
): RoutineDraft["endurance"] {
  const blocks: EnduranceBlockDraft[] = [];
  let currentBlock: EnduranceBlockDraft | null = null;

  function ensureBlock(label = "Main set"): EnduranceBlockDraft {
    if (currentBlock) {
      return currentBlock;
    }
    const block: EnduranceBlockDraft = {
      blockId: `block-${blocks.length + 1}`,
      label,
      repeatCount: 1,
      segments: [],
    };
    blocks.push(block);
    currentBlock = block;
    return block;
  }

  function parseDurationSeconds(
    rawDuration: string,
    unit: string,
  ): number | null {
    const value = Number.parseFloat(rawDuration);
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    if (unit.toLowerCase() === "h") {
      return Math.round(value * 3600);
    }
    if (unit.toLowerCase() === "m") {
      return Math.round(value * 60);
    }
    return Math.round(value);
  }

  for (let index = startIndex; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? "";
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) {
      continue;
    }

    if (!trimmed.startsWith("-")) {
      const headingMatch = trimmed.match(/^(.+?)(?:\s+(\d+)x)?$/i);
      const label = headingMatch?.[1]?.trim();
      if (!label) {
        errors.push(
          formatHumanError(
            lineNumber,
            1,
            "Endurance block heading is missing a label.",
            "Use headings such as Warmup, Main set 6x, or Cooldown.",
          ),
        );
        continue;
      }
      const repeatCountRaw = headingMatch?.[2];
      const repeatCount = repeatCountRaw
        ? Number.parseInt(repeatCountRaw, 10)
        : 1;
      const block: EnduranceBlockDraft = {
        blockId: `block-${blocks.length + 1}`,
        label,
        repeatCount:
          Number.isFinite(repeatCount) && repeatCount > 0 ? repeatCount : 1,
        segments: [],
      };
      blocks.push(block);
      currentBlock = block;
      continue;
    }

    const block = ensureBlock();
    const body = trimmed.replace(/^-+\s*/, "");
    const durationMatch = body.match(/^(\d+(?:\.\d+)?)(s|m|h)\s+(.+)$/i);
    if (!durationMatch) {
      errors.push(
        formatHumanError(
          lineNumber,
          1,
          "Endurance segment is missing duration/target syntax.",
          "Use '- 4m 100% 40-50rpm, note'.",
        ),
      );
      continue;
    }

    const durationSeconds = parseDurationSeconds(
      durationMatch[1] ?? "",
      durationMatch[2] ?? "s",
    );
    if (!durationSeconds) {
      errors.push(
        formatHumanError(
          lineNumber,
          1,
          "Invalid segment duration.",
          "Use positive durations such as 20m, 4m, or 90s.",
        ),
      );
      continue;
    }

    let descriptor = (durationMatch[3] ?? "").trim();
    let note: string | null = null;
    const commaIndex = descriptor.indexOf(",");
    if (commaIndex >= 0) {
      note = descriptor.slice(commaIndex + 1).trim();
      descriptor = descriptor.slice(0, commaIndex).trim();
    }

    let cadenceRangeRpm: CadenceRangeRpmDraft | null = null;
    const cadenceRangeMatch = descriptor.match(
      /([-+]?\d+)\s*-\s*([-+]?\d+)\s*rpm/i,
    );
    if (cadenceRangeMatch) {
      const min = Number.parseInt(cadenceRangeMatch[1] ?? "0", 10);
      const max = Number.parseInt(cadenceRangeMatch[2] ?? "0", 10);
      if (min <= 0 || max <= 0 || min > max) {
        errors.push(
          formatHumanError(
            lineNumber,
            findTokenColumn(rawLine, cadenceRangeMatch[0] ?? "rpm"),
            "Invalid cadence range.",
            "Use cadence like 90-100rpm where min <= max and both values are positive.",
          ),
        );
        continue;
      }
      cadenceRangeRpm = { min, max };
      descriptor = descriptor.replace(cadenceRangeMatch[0], "").trim();
    } else {
      const cadenceSingleMatch = descriptor.match(/([-+]?\d+)\s*rpm/i);
      if (cadenceSingleMatch) {
        const cadence = Number.parseInt(cadenceSingleMatch[1] ?? "0", 10);
        if (cadence <= 0) {
          errors.push(
            formatHumanError(
              lineNumber,
              findTokenColumn(rawLine, cadenceSingleMatch[0] ?? "rpm"),
              "Invalid cadence range.",
              "Use cadence like 95rpm with a positive value.",
            ),
          );
          continue;
        }
        cadenceRangeRpm = { min: cadence, max: cadence };
        descriptor = descriptor.replace(cadenceSingleMatch[0], "").trim();
      } else if (/\brpm\b/i.test(descriptor)) {
        errors.push(
          formatHumanError(
            lineNumber,
            findTokenColumn(rawLine, "rpm"),
            "Invalid cadence range.",
            "Use cadence like 90-100rpm or 95rpm.",
          ),
        );
        continue;
      }
    }

    let targetType: EnduranceTargetType | null = null;
    let targetValue: number | null = null;

    const recoveryMatch = descriptor.match(
      /recovery\s+at\s+([-+]?\d*\.?\d+)%/i,
    );
    if (recoveryMatch) {
      targetType = "power_watts";
      targetValue = Number.parseFloat(recoveryMatch[1] ?? "");
    } else {
      const percentMatch = descriptor.match(/([-+]?\d*\.?\d+)%/);
      if (percentMatch) {
        targetType = "power_watts";
        targetValue = Number.parseFloat(percentMatch[1] ?? "");
      }
    }

    if (!targetType || targetValue === null) {
      const paceMatch = descriptor.match(/pace\s*[:=]?\s*([-+]?\d*\.?\d+)/i);
      if (paceMatch) {
        targetType = "pace";
        targetValue = Number.parseFloat(paceMatch[1] ?? "");
      }
    }

    if (!targetType || targetValue === null) {
      const heartRateMatch = descriptor.match(
        /(?:hr|heart[_ -]?rate|bpm)\s*[:=]?\s*([-+]?\d*\.?\d+)/i,
      );
      if (heartRateMatch) {
        targetType = "heart_rate";
        targetValue = Number.parseFloat(heartRateMatch[1] ?? "");
      }
    }

    if (!targetType || targetValue === null) {
      const powerWattsMatch = descriptor.match(
        /(?:power|watts?)\s*[:=]?\s*([-+]?\d*\.?\d+)/i,
      );
      if (powerWattsMatch) {
        targetType = "power_watts";
        targetValue = Number.parseFloat(powerWattsMatch[1] ?? "");
      }
    }

    if (!targetType || targetValue === null || !Number.isFinite(targetValue)) {
      errors.push(
        formatHumanError(
          lineNumber,
          1,
          "Unable to parse interval intensity target.",
          "Use intensity tokens like 60%, recovery at 40%, pace:255, or hr:145.",
        ),
      );
      continue;
    }

    let segmentLabel = `Segment ${block.segments.length + 1}`;
    if (/recovery/i.test(descriptor)) {
      segmentLabel = "Recovery";
    } else if (/warmup/i.test(block.label)) {
      segmentLabel = "Warmup";
    } else if (/cooldown/i.test(block.label)) {
      segmentLabel = "Cooldown";
    } else if (/main/i.test(block.label) && block.segments.length === 0) {
      segmentLabel = "Work";
    }

    block.segments.push({
      segmentId: `segment-${block.segments.length + 1}`,
      label: segmentLabel,
      durationSeconds,
      target: {
        type: targetType,
        value: targetValue,
      },
      ...(cadenceRangeRpm ? { cadenceRangeRpm } : {}),
      ...(note ? { note } : {}),
    });
  }

  return {
    intervals: blocksToIntervals(blocks),
    blocks,
  };
}

function parseHumanRoutineDsl(input: string): HumanParseResult {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const errors: string[] = [];

  let cursor = 0;
  while (cursor < lines.length && !(lines[cursor] ?? "").trim()) {
    cursor += 1;
  }

  if (cursor >= lines.length) {
    return {
      ok: false,
      errors: [
        formatHumanError(
          1,
          1,
          "Routine DSL text is empty.",
          'Start with: routine "Name" id:routine-id path:strength',
        ),
      ],
    };
  }

  const headerLineNumber = cursor + 1;
  const header = (lines[cursor] ?? "").trim();
  const headerMatch = header.match(
    /^routine\s+"([^"]+)"\s+id:([^\s]+)\s+path:(strength|endurance)$/i,
  );
  if (!headerMatch) {
    return {
      ok: false,
      errors: [
        formatHumanError(
          headerLineNumber,
          1,
          "Invalid routine header.",
          'Use: routine "Routine Name" id:routine-id path:strength',
        ),
      ],
    };
  }

  const routineName = (headerMatch[1] ?? "").trim();
  const routineId = (headerMatch[2] ?? "").trim();
  const path = (headerMatch[3] ?? "").toLowerCase() as RoutinePath;
  cursor += 1;

  while (cursor < lines.length && !(lines[cursor] ?? "").trim()) {
    cursor += 1;
  }

  let references: RoutineLineageReferences = {
    macrocycleId: null,
    mesocycleId: null,
    microcycleId: null,
  };

  if (cursor < lines.length) {
    const maybeReferences = (lines[cursor] ?? "").trim();
    const referencesMatch = maybeReferences.match(
      /^references\s+macro:([^\s]+)\s+meso:([^\s]+)\s+micro:([^\s]+)$/i,
    );
    if (referencesMatch) {
      references = {
        macrocycleId: parseHumanReferenceValue(referencesMatch[1] ?? "null"),
        mesocycleId: parseHumanReferenceValue(referencesMatch[2] ?? "null"),
        microcycleId: parseHumanReferenceValue(referencesMatch[3] ?? "null"),
      };
      cursor += 1;
    }
  }

  const strength =
    path === "strength"
      ? parseHumanStrengthDsl(lines, cursor, errors)
      : { variables: [], blocks: [] };
  const endurance =
    path === "endurance"
      ? parseHumanEnduranceDsl(lines, cursor, errors)
      : { intervals: [], blocks: [] };

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    payload: {
      dslVersion: ROUTINE_DSL_VERSION,
      references,
      routineId,
      routineName,
      path,
      strength,
      endurance,
    },
  };
}

function durationToHumanToken(durationSeconds: number): string {
  if (durationSeconds % 3600 === 0) {
    return `${durationSeconds / 3600}h`;
  }
  if (durationSeconds % 60 === 0) {
    return `${durationSeconds / 60}m`;
  }
  return `${durationSeconds}s`;
}

function progressionToHumanToken(
  progression: StrengthSetProgressionDraft | null,
): string | null {
  if (!progression) {
    return null;
  }
  return `${progression.strategy}(${progression.value})`;
}

function loadToHumanToken(load: StrengthSetLoadDraft | null): string | null {
  if (!load) {
    return null;
  }
  const unit = load.unit === "percent_1rm" ? "%1rm" : load.unit;
  return `${load.value}${unit}`;
}

function areStrengthSetsUniform(sets: StrengthSetDraft[]): boolean {
  if (sets.length <= 1) {
    return true;
  }
  const first = sets[0];
  if (!first) {
    return true;
  }
  return sets.every((setDraft) => {
    return (
      setDraft.reps === first.reps &&
      setDraft.restSeconds === first.restSeconds &&
      setDraft.timerSeconds === first.timerSeconds &&
      JSON.stringify(setDraft.load) === JSON.stringify(first.load) &&
      setDraft.rpe === first.rpe &&
      setDraft.rir === first.rir &&
      JSON.stringify(setDraft.progression) === JSON.stringify(first.progression)
    );
  });
}

function hasCanonicalStrengthSetIds(sets: StrengthSetDraft[]): boolean {
  return sets.every((setDraft, index) => setDraft.setId === `set-${index + 1}`);
}

function formatStrengthSetSpecs(sets: StrengthSetDraft[]): string {
  const entries = sets.map((setDraft) => {
    const fields: string[] = [
      `id=${setDraft.setId}`,
      `reps=${setDraft.reps}`,
      `rest=${setDraft.restSeconds}`,
    ];

    if (setDraft.timerSeconds !== null) {
      fields.push(`timer=${setDraft.timerSeconds}`);
    }
    if (setDraft.load) {
      fields.push(`load=${loadToHumanToken(setDraft.load)}`);
    }
    if (setDraft.rpe !== null) {
      fields.push(`rpe=${setDraft.rpe}`);
    }
    if (setDraft.rir !== null) {
      fields.push(`rir=${setDraft.rir}`);
    }
    if (setDraft.progression) {
      fields.push(
        `progress=${progressionToHumanToken(setDraft.progression) ?? ""}`,
      );
    }
    return fields.join(",");
  });

  return `[${entries.join("; ")}]`;
}

export function serializeRoutineDslText(routine: RoutineDraft): string {
  const normalized = JSON.parse(serializeRoutineDsl(routine)) as RoutineDraft;
  const lines: string[] = [];

  lines.push(
    `routine "${normalized.routineName}" id:${normalized.routineId} path:${normalized.path}`,
  );
  lines.push(
    `references macro:${normalized.references.macrocycleId ?? "null"} meso:${normalized.references.mesocycleId ?? "null"} micro:${normalized.references.microcycleId ?? "null"}`,
  );
  lines.push("");

  if (normalized.path === "strength") {
    for (const variable of normalized.strength.variables) {
      lines.push(
        `@var ${variable.variableId} | ${variable.name} = ${variable.expression}`,
      );
    }
    if (normalized.strength.variables.length > 0) {
      lines.push("");
    }

    let currentWeek: string | null = null;
    for (const block of normalized.strength.blocks) {
      const weekLabel = block.weekLabel ?? null;
      const dayLabel = block.dayLabel ?? block.label;

      if (weekLabel && weekLabel !== currentWeek) {
        lines.push(`# ${weekLabel}`);
        currentWeek = weekLabel;
      }
      const dayHeader =
        block.repeatCount > 1 ? `${dayLabel} ${block.repeatCount}x` : dayLabel;
      const dayHeaderWithCondition = block.condition
        ? `${dayHeader} if ${block.condition}`
        : dayHeader;
      lines.push(`## ${dayHeaderWithCondition}`);

      for (const exercise of block.exercises) {
        if (exercise.note && exercise.note.trim().length > 0) {
          lines.push(`// ${exercise.note}`);
        }

        const tokens: string[] = [exercise.canonicalName];
        const sets = exercise.sets;
        const firstSet = sets[0];

        if (
          sets.length > 0 &&
          firstSet &&
          areStrengthSetsUniform(sets) &&
          hasCanonicalStrengthSetIds(sets)
        ) {
          tokens.push(`${sets.length}x${firstSet.reps}`);
          tokens.push(`rest: ${firstSet.restSeconds}s`);
          if (firstSet.timerSeconds !== null) {
            tokens.push(`timer: ${firstSet.timerSeconds}s`);
          }
          if (firstSet.progression) {
            tokens.push(
              `progress: ${progressionToHumanToken(firstSet.progression) ?? ""}`,
            );
          }
          if (firstSet.load) {
            tokens.push(`load: ${loadToHumanToken(firstSet.load) ?? ""}`);
          }
          if (firstSet.rpe !== null) {
            tokens.push(`rpe: ${firstSet.rpe}`);
          }
          if (firstSet.rir !== null) {
            tokens.push(`rir: ${firstSet.rir}`);
          }
        } else {
          tokens.push(`sets: ${formatStrengthSetSpecs(sets)}`);
        }

        tokens.push(`id: ${exercise.exerciseId}`);
        tokens.push(`instance: ${exercise.instanceId}`);
        if (exercise.selectedEquipment) {
          tokens.push(`equip: ${exercise.selectedEquipment}`);
        }
        if (exercise.regionTags.length > 0) {
          tokens.push(`regions: ${exercise.regionTags.join(",")}`);
        }
        if (exercise.condition) {
          tokens.push(`if: ${exercise.condition}`);
        }

        lines.push(tokens.join(" / "));
      }

      lines.push("");
    }
  } else {
    for (const block of normalized.endurance.blocks) {
      const header =
        block.repeatCount > 1
          ? `${block.label} ${block.repeatCount}x`
          : block.label;
      lines.push(header);
      for (const segment of block.segments) {
        const targetToken =
          segment.target.type === "power_watts"
            ? `${segment.target.value}%`
            : segment.target.type === "pace"
              ? `pace:${segment.target.value}`
              : `hr:${segment.target.value}`;
        let line = `- ${durationToHumanToken(segment.durationSeconds)} ${targetToken}`;
        if (segment.cadenceRangeRpm) {
          line += ` ${segment.cadenceRangeRpm.min}-${segment.cadenceRangeRpm.max}rpm`;
        }
        if (segment.note && segment.note.trim().length > 0) {
          line += `, ${segment.note}`;
        }
        lines.push(line);
      }
      lines.push("");
    }
  }

  return lines.join("\n").trim();
}

export function parseRoutineDsl(input: string): ParseRoutineDslResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      errors: [
        formatHumanError(
          1,
          1,
          "Routine DSL input is empty.",
          'Start with: routine "Name" id:routine-id path:strength',
        ),
      ],
    };
  }

  if (trimmed.startsWith("{")) {
    try {
      const payload = JSON.parse(trimmed);
      return parseRoutineDslPayload(payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected JSON parse error.";
      return {
        ok: false,
        errors: [`Invalid JSON: ${message}`],
      };
    }
  }

  const parsedHumanDsl = parseHumanRoutineDsl(trimmed);
  if (!parsedHumanDsl.ok) {
    return parsedHumanDsl;
  }
  return parseRoutineDslPayload(parsedHumanDsl.payload);
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
