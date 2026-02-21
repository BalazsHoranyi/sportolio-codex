/* @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CycleCreationFlow } from "../../src/features/planner/components/cycle-creation-flow";

function expectVisibleControlsToHaveLabelMetadata() {
  const controls = Array.from(
    document.querySelectorAll("input, select"),
  ) as Array<HTMLInputElement | HTMLSelectElement>;

  expect(controls.length).toBeGreaterThan(0);

  controls.forEach((control) => {
    const id = control.getAttribute("id");
    const name = control.getAttribute("name");

    expect(id).toBeTruthy();
    expect(name).toBeTruthy();

    if (!id) {
      return;
    }

    expect(document.querySelector(`label[for="${id}"]`)).toBeTruthy();
  });
}

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

  it("supports explicit event setup and surfaces it in review", async () => {
    const user = userEvent.setup();

    render(<CycleCreationFlow />);

    await user.type(screen.getByLabelText(/plan name/i), "Spring race build");
    await user.type(screen.getByLabelText(/^start date$/i), "2026-03-01");
    await user.type(screen.getByLabelText(/target end date/i), "2026-06-01");
    await user.type(screen.getByLabelText(/goal title/i), "Run PR");
    await user.type(screen.getByLabelText(/target metric/i), "Sub-1:40 half");
    await user.type(screen.getByLabelText(/goal target date/i), "2026-05-25");

    await user.click(screen.getByRole("button", { name: /add event/i }));
    await user.type(
      screen.getByLabelText(/event name/i),
      "Spring half marathon",
    );
    await user.type(screen.getByLabelText(/event date/i), "2026-05-24");

    await user.click(
      screen.getByRole("button", { name: /next: mesocycle strategy/i }),
    );
    await user.type(
      screen.getByLabelText(/mesocycle name/i),
      "Specific preparation",
    );
    await user.click(
      screen.getByRole("button", { name: /next: microcycle details/i }),
    );
    await user.type(screen.getByLabelText(/workout label/i), "Long tempo run");
    await user.click(screen.getByRole("button", { name: /next: review/i }));

    expect(
      screen.getByRole("heading", { name: /review and publish/i }),
    ).toBeTruthy();
    expect(screen.getByText(/spring half marathon/i)).toBeTruthy();
  });

  it("applies a macro template and keeps generated fields editable", async () => {
    const user = userEvent.setup();

    render(<CycleCreationFlow />);

    await user.selectOptions(
      screen.getByLabelText(/macro template profile/i),
      "triathlon_strength",
    );
    await user.click(screen.getByRole("button", { name: /apply template/i }));

    expect(
      (screen.getByLabelText(/plan name/i) as HTMLInputElement).value,
    ).toBe("Triathlon + Strength Build");
    expect(
      (screen.getAllByLabelText(/goal title/i)[0] as HTMLInputElement).value,
    ).toContain("Triathlon");

    await user.clear(screen.getByLabelText(/plan name/i));
    await user.type(screen.getByLabelText(/plan name/i), "Custom tri build");
    expect(
      (screen.getByLabelText(/plan name/i) as HTMLInputElement).value,
    ).toBe("Custom tri build");

    await user.clear(screen.getAllByLabelText(/goal title/i)[0]);
    await user.type(
      screen.getAllByLabelText(/goal title/i)[0],
      "Custom A race",
    );
    expect(
      (screen.getAllByLabelText(/goal title/i)[0] as HTMLInputElement).value,
    ).toBe("Custom A race");
  });

  it("updates macro timeline dates when an event date moves after template apply", async () => {
    const user = userEvent.setup();

    render(<CycleCreationFlow />);

    await user.selectOptions(
      screen.getByLabelText(/macro template profile/i),
      "powerlifting_5k",
    );
    await user.click(screen.getByRole("button", { name: /apply template/i }));

    const endDateInput = screen.getByLabelText(
      /target end date/i,
    ) as HTMLInputElement;
    const initialEndDate = endDateInput.value;

    await user.clear(screen.getByLabelText(/event date/i));
    await user.type(screen.getByLabelText(/event date/i), "2026-08-15");

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/target end date/i) as HTMLInputElement).value,
      ).not.toBe(initialEndDate);
    });
  });

  it("does not mutate timeline dates when browsing templates before re-applying", async () => {
    const user = userEvent.setup();

    render(<CycleCreationFlow />);

    await user.selectOptions(
      screen.getByLabelText(/macro template profile/i),
      "powerlifting_5k",
    );
    await user.click(screen.getByRole("button", { name: /apply template/i }));

    const startDateInput = screen.getByLabelText(
      /^start date$/i,
    ) as HTMLInputElement;
    const endDateInput = screen.getByLabelText(
      /target end date/i,
    ) as HTMLInputElement;

    const appliedStartDate = startDateInput.value;
    const appliedEndDate = endDateInput.value;

    await user.selectOptions(
      screen.getByLabelText(/macro template profile/i),
      "triathlon_strength",
    );

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/^start date$/i) as HTMLInputElement).value,
      ).toBe(appliedStartDate);
      expect(
        (screen.getByLabelText(/target end date/i) as HTMLInputElement).value,
      ).toBe(appliedEndDate);
    });
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
      expect(screen.getAllByText(/restored saved draft/i)).toHaveLength(1);
    });

    expect(
      (screen.getByLabelText(/plan name/i) as HTMLInputElement).value,
    ).toBe("Saved Plan");
  });

  it("provides id and name metadata for visible controls on each editable step", async () => {
    const user = userEvent.setup();

    render(<CycleCreationFlow />);

    expectVisibleControlsToHaveLabelMetadata();

    await user.type(screen.getByLabelText(/plan name/i), "Metadata validation");
    await user.type(screen.getByLabelText(/^start date$/i), "2026-03-01");
    await user.type(screen.getByLabelText(/target end date/i), "2026-06-01");
    await user.type(screen.getByLabelText(/goal title/i), "Goal");
    await user.type(screen.getByLabelText(/target metric/i), "Metric");
    await user.type(screen.getByLabelText(/goal target date/i), "2026-05-25");
    await user.click(
      screen.getByRole("button", { name: /next: mesocycle strategy/i }),
    );

    expectVisibleControlsToHaveLabelMetadata();

    await user.type(screen.getByLabelText(/mesocycle name/i), "Build");
    await user.click(
      screen.getByRole("button", { name: /next: microcycle details/i }),
    );

    expectVisibleControlsToHaveLabelMetadata();
  });

  it("preserves strategy-specific values across strategy switching and reflows projections", async () => {
    const user = userEvent.setup();

    render(<CycleCreationFlow />);

    await user.type(screen.getByLabelText(/plan name/i), "Strategy plan");
    await user.type(screen.getByLabelText(/^start date$/i), "2026-03-01");
    await user.type(screen.getByLabelText(/target end date/i), "2026-06-01");
    await user.type(screen.getByLabelText(/goal title/i), "Deadlift 600");
    await user.type(screen.getByLabelText(/target metric/i), "1RM");
    await user.type(screen.getByLabelText(/goal target date/i), "2026-05-20");

    await user.click(
      screen.getByRole("button", { name: /next: mesocycle strategy/i }),
    );

    await user.type(screen.getByLabelText(/mesocycle name/i), "Primary block");

    fireEvent.change(screen.getByLabelText(/block accumulation weeks/i), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText(/block intensification weeks/i), {
      target: { value: "2" },
    });

    expect(screen.getByText(/expected modality emphasis/i)).toBeTruthy();
    expect(screen.getByText(/upcoming microcycle reflow/i)).toBeTruthy();

    await user.selectOptions(
      screen.getByLabelText(/periodization type/i),
      "linear",
    );
    fireEvent.change(screen.getByLabelText(/weekly progression %/i), {
      target: { value: "7" },
    });

    await user.selectOptions(
      screen.getByLabelText(/periodization type/i),
      "block",
    );

    expect(
      (screen.getByLabelText(/block accumulation weeks/i) as HTMLInputElement)
        .value,
    ).toBe("2");
    expect(screen.getByText(/week 1/i)).toBeTruthy();
  });
});
