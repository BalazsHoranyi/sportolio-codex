/* @vitest-environment jsdom */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CycleCreationFlow } from "../../src/features/planner/components/cycle-creation-flow";

describe("CycleCreationFlow", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("supports the full wizard path from macro to review", async () => {
    const user = userEvent.setup();

    render(<CycleCreationFlow />);

    await user.type(screen.getByLabelText(/plan name/i), "Spring Hybrid Block");
    await user.clear(screen.getByLabelText(/^start date$/i));
    await user.type(screen.getByLabelText(/^start date$/i), "2026-03-01");
    await user.clear(screen.getByLabelText(/target end date/i));
    await user.type(screen.getByLabelText(/target end date/i), "2026-06-01");
    await user.type(screen.getByLabelText(/goal title/i), "Deadlift 600 lb");
    await user.type(screen.getByLabelText(/target metric/i), "1RM deadlift");
    await user.clear(screen.getByLabelText(/goal target date/i));
    await user.type(screen.getByLabelText(/goal target date/i), "2026-05-10");

    await user.click(
      screen.getByRole("button", { name: /next: mesocycle strategy/i }),
    );
    expect(
      screen.getByRole("heading", { name: /mesocycle strategy/i }),
    ).toBeTruthy();

    await user.type(
      screen.getByLabelText(/mesocycle name/i),
      "Strength Accumulation",
    );
    await user.click(
      screen.getByRole("button", { name: /next: microcycle details/i }),
    );

    expect(
      screen.getByRole("heading", { name: /microcycle details/i }),
    ).toBeTruthy();

    await user.type(
      screen.getByLabelText(/workout label/i),
      "Heavy squat + accessory",
    );
    await user.click(screen.getByRole("button", { name: /next: review/i }));

    expect(
      screen.getByRole("heading", { name: /review and publish/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 3, name: /advisory warnings/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /alternative suggestions/i,
      }),
    ).toBeTruthy();
  });

  it("requires explicit unique priorities for multiple goals", async () => {
    const user = userEvent.setup();

    render(<CycleCreationFlow />);

    await user.click(screen.getByRole("button", { name: /add goal/i }));

    const prioritySelects = screen.getAllByLabelText(/priority rank/i);

    await user.selectOptions(prioritySelects[0] as HTMLSelectElement, "1");
    await user.selectOptions(prioritySelects[1] as HTMLSelectElement, "1");

    await user.click(
      screen.getByRole("button", { name: /next: mesocycle strategy/i }),
    );

    expect(
      screen.getByText(/each goal must have a unique priority rank/i),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /macro goals and events/i }),
    ).toBeTruthy();
  });

  it("supports draft save and restore after reload", async () => {
    const user = userEvent.setup();

    const view = render(<CycleCreationFlow />);

    await user.type(screen.getByLabelText(/plan name/i), "Saved Plan");
    await user.click(screen.getByRole("button", { name: /save draft/i }));

    expect(screen.getByText(/draft saved/i)).toBeTruthy();

    view.unmount();
    render(<CycleCreationFlow />);

    await waitFor(() => {
      expect(
        screen.getAllByText(/restored saved draft/i).length,
      ).toBeGreaterThan(0);
    });

    expect(
      (screen.getByLabelText(/plan name/i) as HTMLInputElement).value,
    ).toBe("Saved Plan");
  });
});
