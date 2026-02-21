import { weeklyAuditResponseSample } from "../../src/features/calendar-audit/sample-data";
import { recomputeWeeklyAuditResponse } from "../../src/features/calendar-audit/recompute";
import type { PlanningMutationEvent } from "../../src/features/planning-calendar/types";

describe("recomputeWeeklyAuditResponse", () => {
  it("applies add/move/remove planner mutations deterministically to weekly audit points", () => {
    const mutations: PlanningMutationEvent[] = [
      {
        mutationId: "mutation-1",
        type: "workout_added",
        workoutId: "workout-added-1",
        title: "Recovery ride",
        toDate: "2026-02-21",
        source: "drag_drop",
        occurredAt: "2026-02-21T08:00:00.000Z",
        workoutType: "recovery",
        intensity: "easy",
      },
      {
        mutationId: "mutation-2",
        type: "workout_moved",
        workoutId: "workout-strength-a",
        title: "Heavy lower",
        fromDate: "2026-02-17",
        toDate: "2026-02-20",
        source: "drag_drop",
        occurredAt: "2026-02-21T08:02:00.000Z",
        workoutType: "strength",
        intensity: "hard",
      },
      {
        mutationId: "mutation-3",
        type: "workout_removed",
        workoutId: "workout-tempo-1",
        title: "Tempo run",
        fromDate: "2026-02-21",
        source: "keyboard",
        occurredAt: "2026-02-21T08:05:00.000Z",
        workoutType: "endurance",
        intensity: "moderate",
      },
    ];

    const next = recomputeWeeklyAuditResponse(
      weeklyAuditResponseSample,
      mutations,
    );

    expect(next).not.toBe(weeklyAuditResponseSample);

    const baseFeb17 = weeklyAuditResponseSample.points.find(
      (point) => point.date === "2026-02-17",
    );
    const nextFeb17 = next.points.find((point) => point.date === "2026-02-17");
    expect(baseFeb17).toBeTruthy();
    expect(nextFeb17).toBeTruthy();
    expect(nextFeb17?.completedAxes.neural).toBeLessThan(
      baseFeb17?.completedAxes.neural ?? 0,
    );

    const baseFeb20 = weeklyAuditResponseSample.points.find(
      (point) => point.date === "2026-02-20",
    );
    const nextFeb20 = next.points.find((point) => point.date === "2026-02-20");
    expect(baseFeb20).toBeTruthy();
    expect(nextFeb20).toBeTruthy();
    expect(nextFeb20?.completedAxes.mechanical).toBeGreaterThan(
      baseFeb20?.completedAxes.mechanical ?? 0,
    );

    const baseFeb21 = weeklyAuditResponseSample.points.find(
      (point) => point.date === "2026-02-21",
    );
    const nextFeb21 = next.points.find((point) => point.date === "2026-02-21");
    expect(baseFeb21).toBeTruthy();
    expect(nextFeb21).toBeTruthy();
    expect(nextFeb21?.completedAxes.metabolic).toBeLessThan(
      baseFeb21?.completedAxes.metabolic ?? 0,
    );
  });
});
