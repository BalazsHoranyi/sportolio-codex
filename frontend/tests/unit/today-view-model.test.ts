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

  it("prefers backend explainability contributors and exposes contribution share labels", () => {
    const snapshot = structuredClone(todayAccumulationResponseSample) as {
      explainability?: unknown;
    };
    snapshot.explainability = {
      neural: {
        scoreValue: 8,
        thresholdState: "high",
        axisMeaning: "Neural readiness.",
        decisionHint: "Back off high-skill work.",
        contributors: [
          {
            sessionId: "completed-before-boundary",
            label: "Heavy lower session",
            href: "/calendar?sessionId=completed-before-boundary",
            contributionMagnitude: 8,
            contributionShare: 1,
          },
        ],
      },
      metabolic: {
        scoreValue: 4,
        thresholdState: "moderate",
        axisMeaning: "Metabolic strain.",
        decisionHint: "Consolidate hard work.",
        contributors: [],
      },
      mechanical: {
        scoreValue: 3,
        thresholdState: "low",
        axisMeaning: "Mechanical strain.",
        decisionHint: "Proceed as planned.",
        contributors: [],
      },
      recruitment: {
        scoreValue: 5,
        thresholdState: "moderate",
        axisMeaning: "Recruitment demand.",
        decisionHint: "Watch high-threshold stacking.",
        contributors: [],
      },
      combined: {
        scoreValue: 5.3333,
        thresholdState: "moderate",
        axisMeaning: "Combined risk.",
        decisionHint: "Monitor readiness.",
        contributors: [
          {
            sessionId: "completed-before-boundary",
            label: "Heavy lower session",
            href: "/calendar?sessionId=completed-before-boundary",
            contributionMagnitude: 5.3333,
            contributionShare: 1,
          },
        ],
      },
    };

    const viewModel = buildTodayDashboardViewModel(
      snapshot as typeof todayAccumulationResponseSample,
    );

    expect(viewModel.whyThisLinks).toHaveLength(1);
    expect(viewModel.whyThisLinks[0]?.label).toBe("Heavy lower session");
    expect(viewModel.whyThisLinks[0]?.shareLabel).toBe("100%");
    expect(viewModel.gauges[0]?.tooltip).toContain("Neural readiness");
  });
});
