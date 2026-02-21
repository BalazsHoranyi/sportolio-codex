import { buildPlannerReviewMuscleSummary } from "../../src/features/planner/review-muscle-summary";
import type { PlannerDraft } from "../../src/features/planner/types";

function createDraft(): PlannerDraft {
  return {
    planId: "plan-1",
    planName: "Hybrid",
    startDate: "2026-03-01",
    endDate: "2026-06-01",
    goals: [
      {
        goalId: "goal-1",
        title: "Deadlift 600",
        metric: "1RM",
        targetDate: "2026-05-20",
        modality: "strength",
        priority: 1,
      },
    ],
    events: [],
    mesocycles: [
      {
        mesocycleId: "meso-1",
        name: "Block",
        periodization: "block",
        focus: "hybrid",
        durationWeeks: 4,
        strategy: {
          block: {
            accumulationWeeks: 2,
            intensificationWeeks: 1,
            includeDeloadWeek: true,
            strengthBias: 50,
            enduranceBias: 40,
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
          day: "monday",
          label: "Tempo run",
          type: "endurance",
          intensity: "moderate",
        },
      ],
    },
  };
}

describe("buildPlannerReviewMuscleSummary", () => {
  it("returns deterministic microcycle, routine, and exercise drill-down data", () => {
    const draft = createDraft();

    const first = buildPlannerReviewMuscleSummary(draft);
    const second = buildPlannerReviewMuscleSummary(draft);

    expect(first).toEqual(second);
    expect(first.microcycleTotalUsage).toBeGreaterThan(0);
    expect(first.microcycleLegend.length).toBeGreaterThan(0);
    expect(first.routineContributions).toHaveLength(2);
    expect(first.exerciseContributions.length).toBeGreaterThanOrEqual(2);

    expect(first.routineContributions[0]?.drilldownId).toMatch(
      /^planner-review-routine-/,
    );
    expect(first.exerciseContributions[0]?.drilldownId).toMatch(
      /^planner-review-exercise-/,
    );
  });

  it("flags same-day overlap visually and clears warning when workouts are separated", () => {
    const draft = createDraft();

    const overlapSummary = buildPlannerReviewMuscleSummary(draft);

    expect(overlapSummary.overlapWarnings.length).toBeGreaterThan(0);
    expect(overlapSummary.overlapWarnings[0]?.detail).toMatch(/monday/i);

    draft.microcycle.workouts[1] = {
      ...draft.microcycle.workouts[1],
      day: "thursday",
    };

    const separatedSummary = buildPlannerReviewMuscleSummary(draft);
    expect(separatedSummary.overlapWarnings).toHaveLength(0);
  });

  it("uses deterministic fallback naming when workout labels are empty", () => {
    const draft = createDraft();
    draft.microcycle.workouts[0] = {
      ...draft.microcycle.workouts[0],
      label: "",
    };

    const summary = buildPlannerReviewMuscleSummary(draft);

    expect(summary.routineContributions[0]?.routineName).toBe("Workout 1");
    expect(
      summary.exerciseContributions[0]?.exerciseName.length,
    ).toBeGreaterThan(0);
  });
});
