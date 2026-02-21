import { loadWeeklyAuditResponse } from "../../src/features/calendar-audit/api";
import { weeklyAuditResponseSample } from "../../src/features/calendar-audit/sample-data";

describe("weekly audit api", () => {
  it("returns undefined when API base URL is not configured", async () => {
    const response = await loadWeeklyAuditResponse({
      fetchImpl: vi.fn(),
    });

    expect(response).toBeUndefined();
  });

  it("loads and validates weekly audit payload from backend endpoint", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify(weeklyAuditResponseSample), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }),
    );

    const response = await loadWeeklyAuditResponse({
      apiBaseUrl: "http://localhost:8000",
      athleteId: "athlete-1",
      startDate: "2026-02-17",
      fetchImpl,
    });

    expect(response?.points).toHaveLength(7);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:8000/v1/athletes/athlete-1/calendar/weekly-audit?startDate=2026-02-17",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("returns undefined when payload shape is invalid", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }),
    );

    const response = await loadWeeklyAuditResponse({
      apiBaseUrl: "http://localhost:8000",
      fetchImpl,
    });

    expect(response).toBeUndefined();
  });

  it("returns undefined when fetch fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });

    await expect(
      loadWeeklyAuditResponse({
        apiBaseUrl: "http://localhost:8000",
        fetchImpl,
      }),
    ).resolves.toBeUndefined();
  });
});
