/* @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@fullcalendar/react", () => ({
  default: (props: {
    eventDrop?: (args: {
      event: { id: string; startStr: string };
      oldEvent: { startStr: string };
      revert: () => void;
    }) => void;
  }) => (
    <section aria-label="FullCalendar mock">
      <button
        type="button"
        onClick={() =>
          props.eventDrop?.({
            event: {
              id: "workout-strength-a",
              startStr: "2026-02-20",
            },
            oldEvent: {
              startStr: "2026-02-17",
            },
            revert: vi.fn(),
          })
        }
      >
        Trigger drag move
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

import { CalendarPageClient } from "../../src/app/calendar/calendar-page-client";
import { weeklyAuditResponseSample } from "../../src/features/calendar-audit/sample-data";

function extractNeuralValueForFeb17(): string {
  const detailsPanel = screen.getByRole("dialog", {
    name: /audit details for 2026-02-17/i,
  });
  const metricValues = detailsPanel.querySelectorAll("dd");
  const neuralValue = metricValues.item(0)?.textContent;
  if (!neuralValue) {
    throw new Error("Unable to resolve neural value for Feb 17 tooltip panel");
  }

  return neuralValue;
}

function nowMs(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

describe("CalendarPageClient real-path integration", () => {
  it("applies drag-drop move events through the full calendar surface within the end-to-end interaction budget", async () => {
    const user = userEvent.setup();

    render(<CalendarPageClient weeklyAudit={weeklyAuditResponseSample} />);

    expect(extractNeuralValueForFeb17()).toBe("7.4");

    const interactionStartedAtMs = nowMs();
    await user.click(
      screen.getByRole("button", {
        name: /trigger drag move/i,
      }),
    );

    await screen.findByText(/Audit recompute events applied: 1/i);
    expect(extractNeuralValueForFeb17()).toBe("6.5");

    const endToEndInteractionMs = nowMs() - interactionStartedAtMs;
    expect(endToEndInteractionMs).toBeLessThan(200);
  });
});
