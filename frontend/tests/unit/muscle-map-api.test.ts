import { loadMuscleUsageResponse } from "../../src/features/muscle-map/api";
import type {
  MicrocycleUsageRequest,
  MuscleUsageApiResponse,
} from "../../src/features/muscle-map/types";

const requestFixture: MicrocycleUsageRequest = {
  microcycleId: "micro-1",
  routines: [
    {
      routineId: "routine-1",
      exercises: [
        {
          exerciseId: "exercise-1",
          exerciseName: "Back Squat",
          workload: 120,
        },
      ],
    },
  ],
};

const responseFixture: MuscleUsageApiResponse = {
  exerciseSummaries: [
    {
      routineId: "routine-1",
      exerciseId: "exercise-1",
      exerciseName: "Back Squat",
      workload: 120,
      totalUsage: 120,
      muscleUsage: { quads: 120 },
    },
  ],
  routineSummaries: [
    {
      routineId: "routine-1",
      totalUsage: 120,
      muscleUsage: { quads: 120 },
    },
  ],
  microcycleSummary: {
    microcycleId: "micro-1",
    routineCount: 1,
    totalUsage: 120,
    muscleUsage: { quads: 120 },
  },
};

describe("loadMuscleUsageResponse", () => {
  it("returns undefined when API base URL is not configured", async () => {
    const fetchMock = vi.fn();
    const result = await loadMuscleUsageResponse({
      request: requestFixture,
      apiBaseUrl: "",
      fetchImpl: fetchMock,
    });

    expect(result).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to the aggregate endpoint and returns response payload for valid JSON", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => responseFixture,
        }) as Response,
    );
    const result = await loadMuscleUsageResponse({
      request: requestFixture,
      apiBaseUrl: "http://localhost:8000",
      athleteId: "athlete-123",
      fetchImpl: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/athletes/athlete-123/muscle-usage/aggregate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestFixture),
        cache: "no-store",
      },
    );
    expect(result).toEqual(responseFixture);
  });

  it("returns undefined for non-success HTTP responses", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: false,
          json: async () => ({ message: "validation failed" }),
        }) as Response,
    );

    const result = await loadMuscleUsageResponse({
      request: requestFixture,
      apiBaseUrl: "http://localhost:8000",
      fetchImpl: fetchMock,
    });

    expect(result).toBeUndefined();
  });

  it("returns undefined for malformed JSON payloads", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({ invalid: true }),
        }) as Response,
    );

    const result = await loadMuscleUsageResponse({
      request: requestFixture,
      apiBaseUrl: "http://localhost:8000",
      fetchImpl: fetchMock,
    });

    expect(result).toBeUndefined();
  });
});
