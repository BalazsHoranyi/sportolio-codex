import {
  applyPlanningMutation,
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
      toDate: "2026-02-19",
      source: "drag_drop",
      occurredAt: "2026-02-21T07:00:00.000Z",
    });

    expect(
      moved.workouts.find(
        (workout) => workout.workoutId === "workout-strength-a",
      )?.date,
    ).toBe("2026-02-19");
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
});
