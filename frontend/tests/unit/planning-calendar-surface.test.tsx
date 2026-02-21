/* @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { fullCalendarPropsSpy } = vi.hoisted(() => ({
  fullCalendarPropsSpy: vi.fn<(value: unknown) => void>(),
}));

vi.mock("@fullcalendar/react", () => ({
  default: (props: Record<string, unknown>) => {
    fullCalendarPropsSpy(props);

    return (
      <section aria-label="FullCalendar mock">
        <button
          type="button"
          onClick={() =>
            (
              props.drop as (args: {
                dateStr: string;
                draggedEl: {
                  getAttribute: (attribute: string) => string | null;
                };
              }) => void
            )({
              dateStr: "2026-02-21",
              draggedEl: {
                getAttribute: (attribute) =>
                  attribute === "data-template-id"
                    ? "template-recovery-ride"
                    : null,
              },
            })
          }
        >
          Trigger external drop
        </button>
        <button
          type="button"
          onClick={() =>
            (
              props.eventDrop as (args: {
                event: { id: string; startStr: string };
                oldEvent: { startStr: string };
              }) => void
            )({
              event: { id: "workout-strength-a", startStr: "2026-02-22" },
              oldEvent: { startStr: "2026-02-17" },
            })
          }
        >
          Trigger event move
        </button>
      </section>
    );
  },
}));

vi.mock("@fullcalendar/daygrid", () => ({
  default: {},
}));

vi.mock("@fullcalendar/timegrid", () => ({
  default: {},
}));

vi.mock("@fullcalendar/interaction", () => ({
  default: {},
}));

import { PlanningCalendarSurface } from "../../src/features/planning-calendar/planning-calendar-surface";

describe("PlanningCalendarSurface", () => {
  beforeEach(() => {
    fullCalendarPropsSpy.mockClear();
  });

  it("renders calendar shell and emits add/move mutations from FullCalendar callbacks", async () => {
    const user = userEvent.setup();
    const onMutation = vi.fn();

    render(<PlanningCalendarSurface onMutation={onMutation} />);

    expect(
      screen.getByRole("heading", { name: /planning calendar/i }),
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: /trigger external drop/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /trigger event move/i }),
    );

    expect(onMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "workout_added",
        source: "drag_drop",
      }),
    );
    expect(onMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "workout_moved",
        source: "drag_drop",
      }),
    );
  });

  it("supports keyboard removal for scheduled workouts", async () => {
    const user = userEvent.setup();
    const onMutation = vi.fn();

    render(<PlanningCalendarSurface onMutation={onMutation} />);

    await user.click(
      screen.getByRole("button", {
        name: /remove heavy lower from schedule/i,
      }),
    );

    expect(onMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "workout_removed",
        source: "keyboard",
      }),
    );
  });
});
