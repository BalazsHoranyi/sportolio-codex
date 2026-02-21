export type RoutinePath = "strength" | "endurance";

export type EnduranceTargetType = "power_watts" | "pace" | "heart_rate";
export type StrengthLoadUnit = "kg" | "lb" | "percent_1rm";
export type StrengthProgressionStrategy =
  | "linear_add_load"
  | "linear_add_reps"
  | "percentage_wave";

export const ROUTINE_DSL_VERSION = "2.0" as const;

export interface RoutineLineageReferences {
  macrocycleId: string | null;
  mesocycleId: string | null;
  microcycleId: string | null;
}

export interface StrengthSetProgressionDraft {
  strategy: StrengthProgressionStrategy;
  value: number;
}

export interface StrengthSetLoadDraft {
  unit: StrengthLoadUnit;
  value: number;
}

export interface StrengthSetDraft {
  setId: string;
  reps: number;
  restSeconds: number;
  timerSeconds: number | null;
  load: StrengthSetLoadDraft | null;
  rpe: number | null;
  rir: number | null;
  progression: StrengthSetProgressionDraft | null;
}

export interface StrengthExerciseDraft {
  instanceId: string;
  exerciseId: string;
  canonicalName: string;
  selectedEquipment: string | null;
  regionTags: string[];
  condition: string | null;
  note?: string | null;
  sets: StrengthSetDraft[];
}

export interface StrengthVariableDraft {
  variableId: string;
  name: string;
  expression: string;
}

export interface StrengthBlockDraft {
  blockId: string;
  label: string;
  repeatCount: number;
  condition: string | null;
  weekLabel?: string | null;
  dayLabel?: string | null;
  exercises: StrengthExerciseDraft[];
}

export interface CadenceRangeRpmDraft {
  min: number;
  max: number;
}

export interface EnduranceIntervalDraft {
  intervalId: string;
  label: string;
  durationSeconds: number;
  targetType: EnduranceTargetType;
  targetValue: number;
  cadenceRangeRpm?: CadenceRangeRpmDraft | null;
  note?: string | null;
}

export interface EnduranceSegmentDraft {
  segmentId: string;
  label: string;
  durationSeconds: number;
  target: {
    type: EnduranceTargetType;
    value: number;
  };
  cadenceRangeRpm?: CadenceRangeRpmDraft | null;
  note?: string | null;
}

export interface EnduranceBlockDraft {
  blockId: string;
  label: string;
  repeatCount: number;
  segments: EnduranceSegmentDraft[];
}

export interface RoutineDraft {
  dslVersion: typeof ROUTINE_DSL_VERSION;
  references: RoutineLineageReferences;
  routineId: string;
  routineName: string;
  path: RoutinePath;
  strength: {
    variables: StrengthVariableDraft[];
    blocks: StrengthBlockDraft[];
  };
  endurance: {
    intervals: EnduranceIntervalDraft[];
    blocks: EnduranceBlockDraft[];
  };
}

export function createDefaultStrengthSet(setId = "set-1"): StrengthSetDraft {
  return {
    setId,
    reps: 8,
    restSeconds: 120,
    timerSeconds: null,
    load: null,
    rpe: null,
    rir: null,
    progression: null,
  };
}

export function createInitialRoutineDraft(): RoutineDraft {
  return {
    dslVersion: ROUTINE_DSL_VERSION,
    references: {
      macrocycleId: null,
      mesocycleId: null,
      microcycleId: null,
    },
    routineId: "routine-hybrid-a",
    routineName: "Hybrid Builder",
    path: "strength",
    strength: {
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
    },
    endurance: {
      intervals: [],
      blocks: [],
    },
  };
}
