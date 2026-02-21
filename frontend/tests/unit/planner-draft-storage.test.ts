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
    events: [
      {
        eventId: "event-1",
        name: "Regional meet",
        eventDate: "2026-05-20",
        eventType: "meet",
      },
    ],
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

  it("loads legacy persisted payloads that predate events support", () => {
    const legacyDraft = createDraft();
    localStorage.setItem(
      "sportolo.planner.draft.v1",
      JSON.stringify({
        ...legacyDraft,
        events: undefined,
      }),
    );

    expect(loadPlannerDraft()).toEqual({
      ...legacyDraft,
      events: [],
    });
  });

  it("loads legacy persisted payloads that predate mesocycle strategy support", () => {
    const legacyDraft = createDraft();
    localStorage.setItem(
      "sportolo.planner.draft.v1",
      JSON.stringify({
        ...legacyDraft,
        mesocycles: legacyDraft.mesocycles.map((mesocycle) => ({
          mesocycleId: mesocycle.mesocycleId,
          name: mesocycle.name,
          periodization: mesocycle.periodization,
          focus: mesocycle.focus,
          durationWeeks: mesocycle.durationWeeks,
        })),
      }),
    );

    const loaded = loadPlannerDraft();

    expect(loaded).toBeTruthy();
    expect(loaded?.mesocycles[0]?.strategy.block.accumulationWeeks).toBe(2);
    expect(loaded?.mesocycles[0]?.strategy.linear.peakWeek).toBe(4);
  });

  it("clears persisted planner draft", () => {
    savePlannerDraft(createDraft());

    clearPlannerDraft();

    expect(loadPlannerDraft()).toBeNull();
  });
});
