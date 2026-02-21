/* @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CycleCreationFlow } from "../../src/features/planner/components/cycle-creation-flow";

function readMicrocycleTotalUsage(): number {
  const valueText = screen.getByText(/microcycle total usage:/i).textContent;
  const match = valueText?.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) {
    throw new Error("Could not parse microcycle total usage value.");
  }

  return Number.parseFloat(match[1]);
}

async function advanceToMicrocycleStep(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.type(screen.getByLabelText(/plan name/i), "SPRT-70 Plan");
  await user.type(screen.getByLabelText(/^start date$/i), "2026-03-01");
  await user.type(screen.getByLabelText(/target end date/i), "2026-06-01");
  await user.type(screen.getByLabelText(/goal title/i), "Deadlift 600");
  await user.type(screen.getByLabelText(/target metric/i), "1RM");
  await user.type(screen.getByLabelText(/goal target date/i), "2026-05-20");

  await user.click(
    screen.getByRole("button", { name: /next: mesocycle strategy/i }),
  );

  await user.type(screen.getByLabelText(/mesocycle name/i), "Strength Build");

  await user.click(
    screen.getByRole("button", { name: /next: microcycle details/i }),
  );
}

describe("planner review microcycle muscle map integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("refreshes summary after add, move, and remove workout edits", async () => {
    const user = userEvent.setup();

    render(<CycleCreationFlow />);

    await advanceToMicrocycleStep(user);

    await user.type(screen.getByLabelText(/workout label/i), "Heavy squat");

    await user.click(screen.getByRole("button", { name: /next: review/i }));

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /microcycle muscle map summary/i,
      }),
    ).toBeTruthy();

    const baselineUsage = readMicrocycleTotalUsage();

    await user.click(screen.getByRole("button", { name: /^back$/i }));

    await user.click(screen.getByRole("button", { name: /add workout/i }));

    const workoutLabels = screen.getAllByLabelText(/workout label/i);
    await user.type(workoutLabels[1] as HTMLInputElement, "Tempo run");

    await user.click(screen.getByRole("button", { name: /next: review/i }));

    const usageAfterAdd = readMicrocycleTotalUsage();
    expect(usageAfterAdd).toBeGreaterThan(baselineUsage);

    expect(screen.getByText(/high-overlap days/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /jump to routines/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /jump to exercises/i }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^back$/i }));

    const workoutDays = screen.getAllByLabelText(/day/i);
    await user.selectOptions(workoutDays[1] as HTMLSelectElement, "thursday");

    await user.click(screen.getByRole("button", { name: /next: review/i }));

    expect(
      screen.queryByRole("list", { name: /high-overlap day warnings/i }),
    ).toBeNull();
    expect(screen.getByText(/no high-overlap days detected/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^back$/i }));

    await user.click(
      screen.getAllByRole("button", { name: /remove workout/i })[1],
    );

    await user.click(screen.getByRole("button", { name: /next: review/i }));

    const usageAfterRemove = readMicrocycleTotalUsage();
    expect(usageAfterRemove).toBe(baselineUsage);
  });
});
