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

function extractRecommendedWindowDates(): {
  suggestedStartDate: string;
  suggestedEndDate: string;
} {
  const recommendation = screen.getByText(/recommended window:/i).textContent;
  if (!recommendation) {
    throw new Error("Unable to resolve recommended macro window text");
  }

  const match = recommendation.match(
    /recommended window:\s*(\d{4}-\d{2}-\d{2})\s*to\s*(\d{4}-\d{2}-\d{2})/i,
  );
  if (!match?.[1] || !match[2]) {
    throw new Error(
      `Unable to parse recommended window dates from: "${recommendation}"`,
    );
  }

  return {
    suggestedStartDate: match[1],
    suggestedEndDate: match[2],
  };
}

function extractLastMesocycleBandEndDate(): string {
  const list = screen.getByRole("list", {
    name: /macro timeline mesocycles/i,
  });
  const items = Array.from(list.querySelectorAll("li"));
  const lastItem = items[items.length - 1];
  const text = lastItem?.textContent;
  if (!text) {
    throw new Error("Unable to resolve last mesocycle timeline band");
  }

  const match = text.match(/to\s*(\d{4}-\d{2}-\d{2})/i);
  if (!match?.[1]) {
    throw new Error(`Unable to parse last mesocycle band date from: "${text}"`);
  }

  return match[1];
}

function diffDays(leftIsoDate: string, rightIsoDate: string): number {
  const leftDate = new Date(`${leftIsoDate}T00:00:00.000Z`);
  const rightDate = new Date(`${rightIsoDate}T00:00:00.000Z`);
  return Math.floor((rightDate.getTime() - leftDate.getTime()) / 86_400_000);
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

  it("keeps timeline controls consistent when applying selected recommended dates during auto-sync", async () => {
    const user = userEvent.setup();

    render(<CycleCreationFlow />);

    await user.selectOptions(
      screen.getByLabelText(/macro template profile/i),
      "powerlifting_5k",
    );
    await user.click(screen.getByRole("button", { name: /apply template/i }));

    await user.selectOptions(
      screen.getByLabelText(/macro template profile/i),
      "triathlon_strength",
    );

    const recommendedWindow = extractRecommendedWindowDates();

    await user.click(
      screen.getByRole("button", { name: /use recommended dates/i }),
    );

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/^start date$/i) as HTMLInputElement).value,
      ).toBe(recommendedWindow.suggestedStartDate);
      expect(
        (screen.getByLabelText(/target end date/i) as HTMLInputElement).value,
      ).toBe(recommendedWindow.suggestedEndDate);
    });
  });

  it("uses the selected template for future auto-sync updates after using selected recommended dates", async () => {
    const user = userEvent.setup();

    render(<CycleCreationFlow />);

    await user.selectOptions(
      screen.getByLabelText(/macro template profile/i),
      "powerlifting_5k",
    );
    await user.click(screen.getByRole("button", { name: /apply template/i }));

    await user.selectOptions(
      screen.getByLabelText(/macro template profile/i),
      "triathlon_strength",
    );
    await user.click(
      screen.getByRole("button", { name: /use recommended dates/i }),
    );

    await user.clear(screen.getByLabelText(/event date/i));
    await user.type(screen.getByLabelText(/event date/i), "2026-08-15");

    await waitFor(() => {
      const recommendation = extractRecommendedWindowDates();
      expect(
        (screen.getByLabelText(/^start date$/i) as HTMLInputElement).value,
      ).toBe(recommendation.suggestedStartDate);
      expect(
        (screen.getByLabelText(/target end date/i) as HTMLInputElement).value,
      ).toBe(recommendation.suggestedEndDate);
    });
  });

  it("keeps mesocycle bands aligned to the synced macro window when event dates move", async () => {
    const user = userEvent.setup();

    render(<CycleCreationFlow />);

    await user.selectOptions(
      screen.getByLabelText(/macro template profile/i),
      "powerlifting_5k",
    );
    await user.click(screen.getByRole("button", { name: /apply template/i }));

    await user.clear(screen.getByLabelText(/event date/i));
    await user.type(screen.getByLabelText(/event date/i), "2026-08-15");

    await waitFor(() => {
      const targetEndDate = (
        screen.getByLabelText(/target end date/i) as HTMLInputElement
      ).value;
      const lastBandEndDate = extractLastMesocycleBandEndDate();
      const offsetDays = diffDays(targetEndDate, lastBandEndDate);
      expect(targetEndDate).toBeTruthy();
      expect(offsetDays).toBeGreaterThanOrEqual(0);
      expect(offsetDays).toBeLessThan(7);
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
