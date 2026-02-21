/* @vitest-environment jsdom */

import {
  clearPlannerDraft,
  loadPlannerDraft,
  savePlannerDraft,
} from "../../src/features/planner/draft-storage";
import type { PlannerDraft } from "../../src/features/planner/types";

function createDraft(): PlannerDraft {
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
    ],
    mesocycles: [
      {
        mesocycleId: "meso-1",
        name: "Strength Accumulation",
        periodization: "block",
        focus: "strength",
        durationWeeks: 4,
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
      ],
    },
  };
}

describe("planner draft storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads planner draft deterministically", () => {
    const draft = createDraft();

    savePlannerDraft(draft);

    expect(loadPlannerDraft()).toEqual(draft);
  });

  it("returns null for malformed persisted payload", () => {
    localStorage.setItem("sportolo.planner.draft.v1", "{not-valid");

    expect(loadPlannerDraft()).toBeNull();
  });

  it("clears persisted planner draft", () => {
    savePlannerDraft(createDraft());

    clearPlannerDraft();

    expect(loadPlannerDraft()).toBeNull();
  });
});
