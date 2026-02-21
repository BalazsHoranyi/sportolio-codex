import { weeklyAuditResponseSample } from "../../src/features/calendar-audit/sample-data";
import { buildWeeklyAuditViewModel } from "../../src/features/calendar-audit/view-model";

describe("buildWeeklyAuditViewModel", () => {
  it("builds deterministic chart coordinates for exactly seven daily points", () => {
    const viewModel = buildWeeklyAuditViewModel(weeklyAuditResponseSample);

    expect(viewModel.points).toHaveLength(7);
    expect(viewModel.series.neural).toHaveLength(7);
    expect(viewModel.series.metabolic).toHaveLength(7);
    expect(viewModel.series.mechanical).toHaveLength(7);
    expect(viewModel.thresholdValue).toBe(7);
  });

  it("treats threshold value 7.0 as inclusive red-zone boundary", () => {
    const response = structuredClone(weeklyAuditResponseSample);
    response.points[2].completedAxes.neural = 7;

    const viewModel = buildWeeklyAuditViewModel(response);
    const target = viewModel.series.neural[2];

    expect(target.value).toBe(7);
    expect(target.isHighRisk).toBe(true);
  });

  it("fills missing contributor hrefs with deterministic calendar session links", () => {
    const response = structuredClone(weeklyAuditResponseSample);
    response.points[0].contributors = [
      {
        sessionId: "live-session-42",
        label: "Live session",
      },
    ];

    const viewModel = buildWeeklyAuditViewModel(response);

    expect(viewModel.points[0].contributors[0].href).toBe(
      "/calendar?sessionId=live-session-42",
    );
  });
});
