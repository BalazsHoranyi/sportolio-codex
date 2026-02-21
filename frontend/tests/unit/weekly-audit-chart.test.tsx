/* @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { weeklyAuditResponseSample } from "../../src/features/calendar-audit/sample-data";
import { WeeklyAuditChart } from "../../src/features/calendar-audit/weekly-audit-chart";

describe("WeeklyAuditChart", () => {
  it("renders seven point markers for each primary fatigue axis", () => {
    render(<WeeklyAuditChart response={weeklyAuditResponseSample} />);

    expect(screen.getAllByTestId("axis-neural-point")).toHaveLength(7);
    expect(screen.getAllByTestId("axis-metabolic-point")).toHaveLength(7);
    expect(screen.getAllByTestId("axis-mechanical-point")).toHaveLength(7);
  });

  it("renders recruitment overlay and red threshold zone", () => {
    render(<WeeklyAuditChart response={weeklyAuditResponseSample} />);

    expect(screen.getByTestId("recruitment-overlay-band")).toBeTruthy();
    expect(screen.getByTestId("red-threshold-zone")).toBeTruthy();
    expect(screen.getAllByText("Red zone ≥ 7.0").length).toBeGreaterThan(0);
  });

  it("shows explainability session links in the point tooltip", async () => {
    const user = userEvent.setup();
    render(<WeeklyAuditChart response={weeklyAuditResponseSample} />);

    const firstPointButton = screen.getByRole("button", {
      name: /show audit details for 2026-02-17/i,
    });
    await user.click(firstPointButton);

    expect(
      screen.getByRole("dialog", { name: /audit details for 2026-02-17/i }),
    ).toBeTruthy();

    const contributorLink = screen.getByRole("link", {
      name: /heavy lower session/i,
    });
    expect(contributorLink.getAttribute("href")).toBe(
      "/calendar?sessionId=completed-before-boundary",
    );
  });

  it("falls back gracefully when a point has no contributors", async () => {
    const user = userEvent.setup();
    const response = structuredClone(weeklyAuditResponseSample);
    response.points[0].contributors = [];

    render(<WeeklyAuditChart response={response} />);

    const firstPointButton = screen.getByRole("button", {
      name: /show audit details for 2026-02-17/i,
    });
    await user.click(firstPointButton);

    expect(
      screen.getByText(/no contributor sessions for this day/i),
    ).toBeTruthy();
  });
});
