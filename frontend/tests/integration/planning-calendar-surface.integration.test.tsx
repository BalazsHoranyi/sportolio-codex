/* @vitest-environment jsdom */

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PlanningCalendarSurface } from "../../src/features/planning-calendar/planning-calendar-surface";

describe("planning calendar surface integration", () => {
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
});
