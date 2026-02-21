import { renderToStaticMarkup } from "react-dom/server";

import type { TodayAccumulationResponse } from "../../src/features/today/types";

const { loadTodaySnapshotMock } = vi.hoisted(() => ({
  loadTodaySnapshotMock:
    vi.fn<() => Promise<TodayAccumulationResponse | undefined>>(),
}));

vi.mock("../../src/features/today/api", () => ({
  loadTodaySnapshot: loadTodaySnapshotMock,
}));

import TodayPage from "../../src/app/today/page";

describe("TodayPage", () => {
  it("renders today dashboard inside the shared authenticated shell", async () => {
    loadTodaySnapshotMock.mockResolvedValueOnce({
      asOf: "2026-02-20T15:00:00Z",
      boundary: {
        boundaryStart: "2026-02-19T00:00:00-05:00",
        boundaryEnd: "2026-02-20T05:45:00-05:00",
        boundarySource: "sleep_event",
        timezone: "America/New_York",
      },
      includedSessionIds: ["completed-before-boundary"],
      excludedSessionIds: ["planned-before-boundary"],
      accumulatedFatigue: {
        neural: 8,
        metabolic: 4,
        mechanical: 3,
        recruitment: 5,
      },
      combinedScore: {
        value: 5.3333,
        interpretation: "probability next hard session degrades adaptation",
        debug: {
          workoutType: "strength",
          defaultSleepApplied: false,
          baseWeights: {
            metabolic: 0.45,
            mechanical: 0.35,
            recruitment: 0.2,
          },
          modifierWeights: {
            metabolic: 0.85,
            mechanical: 1.15,
            recruitment: 1.25,
          },
          effectiveWeights: {
            metabolic: 0.3696,
            mechanical: 0.3889,
            recruitment: 0.2415,
          },
          baseWeightedScore: 3.8527,
          neuralGateFactor: 1.27,
          neuralGatedScore: 4.8929,
          capacityGateFactor: 1.09,
          capacityGatedScore: 5.3333,
        },
      },
    });

    const html = renderToStaticMarkup(await TodayPage());

    expect(html).toContain("Today");
    expect(html).toContain("Daily readiness and execution context.");
    expect(html).toContain("Today fatigue snapshot");
    expect(html).toContain("Combined fatigue score");
    expect(html).toContain("System capacity");
    expect(html).toContain('aria-current="page"');
    expect(html.match(/<h1\b/g)?.length).toBe(1);
  });

  it("falls back to deterministic sample data when API loader returns undefined", async () => {
    loadTodaySnapshotMock.mockResolvedValueOnce(undefined);

    const html = renderToStaticMarkup(await TodayPage());

    expect(html).toContain("Today fatigue snapshot");
    expect(html).toContain("Boundary source");
  });

  it("renders default contributor links from loaded session IDs when contributor metadata is unavailable", async () => {
    loadTodaySnapshotMock.mockResolvedValueOnce({
      asOf: "2026-02-20T15:00:00Z",
      boundary: {
        boundaryStart: "2026-02-19T00:00:00-05:00",
        boundaryEnd: "2026-02-20T05:45:00-05:00",
        boundarySource: "sleep_event",
        timezone: "America/New_York",
      },
      includedSessionIds: ["live-session-42"],
      excludedSessionIds: ["planned-before-boundary"],
      accumulatedFatigue: {
        neural: 8,
        metabolic: 4,
        mechanical: 3,
        recruitment: 5,
      },
      combinedScore: {
        value: 5.3333,
        interpretation: "probability next hard session degrades adaptation",
        debug: {
          workoutType: "strength",
          defaultSleepApplied: false,
          baseWeights: {
            metabolic: 0.45,
            mechanical: 0.35,
            recruitment: 0.2,
          },
          modifierWeights: {
            metabolic: 0.85,
            mechanical: 1.15,
            recruitment: 1.25,
          },
          effectiveWeights: {
            metabolic: 0.3696,
            mechanical: 0.3889,
            recruitment: 0.2415,
          },
          baseWeightedScore: 3.8527,
          neuralGateFactor: 1.27,
          neuralGatedScore: 4.8929,
          capacityGateFactor: 1.09,
          capacityGatedScore: 5.3333,
        },
      },
    });

    const html = renderToStaticMarkup(await TodayPage());

    expect(html).toContain("live-session-42");
    expect(html).toContain("/calendar?sessionId=live-session-42");
  });

  it("falls back to deterministic sample data when API loader throws", async () => {
    loadTodaySnapshotMock.mockRejectedValueOnce(new Error("request failed"));

    await expect(
      (async () => renderToStaticMarkup(await TodayPage()))(),
    ).resolves.toContain("Today fatigue snapshot");
  });
});
