/* @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";

import type {
  TodayAccumulationResponse,
  TodayContributorSession,
} from "../../src/features/today/types";
import { TodayDashboard } from "../../src/features/today/today-dashboard";

function buildSnapshot(
  overrides?: Partial<TodayAccumulationResponse>,
): TodayAccumulationResponse {
  return {
    asOf: "2026-02-20T15:00:00Z",
    boundary: {
      boundaryStart: "2026-02-19T00:00:00-05:00",
      boundaryEnd: "2026-02-20T05:45:00-05:00",
      boundarySource: "sleep_event",
      timezone: "America/New_York",
    },
    includedSessionIds: ["completed-before-boundary"],
    excludedSessionIds: ["planned-before-boundary", "completed-after-boundary"],
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
    ...overrides,
  };
}

describe("TodayDashboard", () => {
  it("renders axis gauges, recruitment badge, and separate combined-vs-capacity sections", () => {
    render(<TodayDashboard snapshot={buildSnapshot()} />);

    expect(
      screen.getByRole("region", { name: /today bento layout/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /today fatigue snapshot/i }),
    ).toBeTruthy();
    expect(screen.getByText("Neural")).toBeTruthy();
    expect(screen.getByText("Metabolic")).toBeTruthy();
    expect(screen.getByText("Mechanical")).toBeTruthy();
    expect(screen.getByText(/Recruitment/i)).toBeTruthy();

    expect(screen.getByTestId("combined-score-card")).toBeTruthy();
    expect(screen.getByTestId("capacity-card")).toBeTruthy();
    expect(screen.getByText(/Combined fatigue score/i)).toBeTruthy();
    expect(screen.getByText(/System capacity/i)).toBeTruthy();
  });

  it("treats combined score at exactly 7.0 as threshold reached", () => {
    render(
      <TodayDashboard
        snapshot={buildSnapshot({
          combinedScore: {
            ...buildSnapshot().combinedScore,
            value: 7,
          },
        })}
      />,
    );

    const combinedCard = screen.getByTestId("combined-score-card");
    expect(combinedCard.getAttribute("data-threshold-state")).toBe("high");
    expect(screen.getByText(/threshold reached/i)).toBeTruthy();
  });

  it("renders why-this chips only for sessions inside includedSessionIds", () => {
    const contributors: TodayContributorSession[] = [
      {
        sessionId: "completed-before-boundary",
        label: "Heavy lower session",
        href: "/calendar?sessionId=completed-before-boundary",
      },
      {
        sessionId: "planned-before-boundary",
        label: "Planned tempo run",
        href: "/calendar?sessionId=planned-before-boundary",
      },
    ];

    render(
      <TodayDashboard snapshot={buildSnapshot()} contributors={contributors} />,
    );

    const includedLink = screen.getByRole("link", {
      name: /heavy lower session/i,
    });

    expect(includedLink.getAttribute("href")).toBe(
      "/calendar?sessionId=completed-before-boundary",
    );
    expect(screen.queryByText(/planned tempo run/i)).toBeNull();
  });

  it("shows an empty-state message when no sessions are included", () => {
    render(
      <TodayDashboard
        snapshot={buildSnapshot({
          includedSessionIds: [],
          excludedSessionIds: ["planned-before-boundary"],
        })}
      />,
    );

    expect(
      screen.getByText(/no completed contributors inside today's boundary/i),
    ).toBeTruthy();
  });
});
