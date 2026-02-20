import type { MicrocycleUsageRequest, MuscleUsageApiResponse } from "./types";

export const muscleUsageRequestSample: MicrocycleUsageRequest = {
  microcycleId: "micro-1",
  microcycleName: "Base Week 1",
  routines: [
    {
      routineId: "routine-1",
      routineName: "Lower + Push",
      exercises: [
        {
          exerciseId: "ex-1",
          exerciseName: "Back Squat",
          workload: 120,
        },
        {
          exerciseId: "ex-2",
          exerciseName: "Bench Press",
          workload: 80,
        },
      ],
    },
    {
      routineId: "routine-2",
      routineName: "Pull + Run",
      exercises: [
        {
          exerciseId: "ex-3",
          exerciseName: "Barbell Row",
          workload: 60,
        },
        {
          exerciseId: "ex-4",
          exerciseName: "Running Easy",
          workload: 100,
        },
      ],
    },
  ],
};

export const muscleUsageSample: MuscleUsageApiResponse = {
  exerciseSummaries: [
    {
      routineId: "routine-1",
      exerciseId: "ex-1",
      exerciseName: "Back Squat",
      workload: 120,
      totalUsage: 120,
      muscleUsage: {
        quads: 60,
        glutes: 42,
        spinal_erectors: 18,
      },
    },
    {
      routineId: "routine-1",
      exerciseId: "ex-2",
      exerciseName: "Bench Press",
      workload: 80,
      totalUsage: 80,
      muscleUsage: {
        chest: 40,
        triceps: 24,
        front_delts: 16,
      },
    },
    {
      routineId: "routine-2",
      exerciseId: "ex-3",
      exerciseName: "Barbell Row",
      workload: 60,
      totalUsage: 60,
      muscleUsage: {
        lats: 27,
        rear_delts: 12,
        biceps: 12,
        spinal_erectors: 9,
      },
    },
    {
      routineId: "routine-2",
      exerciseId: "ex-4",
      exerciseName: "Running Easy",
      workload: 100,
      totalUsage: 100,
      muscleUsage: {
        quads: 35,
        hamstrings: 25,
        calves: 25,
        glutes: 15,
      },
    },
  ],
  routineSummaries: [
    {
      routineId: "routine-1",
      routineName: "Lower + Push",
      totalUsage: 200,
      muscleUsage: {
        chest: 40,
        front_delts: 16,
        glutes: 42,
        quads: 60,
        spinal_erectors: 18,
        triceps: 24,
      },
    },
    {
      routineId: "routine-2",
      routineName: "Pull + Run",
      totalUsage: 160,
      muscleUsage: {
        biceps: 12,
        calves: 25,
        glutes: 15,
        hamstrings: 25,
        lats: 27,
        quads: 35,
        rear_delts: 12,
        spinal_erectors: 9,
      },
    },
  ],
  microcycleSummary: {
    microcycleId: "micro-1",
    microcycleName: "Base Week 1",
    routineCount: 2,
    totalUsage: 360,
    muscleUsage: {
      biceps: 12,
      calves: 25,
      chest: 40,
      front_delts: 16,
      glutes: 57,
      hamstrings: 25,
      lats: 27,
      quads: 95,
      rear_delts: 12,
      spinal_erectors: 27,
      triceps: 24,
    },
  },
};
