import {
  addExerciseToRoutineDraft,
  filterAndRankExercises,
  nextExerciseOptionIndex,
  toRoutineDsl,
  type RoutineDraft,
  type SearchableExerciseCatalogItem,
} from "../../src/features/exercise-picker/state";

const catalogFixture: SearchableExerciseCatalogItem[] = [
  {
    id: "global-split-squat",
    canonicalName: "Split Squat",
    aliases: ["Barbell Split Squat", "DB Split Squat"],
    regionTags: ["quads", "glutes", "hamstrings"],
    equipmentOptions: ["barbell", "dumbbell"],
  },
  {
    id: "global-pallof-press",
    canonicalName: "Pallof Press",
    aliases: ["Cable Pallof Press", "Band Pallof Press"],
    regionTags: ["core", "obliques"],
    equipmentOptions: ["cable", "band"],
  },
  {
    id: "global-running-easy",
    canonicalName: "Running Easy",
    aliases: [],
    regionTags: ["quads", "hamstrings", "calves"],
    equipmentOptions: [],
  },
];

function emptyDraft(): RoutineDraft {
  return {
    routineId: "routine-strength-a",
    routineName: "Strength A",
    exercises: [],
  };
}

describe("exercise picker state helpers", () => {
  it("returns typo-tolerant fuzzy search matches for common misspellings", () => {
    const results = filterAndRankExercises({
      catalog: catalogFixture,
      searchText: "splt sqaut",
      equipmentFilter: "all",
      muscleFilter: "all",
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.canonicalName).toBe("Split Squat");
  });

  it("supports combined equipment and muscle facets", () => {
    const results = filterAndRankExercises({
      catalog: catalogFixture,
      searchText: "",
      equipmentFilter: "cable",
      muscleFilter: "core",
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.canonicalName).toBe("Pallof Press");
  });

  it("binds selected exercise metadata into routine draft and DSL output", () => {
    const next = addExerciseToRoutineDraft(emptyDraft(), {
      exercise: catalogFixture[0],
      equipment: "barbell",
    });

    expect(next.exercises).toHaveLength(1);
    expect(next.exercises[0]).toEqual({
      exerciseId: "global-split-squat",
      canonicalName: "Split Squat",
      selectedEquipment: "barbell",
      regionTags: ["quads", "glutes", "hamstrings"],
    });

    const dsl = toRoutineDsl(next);
    expect(dsl).toContain('"exerciseId": "global-split-squat"');
    expect(dsl).toContain('"selectedEquipment": "barbell"');
    expect(dsl).toContain('"regionTags": [');
    expect(dsl).toContain('"quads"');
    expect(dsl).toContain('"glutes"');
    expect(dsl).toContain('"hamstrings"');
  });

  it("supports keyboard-first option navigation with wraparound behavior", () => {
    expect(
      nextExerciseOptionIndex({
        activeIndex: -1,
        itemCount: 3,
        key: "ArrowDown",
      }),
    ).toBe(0);
    expect(
      nextExerciseOptionIndex({
        activeIndex: 2,
        itemCount: 3,
        key: "ArrowDown",
      }),
    ).toBe(0);
    expect(
      nextExerciseOptionIndex({ activeIndex: 0, itemCount: 3, key: "ArrowUp" }),
    ).toBe(2);
    expect(
      nextExerciseOptionIndex({ activeIndex: 1, itemCount: 3, key: "Enter" }),
    ).toBe(1);
  });
});
