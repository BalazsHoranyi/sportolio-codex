import { weeklyAuditResponseSample } from "../../src/features/calendar-audit/sample-data";
import {
  applyWeeklyAuditMutationIncrementally,
  recomputeWeeklyAuditResponse,
} from "../../src/features/calendar-audit/recompute";
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

  it("treats in-day reorder as a deterministic no-op for axis totals", () => {
    const mutations: PlanningMutationEvent[] = [
      {
        mutationId: "mutation-reorder-1",
        type: "workout_reordered",
        workoutId: "workout-strength-a",
        title: "Heavy lower",
        fromDate: "2026-02-17",
        toDate: "2026-02-17",
        fromOrder: 2,
        toOrder: 1,
        source: "keyboard",
        occurredAt: "2026-02-21T08:06:00.000Z",
        workoutType: "strength",
        intensity: "hard",
      },
    ];

    const next = recomputeWeeklyAuditResponse(
      weeklyAuditResponseSample,
      mutations,
    );

    expect(next).toBe(weeklyAuditResponseSample);
    expect(next.points).toEqual(weeklyAuditResponseSample.points);
  });

  it("applies a move mutation incrementally and preserves untouched point references", () => {
    const moveMutation: PlanningMutationEvent = {
      mutationId: "mutation-incremental-1",
      type: "workout_moved",
      workoutId: "workout-strength-a",
      title: "Heavy lower",
      fromDate: "2026-02-17",
      toDate: "2026-02-20",
      source: "drag_drop",
      occurredAt: "2026-02-21T08:02:00.000Z",
      workoutType: "strength",
      intensity: "hard",
    };

    const result = applyWeeklyAuditMutationIncrementally(
      weeklyAuditResponseSample,
      moveMutation,
    );

    expect(result.applied).toBe(true);
    expect(result.warning).toBeUndefined();
    expect(result.touchedDates).toEqual(["2026-02-17", "2026-02-20"]);
    expect(result.response.points).not.toBe(weeklyAuditResponseSample.points);

    const baseFeb18 = weeklyAuditResponseSample.points.find(
      (point) => point.date === "2026-02-18",
    );
    const nextFeb18 = result.response.points.find(
      (point) => point.date === "2026-02-18",
    );
    const baseFeb17 = weeklyAuditResponseSample.points.find(
      (point) => point.date === "2026-02-17",
    );
    const nextFeb17 = result.response.points.find(
      (point) => point.date === "2026-02-17",
    );

    expect(nextFeb18).toBe(baseFeb18);
    expect(nextFeb17).not.toBe(baseFeb17);
  });

  it("returns warning fallback for invalid mutation payloads and preserves chart state", () => {
    const invalidMove: PlanningMutationEvent = {
      mutationId: "mutation-invalid-1",
      type: "workout_moved",
      workoutId: "workout-strength-a",
      title: "Heavy lower",
      fromDate: "2026-02-17",
      source: "drag_drop",
      occurredAt: "2026-02-21T08:03:00.000Z",
      workoutType: "strength",
      intensity: "hard",
    };

    const result = applyWeeklyAuditMutationIncrementally(
      weeklyAuditResponseSample,
      invalidMove,
    );

    expect(result.applied).toBe(false);
    expect(result.warning).toMatch(/cannot be applied/i);
    expect(result.response).toBe(weeklyAuditResponseSample);
    expect(result.touchedDates).toEqual([]);
  });

  it("returns warning fallback when a mutation targets dates outside the loaded audit window", () => {
    const outOfWindowMove: PlanningMutationEvent = {
      mutationId: "mutation-out-of-window-1",
      type: "workout_moved",
      workoutId: "workout-strength-a",
      title: "Heavy lower",
      fromDate: "2026-03-01",
      toDate: "2026-03-02",
      source: "drag_drop",
      occurredAt: "2026-02-21T08:03:00.000Z",
      workoutType: "strength",
      intensity: "hard",
    };

    const result = applyWeeklyAuditMutationIncrementally(
      weeklyAuditResponseSample,
      outOfWindowMove,
    );

    expect(result.applied).toBe(false);
    expect(result.warning).toMatch(/outside the loaded weekly audit window/i);
    expect(result.response).toBe(weeklyAuditResponseSample);
    expect(result.touchedDates).toEqual([]);
  });

  it("reports finite, non-negative latency telemetry for standard-week move mutations", () => {
    const moveMutation: PlanningMutationEvent = {
      mutationId: "mutation-latency-1",
      type: "workout_moved",
      workoutId: "workout-strength-a",
      title: "Heavy lower",
      fromDate: "2026-02-17",
      toDate: "2026-02-20",
      source: "drag_drop",
      occurredAt: "2026-02-21T08:03:00.000Z",
      workoutType: "strength",
      intensity: "hard",
    };

    const result = applyWeeklyAuditMutationIncrementally(
      weeklyAuditResponseSample,
      moveMutation,
    );

    expect(Number.isFinite(result.durationMs)).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("computes latency telemetry deterministically under the 200ms budget", () => {
    const nowSpy = vi.spyOn(globalThis.performance, "now");
    const timestamps = [10, 142];
    nowSpy.mockImplementation(() => timestamps.shift() ?? 142);

    try {
      const moveMutation: PlanningMutationEvent = {
        mutationId: "mutation-latency-budget-1",
        type: "workout_moved",
        workoutId: "workout-strength-a",
        title: "Heavy lower",
        fromDate: "2026-02-17",
        toDate: "2026-02-20",
        source: "drag_drop",
        occurredAt: "2026-02-21T08:03:00.000Z",
        workoutType: "strength",
        intensity: "hard",
      };

      const result = applyWeeklyAuditMutationIncrementally(
        weeklyAuditResponseSample,
        moveMutation,
      );

      expect(result.durationMs).toBe(132);
      expect(result.durationMs).toBeLessThan(200);
    } finally {
      nowSpy.mockRestore();
    }
  });
});
