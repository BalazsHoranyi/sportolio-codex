export type RoutinePath = "strength" | "endurance";

export type EnduranceTargetType = "power_watts" | "pace" | "heart_rate";

export interface StrengthExerciseDraft {
  exerciseId: string;
  canonicalName: string;
  selectedEquipment: string | null;
  regionTags: string[];
}

export interface EnduranceIntervalDraft {
  intervalId: string;
  label: string;
  durationSeconds: number;
  targetType: EnduranceTargetType;
  targetValue: number;
}

export interface RoutineDraft {
  routineId: string;
  routineName: string;
  path: RoutinePath;
  strength: {
    exercises: StrengthExerciseDraft[];
  };
  endurance: {
    intervals: EnduranceIntervalDraft[];
  };
}

export function createInitialRoutineDraft(): RoutineDraft {
  return {
    routineId: "routine-hybrid-a",
    routineName: "Hybrid Builder",
    path: "strength",
    strength: {
      exercises: [],
    },
    endurance: {
      intervals: [],
    },
  };
}
