/* @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { weeklyAuditResponseSample } from "../../src/features/calendar-audit/sample-data";
import { CalendarPageClient } from "../../src/app/calendar/calendar-page-client";

vi.mock(
  "../../src/features/planning-calendar/planning-calendar-surface",
  () => ({
    PlanningCalendarSurface: ({
      onMutation,
    }: {
      onMutation?: (mutation: {
        mutationId: string;
        type: "workout_moved";
        workoutId: string;
        title: string;
        fromDate?: string;
        toDate?: string;
        source: "drag_drop";
        occurredAt: string;
        workoutType: "strength";
        intensity: "hard";
      }) => void;
    }) => (
      <>
        <button
          type="button"
          onClick={() =>
            onMutation?.({
              mutationId: "mutation-test-move-1",
              type: "workout_moved",
              workoutId: "workout-strength-a",
              title: "Heavy lower",
              fromDate: "2026-02-17",
              toDate: "2026-02-20",
              source: "drag_drop",
              occurredAt: "2026-02-21T09:00:00.000Z",
              workoutType: "strength",
              intensity: "hard",
            })
          }
        >
          Emit planner move
        </button>
        <button
          type="button"
          onClick={() =>
            onMutation?.({
              mutationId: "mutation-test-invalid-1",
              type: "workout_moved",
              workoutId: "workout-strength-a",
              title: "Heavy lower",
              fromDate: "2026-02-17",
              source: "drag_drop",
              occurredAt: "2026-02-21T09:01:00.000Z",
              workoutType: "strength",
              intensity: "hard",
            })
          }
        >
          Emit invalid mutation
        </button>
      </>
    ),
  }),
);

vi.mock("../../src/features/calendar-audit/weekly-audit-chart", () => ({
  WeeklyAuditChart: ({
    response,
  }: {
    response: {
      points: Array<{
        date: string;
        completedAxes: { neural: number };
      }>;
    };
  }) => {
    const target = response.points.find((point) => point.date === "2026-02-17");
    return (
      <output data-testid="weekly-audit-neural-feb17">
        {target?.completedAxes.neural.toFixed(2)}
      </output>
    );
  },
}));

describe("CalendarPageClient integration", () => {
  it("recomputes weekly audit response when planning calendar emits move mutation events", async () => {
    const user = userEvent.setup();

    render(<CalendarPageClient weeklyAudit={weeklyAuditResponseSample} />);

    const before = screen.getByTestId("weekly-audit-neural-feb17").textContent;
    expect(before).toBe("7.40");

    await user.click(
      screen.getByRole("button", {
        name: /emit planner move/i,
      }),
    );

    const after = screen.getByTestId("weekly-audit-neural-feb17").textContent;
    expect(after).not.toBe(before);
    expect(screen.getByText(/Audit recompute events applied: 1/i)).toBeTruthy();
  });

  it("keeps prior chart values and surfaces a non-blocking warning when mutation payload is invalid", async () => {
    const user = userEvent.setup();

    render(<CalendarPageClient weeklyAudit={weeklyAuditResponseSample} />);

    const before = screen.getByTestId("weekly-audit-neural-feb17").textContent;
    expect(before).toBe("7.40");

    await user.click(
      screen.getByRole("button", {
        name: /emit invalid mutation/i,
      }),
    );

    expect(screen.getByText(/calendar recompute warning/i)).toBeTruthy();
    const after = screen.getByTestId("weekly-audit-neural-feb17").textContent;
    expect(after).toBe(before);
    expect(screen.getByText(/Audit recompute events applied: 0/i)).toBeTruthy();
  });

  it("keeps move interaction latency under 200ms for the standard week payload", async () => {
    const user = userEvent.setup();

    render(<CalendarPageClient weeklyAudit={weeklyAuditResponseSample} />);

    const startedAtMs = performance.now();
    await user.click(
      screen.getByRole("button", {
        name: /emit planner move/i,
      }),
    );
    await screen.findByText(/Audit recompute events applied: 1/i);

    const elapsedMs = performance.now() - startedAtMs;
    expect(elapsedMs).toBeLessThan(200);
  });
});
