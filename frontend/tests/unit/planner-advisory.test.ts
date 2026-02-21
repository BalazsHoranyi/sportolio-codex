import { evaluatePlannerAdvisories } from "../../src/features/planner/advisory";
import type { PlannerDraft } from "../../src/features/planner/types";

function createDraft(overrides: Partial<PlannerDraft> = {}): PlannerDraft {
  return {
    planId: "plan-1",
    planName: "Hybrid Spring Build",
    startDate: "2026-03-01",
    endDate: "2026-06-01",
    goals: [
      {
        goalId: "goal-1",
        title: "Deadlift 600 lb",
        metric: "1RM deadlift",
        targetDate: "2026-05-10",
        modality: "strength",
        priority: 1,
      },
      {
        goalId: "goal-2",
        title: "Sub 3:20 marathon",
        metric: "Race finish",
        targetDate: "2026-06-01",
        modality: "endurance",
        priority: 2,
      },
    ],
    events: [],
    mesocycles: [
      {
        mesocycleId: "meso-1",
        name: "Strength Accumulation",
        periodization: "block",
        focus: "strength",
        durationWeeks: 4,
        strategy: {
          block: {
            accumulationWeeks: 2,
            intensificationWeeks: 1,
            includeDeloadWeek: true,
            strengthBias: 60,
            enduranceBias: 30,
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
            peakWeek: 4,
          },
        },
      },
    ],
    microcycle: {
      workouts: [
        {
          workoutId: "w1",
          day: "monday",
          label: "Heavy squat",
          type: "strength",
          intensity: "hard",
        },
        {
          workoutId: "w2",
          day: "tuesday",
          label: "Threshold run",
          type: "endurance",
          intensity: "hard",
        },
        {
          workoutId: "w3",
          day: "wednesday",
          label: "Deadlift + sprints",
          type: "strength",
          intensity: "hard",
        },
      ],
    },
    ...overrides,
  };
}

describe("evaluatePlannerAdvisories", () => {
  it("flags duplicate priority ranks with explicit warning", () => {
    const draft = createDraft({
      goals: [
        {
          goalId: "goal-1",
          title: "Deadlift 600 lb",
          metric: "1RM deadlift",
          targetDate: "2026-05-10",
          modality: "strength",
          priority: 1,
        },
        {
          goalId: "goal-2",
          title: "Sub 3:20 marathon",
          metric: "Race finish",
          targetDate: "2026-06-01",
          modality: "endurance",
          priority: 1,
        },
      ],
    });

    const advisories = evaluatePlannerAdvisories(draft);

    expect(
      advisories.warnings.some(
        (warning) => warning.kind === "priority_conflict",
      ),
    ).toBe(true);
  });

  it("emits hard-stacking warning and an alternative suggestion", () => {
    const advisories = evaluatePlannerAdvisories(createDraft());

    expect(
      advisories.warnings.some((warning) => warning.kind === "hard_stacking"),
    ).toBe(true);
    expect(advisories.suggestions.length).toBeGreaterThan(0);
  });
});
