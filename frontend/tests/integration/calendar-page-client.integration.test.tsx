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
        type: "workout_added";
        workoutId: string;
        title: string;
        toDate: string;
        source: "keyboard";
        occurredAt: string;
        workoutType: "recovery";
        intensity: "easy";
      }) => void;
    }) => (
      <button
        type="button"
        onClick={() =>
          onMutation?.({
            mutationId: "mutation-test-1",
            type: "workout_added",
            workoutId: "workout-added-test",
            title: "Recovery ride",
            toDate: "2026-02-21",
            source: "keyboard",
            occurredAt: "2026-02-21T09:00:00.000Z",
            workoutType: "recovery",
            intensity: "easy",
          })
        }
      >
        Emit planner mutation
      </button>
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
    const target = response.points.find((point) => point.date === "2026-02-21");
    return (
      <output data-testid="weekly-audit-neural-feb21">
        {target?.completedAxes.neural.toFixed(2)}
      </output>
    );
  },
}));

describe("CalendarPageClient integration", () => {
  it("recomputes weekly audit response when planning calendar emits mutation events", async () => {
    const user = userEvent.setup();

    render(<CalendarPageClient weeklyAudit={weeklyAuditResponseSample} />);

    const before = screen.getByTestId("weekly-audit-neural-feb21").textContent;
    expect(before).toBe("7.10");

    await user.click(
      screen.getByRole("button", {
        name: /emit planner mutation/i,
      }),
    );

    const after = screen.getByTestId("weekly-audit-neural-feb21").textContent;
    expect(after).not.toBe(before);
  });
});
