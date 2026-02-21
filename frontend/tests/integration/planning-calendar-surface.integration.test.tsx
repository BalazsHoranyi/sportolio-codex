/* @vitest-environment jsdom */

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@fullcalendar/react", () => ({
  default: (props: Record<string, unknown>) => (
    <section aria-label="FullCalendar mock">
      <button
        type="button"
        onClick={() =>
          (
            props.eventDrop as (args: {
              event: { id: string; startStr: string };
              oldEvent: { startStr: string };
            }) => void
          )({
            event: { id: "workout-strength-a", startStr: "2026-02-20" },
            oldEvent: { startStr: "2026-02-17" },
          })
        }
      >
        Trigger drag move
      </button>
      <button
        type="button"
        onClick={() => {
          (props.eventDragStart as (args: { event: { id: string } }) => void)({
            event: { id: "workout-strength-a" },
          });
          (
            props.eventDragStop as (args: {
              jsEvent: { clientX: number; clientY: number };
            }) => void
          )({
            jsEvent: { clientX: 24, clientY: 24 },
          });
        }}
      >
        Trigger drag remove
      </button>
    </section>
  ),
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

describe("planning calendar surface integration", () => {
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

  it("supports add, move, and remove flows while emitting recompute entries", async () => {
    const user = userEvent.setup();

    render(<PlanningCalendarSurface />);

    await user.click(
      screen.getByRole("button", {
        name: "Add recovery ride to Saturday, Feb 21",
      }),
    );

    const scheduledRegion = screen.getByRole("region", {
      name: /scheduled workouts/i,
    });
    const addedRow = within(scheduledRegion)
      .getAllByText("Recovery ride", { selector: "strong" })
      .at(0)
      ?.closest("li");
    expect(addedRow).toBeTruthy();

    const rowWithin = within(addedRow as HTMLElement);
    await user.selectOptions(
      rowWithin.getByRole("combobox", { name: /move target day/i }),
      "2026-02-22",
    );
    await user.click(
      rowWithin.getByRole("button", {
        name: /move recovery ride to selected day/i,
      }),
    );

    await waitFor(() => {
      expect(
        rowWithin.getByText("Recovery ride").closest("li")?.textContent ?? "",
      ).toContain("Sunday, Feb 22");
    });

    await user.click(
      rowWithin.getByRole("button", {
        name: /remove recovery ride from schedule/i,
      }),
    );

    await waitFor(() => {
      expect(
        within(scheduledRegion).queryByText("Recovery ride", {
          selector: "strong",
        }),
      ).toBeNull();
    });

    const recomputeRegion = screen.getByRole("region", {
      name: /calendar recompute events/i,
    });
    expect(within(recomputeRegion).getByText(/workout_added/i)).toBeTruthy();
    expect(within(recomputeRegion).getByText(/workout_moved/i)).toBeTruthy();
    expect(within(recomputeRegion).getByText(/workout_removed/i)).toBeTruthy();
  });

  it("keeps keyboard move targets in sync after drag-move callbacks", async () => {
    const user = userEvent.setup();

    render(<PlanningCalendarSurface />);

    await user.click(
      screen.getByRole("button", {
        name: /trigger drag move/i,
      }),
    );

    const scheduledRegion = screen.getByRole("region", {
      name: /scheduled workouts/i,
    });
    const heavyLowerRow = within(scheduledRegion)
      .getByText("Heavy lower", { selector: "strong" })
      .closest("li");
    expect(heavyLowerRow).toBeTruthy();

    const heavyLowerWithin = within(heavyLowerRow as HTMLElement);
    await waitFor(() => {
      expect(
        heavyLowerWithin.getByText("Friday, Feb 20", {
          selector: "p",
          exact: false,
        }),
      ).toBeTruthy();
    });

    const moveTargetSelect = heavyLowerWithin.getByRole("combobox", {
      name: /move target day/i,
    }) as HTMLSelectElement;
    expect(moveTargetSelect.value).toBe("2026-02-20");

    const recomputeRegion = screen.getByRole("region", {
      name: /calendar recompute events/i,
    });
    expect(
      within(recomputeRegion).getByText(/from 2026-02-17 to 2026-02-20/i),
    ).toBeTruthy();

    await user.click(
      heavyLowerWithin.getByRole("button", {
        name: /move heavy lower to selected day/i,
      }),
    );

    await waitFor(() => {
      expect(
        within(recomputeRegion).getAllByText(/workout_moved/i),
      ).toHaveLength(1);
    });
    expect(
      within(recomputeRegion).queryByText(/from 2026-02-20 to 2026-02-17/i),
    ).toBeNull();
  });

  it("removes a workout from drag-stop callback and logs drag_drop recompute source", async () => {
    const user = userEvent.setup();

    render(<PlanningCalendarSurface />);

    const removeZone = screen.getByLabelText(/workout remove zone/i);
    mockInsideRemoveZoneRect(removeZone);

    await user.click(
      screen.getByRole("button", {
        name: /trigger drag remove/i,
      }),
    );

    const scheduledRegion = screen.getByRole("region", {
      name: /scheduled workouts/i,
    });
    await waitFor(() => {
      expect(
        within(scheduledRegion).queryByText("Heavy lower", {
          selector: "strong",
        }),
      ).toBeNull();
    });

    const recomputeRegion = screen.getByRole("region", {
      name: /calendar recompute events/i,
    });
    expect(within(recomputeRegion).getByText(/workout_removed/i)).toBeTruthy();
    expect(
      within(recomputeRegion).getByText(/Source: drag_drop/i),
    ).toBeTruthy();
  });
});
