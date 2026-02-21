import {
  applyPlanningMutation,
  applyPlanningMutationWithOutcome,
  createInitialPlanningCalendarState,
} from "../../src/features/planning-calendar/mutations";

describe("planning calendar mutations", () => {
  it("moves a workout to a different day and appends mutation log entry", () => {
    const state = createInitialPlanningCalendarState();
    const moved = applyPlanningMutation(state, {
      mutationId: "mutation-move-1",
      type: "workout_moved",
      workoutId: "workout-strength-a",
      title: "Heavy lower",
      fromDate: "2026-02-17",
      toDate: "2026-02-18",
      fromOrder: 1,
      toOrder: 1,
      source: "drag_drop",
      occurredAt: "2026-02-21T07:00:00.000Z",
    });

    expect(
      moved.workouts.find(
        (workout) => workout.workoutId === "workout-strength-a",
      )?.date,
    ).toBe("2026-02-18");
    expect(
      moved.workouts.find(
        (workout) => workout.workoutId === "workout-strength-a",
      )?.sessionOrder,
    ).toBe(1);
    expect(moved.mutationLog.at(-1)?.type).toBe("workout_moved");
  });

  it("adds and removes workouts deterministically", () => {
    const state = createInitialPlanningCalendarState();
    const added = applyPlanningMutation(state, {
      mutationId: "mutation-add-1",
      type: "workout_added",
      workoutId: "workout-added-a",
      title: "Recovery ride",
      toDate: "2026-02-21",
      toOrder: 1,
      source: "drag_drop",
      occurredAt: "2026-02-21T07:01:00.000Z",
    });

    expect(
      added.workouts.some((workout) => workout.workoutId === "workout-added-a"),
    ).toBe(true);

    const removed = applyPlanningMutation(added, {
      mutationId: "mutation-remove-1",
      type: "workout_removed",
      workoutId: "workout-added-a",
      title: "Recovery ride",
      fromDate: "2026-02-21",
      fromOrder: 1,
      source: "keyboard",
      occurredAt: "2026-02-21T07:02:00.000Z",
    });

    expect(
      removed.workouts.some(
        (workout) => workout.workoutId === "workout-added-a",
      ),
    ).toBe(false);
    expect(removed.mutationLog.at(-1)?.type).toBe("workout_removed");
  });

  it("blocks overlap moves by default and allows explicit overrides", () => {
    const state = createInitialPlanningCalendarState();

    const blocked = applyPlanningMutationWithOutcome(state, {
      mutationId: "mutation-overlap-blocked",
      type: "workout_moved",
      workoutId: "workout-endurance-a",
      title: "Tempo run",
      fromDate: "2026-02-19",
      toDate: "2026-02-17",
      source: "drag_drop",
      occurredAt: "2026-02-21T07:03:00.000Z",
    });

    expect(blocked.applied).toBe(false);
    expect(blocked.requiresOverride).toBe(true);
    expect(blocked.recomputeRequired).toBe(false);
    expect(
      blocked.state.workouts.find(
        (workout) => workout.workoutId === "workout-endurance-a",
      )?.date,
    ).toBe("2026-02-19");

    const overridden = applyPlanningMutationWithOutcome(state, {
      mutationId: "mutation-overlap-override",
      type: "workout_moved",
      workoutId: "workout-endurance-a",
      title: "Tempo run",
      fromDate: "2026-02-19",
      toDate: "2026-02-17",
      source: "drag_drop",
      occurredAt: "2026-02-21T07:04:00.000Z",
      allowOverlap: true,
    });

    expect(overridden.applied).toBe(true);
    expect(overridden.appliedMutation?.overrideApplied).toBe(true);
    expect(overridden.recomputeRequired).toBe(true);
    expect(
      overridden.state.workouts.filter(
        (workout) => workout.date === "2026-02-17",
      ),
    ).toHaveLength(2);
  });

  it("supports in-day reorder while preserving workout identity and history", () => {
    const state = createInitialPlanningCalendarState();
    const withSecondWorkout = applyPlanningMutationWithOutcome(state, {
      mutationId: "mutation-add-overlap",
      type: "workout_added",
      workoutId: "workout-added-a",
      title: "Recovery ride",
      toDate: "2026-02-17",
      source: "keyboard",
      occurredAt: "2026-02-21T07:05:00.000Z",
      allowOverlap: true,
      workoutType: "recovery",
      intensity: "easy",
    });

    expect(withSecondWorkout.applied).toBe(true);

    const reordered = applyPlanningMutationWithOutcome(
      withSecondWorkout.state,
      {
        mutationId: "mutation-reorder-a",
        type: "workout_reordered",
        workoutId: "workout-added-a",
        title: "Recovery ride",
        fromDate: "2026-02-17",
        toDate: "2026-02-17",
        fromOrder: 2,
        toOrder: 1,
        source: "keyboard",
        occurredAt: "2026-02-21T07:06:00.000Z",
      },
    );

    expect(reordered.applied).toBe(true);
    expect(reordered.recomputeRequired).toBe(true);

    const sameDay = reordered.state.workouts.filter(
      (workout) => workout.date === "2026-02-17",
    );
    expect(sameDay).toHaveLength(2);
    expect(sameDay.map((workout) => workout.workoutId)).toEqual([
      "workout-added-a",
      "workout-strength-a",
    ]);
    expect(
      reordered.state.workoutHistory["workout-added-a"].map(
        (entry) => entry.type,
      ),
    ).toContain("workout_reordered");
  });
});
