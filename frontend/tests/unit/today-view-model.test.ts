import { buildTodayDashboardViewModel } from "../../src/features/today/view-model";
import {
  todayAccumulationResponseSample,
  todayContributorSample,
} from "../../src/features/today/sample-data";

describe("today view-model", () => {
  it("filters why-this links to included sessions only", () => {
    const viewModel = buildTodayDashboardViewModel(
      todayAccumulationResponseSample,
      todayContributorSample,
    );

    expect(viewModel.whyThisLinks).toHaveLength(1);
    expect(viewModel.whyThisLinks[0]?.sessionId).toBe(
      "completed-before-boundary",
    );
  });

  it("creates default contributor links when custom contributors are absent", () => {
    const viewModel = buildTodayDashboardViewModel(
      todayAccumulationResponseSample,
    );

    expect(viewModel.whyThisLinks[0]?.href).toBe(
      "/calendar?sessionId=completed-before-boundary",
    );
  });

  it("marks combined score at exactly 7.0 as high threshold", () => {
    const viewModel = buildTodayDashboardViewModel({
      ...todayAccumulationResponseSample,
      combinedScore: {
        ...todayAccumulationResponseSample.combinedScore,
        value: 7,
      },
    });

    expect(viewModel.combinedThresholdState).toBe("high");
  });

  it("clamps out-of-range axis values for gauges", () => {
    const viewModel = buildTodayDashboardViewModel({
      ...todayAccumulationResponseSample,
      accumulatedFatigue: {
        neural: 99,
        metabolic: -2,
        mechanical: 11,
        recruitment: 12,
      },
    });

    expect(viewModel.gauges.find((gauge) => gauge.id === "neural")?.value).toBe(
      10,
    );
    expect(
      viewModel.gauges.find((gauge) => gauge.id === "metabolic")?.value,
    ).toBe(0);
    expect(viewModel.recruitmentValue).toBe(10);
  });
});
