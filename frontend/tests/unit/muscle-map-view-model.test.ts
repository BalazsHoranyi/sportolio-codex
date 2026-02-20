import { createMuscleMapViewModel } from "../../src/features/muscle-map/view-model";
import type { MuscleUsageApiResponse } from "../../src/features/muscle-map/types";

const responseFixture: MuscleUsageApiResponse = {
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
      routineName: "Endurance",
      totalUsage: 100,
      muscleUsage: {
        quads: 35,
        hamstrings: 25,
        calves: 25,
        glutes: 15,
      },
    },
  ],
  microcycleSummary: {
    microcycleId: "micro-1",
    microcycleName: "Base Week 1",
    routineCount: 2,
    totalUsage: 300,
    muscleUsage: {
      chest: 40,
      front_delts: 16,
      glutes: 57,
      quads: 95,
      spinal_erectors: 18,
      triceps: 24,
      hamstrings: 25,
      calves: 25,
    },
  },
};

describe("createMuscleMapViewModel", () => {
  it("defaults to the first routine and first exercise when none are selected", () => {
    const viewModel = createMuscleMapViewModel(responseFixture, {});

    expect(viewModel.selectedRoutineId).toBe("routine-1");
    expect(viewModel.selectedExerciseId).toBe("ex-1");
    expect(viewModel.exerciseDisplayName).toBe("Back Squat");
    expect(viewModel.exerciseMap).toEqual([
      { slug: "gluteal", intensity: 3 },
      { slug: "lower-back", intensity: 2 },
      { slug: "quadriceps", intensity: 4 },
    ]);
  });

  it("updates selected exercise when routine selection changes", () => {
    const viewModel = createMuscleMapViewModel(responseFixture, {
      routineId: "routine-2",
      exerciseId: "ex-2",
    });

    expect(viewModel.selectedRoutineId).toBe("routine-2");
    expect(viewModel.selectedExerciseId).toBe("ex-3");
    expect(viewModel.exerciseDisplayName).toBe("Running Easy");
    expect(viewModel.routineDisplayName).toBe("Endurance");
    expect(viewModel.routineMap).toEqual([
      { slug: "calves", intensity: 3 },
      { slug: "gluteal", intensity: 3 },
      { slug: "hamstring", intensity: 3 },
      { slug: "quadriceps", intensity: 4 },
    ]);
  });

  it("returns safe fallback selections for empty API payload arrays", () => {
    const viewModel = createMuscleMapViewModel(
      {
        exerciseSummaries: [],
        routineSummaries: [],
        microcycleSummary: {
          microcycleId: "micro-1",
          microcycleName: "Base Week 1",
          routineCount: 0,
          totalUsage: 0,
          muscleUsage: {},
        },
      },
      {},
    );

    expect(viewModel.selectedRoutineId).toBe("");
    expect(viewModel.selectedExerciseId).toBe("");
    expect(viewModel.exerciseDisplayName).toBe("No exercise data");
    expect(viewModel.routineDisplayName).toBe("No routine data");
    expect(viewModel.exerciseOptions).toEqual([]);
    expect(viewModel.routineOptions).toEqual([]);
    expect(viewModel.exerciseMap).toEqual([]);
    expect(viewModel.routineMap).toEqual([]);
    expect(viewModel.microcycleMap).toEqual([]);
  });
});
