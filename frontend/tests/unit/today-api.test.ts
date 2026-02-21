import { loadTodaySnapshot } from "../../src/features/today/api";
import {
  todayAccumulationRequestSample,
  todayAccumulationResponseSample,
} from "../../src/features/today/sample-data";

describe("today api", () => {
  it("returns undefined when API base URL is not configured", async () => {
    const snapshot = await loadTodaySnapshot({
      request: todayAccumulationRequestSample,
      fetchImpl: vi.fn(),
    });

    expect(snapshot).toBeUndefined();
  });

  it("loads and validates snapshot from the backend endpoint", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify(todayAccumulationResponseSample), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }),
    );

    const snapshot = await loadTodaySnapshot({
      request: todayAccumulationRequestSample,
      apiBaseUrl: "http://localhost:8000",
      athleteId: "athlete-1",
      fetchImpl,
    });

    expect(snapshot?.combinedScore.value).toBe(5.3333);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:8000/v1/athletes/athlete-1/fatigue/today/accumulation",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("returns undefined when payload shape is invalid", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }),
    );

    const snapshot = await loadTodaySnapshot({
      request: todayAccumulationRequestSample,
      apiBaseUrl: "http://localhost:8000",
      fetchImpl,
    });

    expect(snapshot).toBeUndefined();
  });

  it("returns undefined when explainability contributor payload is malformed", async () => {
    const invalidPayload = structuredClone(todayAccumulationResponseSample) as {
      explainability?: {
        combined?: {
          contributors?: unknown[];
        };
      };
    };
    invalidPayload.explainability = {
      combined: {
        contributors: [null],
      },
    };

    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify(invalidPayload), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }),
    );

    const snapshot = await loadTodaySnapshot({
      request: todayAccumulationRequestSample,
      apiBaseUrl: "http://localhost:8000",
      fetchImpl,
    });

    expect(snapshot).toBeUndefined();
  });

  it("returns undefined when the fetch request throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network failure");
    });

    await expect(
      loadTodaySnapshot({
        request: todayAccumulationRequestSample,
        apiBaseUrl: "http://localhost:8000",
        fetchImpl,
      }),
    ).resolves.toBeUndefined();
  });
});
