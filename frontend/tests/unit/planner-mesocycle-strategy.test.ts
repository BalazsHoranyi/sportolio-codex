import {
  buildMicrocycleReflowProjection,
  deriveMesocycleStrategy,
  deriveMesocycleStrategySet,
} from "../../src/features/planner/mesocycle-strategy";
import type {
  PlannerDraft,
  PlannerMesocycleDraft,
} from "../../src/features/planner/types";

function createMesocycle(
  overrides: Partial<PlannerMesocycleDraft> = {},
): PlannerMesocycleDraft {
  return {
    mesocycleId: "meso-1",
    name: "Strength Build",
    periodization: "block",
    focus: "strength",
    durationWeeks: 6,
    strategy: {
      block: {
        accumulationWeeks: 3,
        intensificationWeeks: 2,
        includeDeloadWeek: true,
        strengthBias: 65,
        enduranceBias: 25,
      },
      dup: {
        strengthSessionsPerWeek: 3,
        enduranceSessionsPerWeek: 2,
        recoverySessionsPerWeek: 1,
        intensityRotation: "alternating",
      },
      linear: {
        startIntensity: "moderate",
        weeklyProgressionPercent: 5,
        peakWeek: 6,
      },
    },
    ...overrides,
  };
}

function createDraft(
  overrides: Partial<PlannerDraft> = {},
  mesocycles: PlannerMesocycleDraft[] = [createMesocycle()],
): PlannerDraft {
  return {
    planId: "plan-1",
    planName: "Hybrid Build",
    startDate: "2026-03-01",
    endDate: "2026-06-01",
    goals: [],
    events: [],
    mesocycles,
    microcycle: {
      workouts: [
        {
          workoutId: "w-1",
          day: "monday",
          label: "Heavy squat",
          type: "strength",
          intensity: "hard",
        },
      ],
    },
    ...overrides,
  };
}

describe("mesocycle strategy engine", () => {
  it("derives deterministic block strategy outputs", () => {
    const mesocycle = createMesocycle();

    const first = deriveMesocycleStrategy(mesocycle);
    const second = deriveMesocycleStrategy(mesocycle);

    expect(second).toEqual(first);
    expect(first.validationErrors).toEqual([]);
    expect(first.emphasis.strengthPercent).toBeGreaterThan(
      first.emphasis.endurancePercent,
    );
    expect(first.projectedWeeks).toHaveLength(6);
    expect(first.projectedWeeks[0]?.phase).toBe("accumulation");
    expect(first.projectedWeeks[5]?.phase).toBe("deload");
  });

  it("derives DUP strategy wave with alternating intensities", () => {
    const mesocycle = createMesocycle({
      periodization: "dup",
      focus: "hybrid",
      durationWeeks: 4,
    });

    const result = deriveMesocycleStrategy(mesocycle);

    expect(result.validationErrors).toEqual([]);
    expect(result.projectedWeeks).toHaveLength(4);
    expect(result.projectedWeeks[0]?.intensityWave).toBe("high");
    expect(result.projectedWeeks[1]?.intensityWave).toBe("moderate");
    expect(result.emphasis.strengthPercent).toBeGreaterThan(0);
    expect(result.emphasis.endurancePercent).toBeGreaterThan(0);
  });

  it("derives linear progression with week-over-week load increase", () => {
    const mesocycle = createMesocycle({
      periodization: "linear",
      focus: "endurance",
      durationWeeks: 5,
      strategy: {
        ...createMesocycle().strategy,
        linear: {
          startIntensity: "easy",
          weeklyProgressionPercent: 8,
          peakWeek: 5,
        },
      },
    });

    const result = deriveMesocycleStrategy(mesocycle);

    expect(result.validationErrors).toEqual([]);
    expect(result.projectedWeeks).toHaveLength(5);
    expect(result.projectedWeeks[0]?.targetLoadPercent).toBe(100);
    expect(result.projectedWeeks[1]?.targetLoadPercent).toBe(108);
    expect(result.projectedWeeks[4]?.phase).toBe("peak");
  });

  it("emits validation errors for impossible block allocation", () => {
    const mesocycle = createMesocycle({
      durationWeeks: 4,
      strategy: {
        ...createMesocycle().strategy,
        block: {
          accumulationWeeks: 3,
          intensificationWeeks: 3,
          includeDeloadWeek: false,
          strengthBias: 60,
          enduranceBias: 30,
        },
      },
    });

    const result = deriveMesocycleStrategy(mesocycle);

    expect(result.validationErrors).toContain(
      "Block phase allocation exceeds mesocycle duration.",
    );
  });

  it("builds deterministic microcycle reflow projection for all mesocycles", () => {
    const mesocycles: PlannerMesocycleDraft[] = [
      createMesocycle({
        mesocycleId: "meso-1",
        periodization: "block",
        durationWeeks: 5,
      }),
      createMesocycle({
        mesocycleId: "meso-2",
        name: "Hybrid Transition",
        periodization: "dup",
        focus: "hybrid",
        durationWeeks: 3,
      }),
    ];

    const draft = createDraft({}, mesocycles);

    const first = buildMicrocycleReflowProjection(draft);
    const second = buildMicrocycleReflowProjection(draft);
    const resultSet = deriveMesocycleStrategySet(mesocycles);

    expect(second).toEqual(first);
    expect(first.rows).toHaveLength(8);
    expect(first.rows[0]?.mesocycleId).toBe("meso-1");
    expect(first.rows[7]?.mesocycleId).toBe("meso-2");
    expect(resultSet).toHaveLength(2);
  });
});
