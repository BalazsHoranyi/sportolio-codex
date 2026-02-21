/* @vitest-environment jsdom */

import React from "react";
import { act, render, screen } from "@testing-library/react";
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
              props.eventReceive as (args: {
                event: {
                  startStr: string;
                  extendedProps: {
                    templateId?: string;
                  };
                  remove: () => void;
                };
              }) => void
            )({
              event: {
                startStr: "2026-02-21",
                extendedProps: {
                  templateId: "template-recovery-ride",
                },
                remove: vi.fn(),
              },
            })
          }
        >
          Trigger external receive
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
  Draggable: vi.fn(() => ({
    destroy: vi.fn(),
  })),
}));

import { PlanningCalendarSurface } from "../../src/features/planning-calendar/planning-calendar-surface";

describe("PlanningCalendarSurface", () => {
  beforeEach(() => {
    fullCalendarPropsSpy.mockClear();
  });

  function mockInsideRemoveZoneRect(element: HTMLElement) {
    return vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      top: 0,
      right: 100,
      bottom: 80,
      left: 0,
      toJSON: () => ({}),
    } as DOMRect);
  }

  it("renders calendar shell and emits add/move mutations from FullCalendar callbacks", async () => {
    const user = userEvent.setup();
    const onMutation = vi.fn();

    render(<PlanningCalendarSurface onMutation={onMutation} />);

    expect(
      screen.getByRole("heading", { name: /planning calendar/i }),
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: /trigger external receive/i }),
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

  it("emits drag-drop removal when drag stops inside the remove zone", () => {
    const onMutation = vi.fn();

    render(<PlanningCalendarSurface onMutation={onMutation} />);

    const removeZone = screen.getByLabelText(/workout remove zone/i);
    mockInsideRemoveZoneRect(removeZone);

    const fullCalendarProps = fullCalendarPropsSpy.mock.calls.at(-1)?.[0] as
      | {
          eventDragStart: (args: { event: { id: string } }) => void;
          eventDragStop: (args: {
            jsEvent: { clientX: number; clientY: number };
          }) => void;
        }
      | undefined;

    expect(fullCalendarProps).toBeTruthy();
    act(() => {
      fullCalendarProps?.eventDragStart({
        event: { id: "workout-strength-a" },
      });
      fullCalendarProps?.eventDragStop({
        jsEvent: { clientX: 50, clientY: 40 },
      });
    });

    expect(onMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "workout_removed",
        source: "drag_drop",
        workoutId: "workout-strength-a",
        fromDate: "2026-02-17",
      }),
    );
  });

  it("exposes keyboard add button with readable spacing for assistive tech", () => {
    render(<PlanningCalendarSurface />);

    expect(
      screen.getByRole("button", {
        name: "Add recovery ride to Saturday, Feb 21",
      }),
    ).toBeTruthy();
  });

  it("defaults to month view on narrow viewports for mobile readability", () => {
    const originalWidth = window.innerWidth;
    try {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: 390,
        writable: true,
      });

      render(<PlanningCalendarSurface />);

      expect(fullCalendarPropsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          initialView: "dayGridMonth",
        }),
      );
    } finally {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: originalWidth,
        writable: true,
      });
    }
  });

  it("renders remove zone before calendar so drag-remove target stays visible", () => {
    const { container } = render(<PlanningCalendarSurface />);

    const calendarMain = container.querySelector(".planning-calendar-main");
    expect(calendarMain).toBeTruthy();
    const firstElement = calendarMain?.firstElementChild;
    expect(firstElement?.className).toContain("planning-remove-zone");
  });
});
