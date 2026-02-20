import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MuscleMapExplorer } from "../../src/features/muscle-map/muscle-map-explorer";
import type { MuscleUsageApiResponse } from "../../src/features/muscle-map/types";

vi.mock("react-muscle-highlighter", () => ({
  __esModule: true,
  default: ({
    data,
    side,
  }: {
    data: Array<{ slug: string; intensity: number }>;
    side: string;
  }) =>
    React.createElement(
      "div",
      { "data-side": side },
      data.map((part) => `${part.slug}:${part.intensity}`).join("|"),
    ),
}));

const apiResponseFixture: MuscleUsageApiResponse = {
  exerciseSummaries: [
    {
      routineId: "routine-a",
      exerciseId: "exercise-a",
      exerciseName: "API Deadlift",
      workload: 100,
      totalUsage: 100,
      muscleUsage: {
        glutes: 45,
        quads: 30,
        spinal_erectors: 25,
      },
    },
  ],
  routineSummaries: [
    {
      routineId: "routine-a",
      routineName: "API Strength",
      totalUsage: 100,
      muscleUsage: {
        glutes: 45,
        quads: 30,
        spinal_erectors: 25,
      },
    },
  ],
  microcycleSummary: {
    microcycleId: "micro-a",
    microcycleName: "API Week",
    routineCount: 1,
    totalUsage: 100,
    muscleUsage: {
      glutes: 45,
      quads: 30,
      spinal_erectors: 25,
    },
  },
};

describe("MuscleMapExplorer", () => {
  it("renders highlight data from provided API payloads", () => {
    const html = renderToStaticMarkup(
      <MuscleMapExplorer response={apiResponseFixture} />,
    );

    expect(html).toContain("API Deadlift");
    expect(html).toContain("API Strength");
    expect(html).toContain("API Week");
    expect(html).toContain("gluteal:4");
    expect(html).toContain("quadriceps:3");
    expect(html).toContain("lower-back:3");
    expect(html).toContain("Primary focus");
    expect(html).toContain("Glutes");
    expect(html).toContain("Secondary focus");
    expect(html).toContain("Quads");
  });

  it("does not fall back to static sample response data when API data is unavailable", () => {
    const html = renderToStaticMarkup(<MuscleMapExplorer />);

    expect(html).toContain("No routines available");
    expect(html).toContain("No exercises available");
    expect(html).toContain("No routine data");
    expect(html).toContain("No exercise data");
    expect(html).not.toContain("Back Squat");
    expect(html).not.toContain("Bench Press");
  });

  it("reflects updated composition when the API payload changes", () => {
    const updatedPayload: MuscleUsageApiResponse = {
      exerciseSummaries: [
        {
          routineId: "routine-b",
          exerciseId: "exercise-b",
          exerciseName: "API Sprint",
          workload: 70,
          totalUsage: 70,
          muscleUsage: {
            calves: 20,
            hamstrings: 25,
            quads: 25,
          },
        },
      ],
      routineSummaries: [
        {
          routineId: "routine-b",
          routineName: "API Endurance",
          totalUsage: 70,
          muscleUsage: {
            calves: 20,
            hamstrings: 25,
            quads: 25,
          },
        },
      ],
      microcycleSummary: {
        microcycleId: "micro-b",
        microcycleName: "API Week 2",
        routineCount: 1,
        totalUsage: 70,
        muscleUsage: {
          calves: 20,
          hamstrings: 25,
          quads: 25,
        },
      },
    };

    const html = renderToStaticMarkup(
      <MuscleMapExplorer response={updatedPayload} />,
    );

    expect(html).toContain("API Endurance");
    expect(html).toContain("API Sprint");
    expect(html).toContain("API Week 2");
    expect(html).not.toContain("API Deadlift");
    expect(html).not.toContain("API Strength");
  });
});
