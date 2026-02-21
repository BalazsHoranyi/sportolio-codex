import { renderToStaticMarkup } from "react-dom/server";

import CalendarPage from "../../src/app/calendar/page";
import type { WeeklyAuditApiResponse } from "../../src/features/calendar-audit/types";

const { loadWeeklyAuditResponseMock } = vi.hoisted(() => ({
  loadWeeklyAuditResponseMock:
    vi.fn<() => Promise<WeeklyAuditApiResponse | undefined>>(),
}));

vi.mock("../../src/features/calendar-audit/api", () => ({
  loadWeeklyAuditResponse: loadWeeklyAuditResponseMock,
}));

describe("CalendarPage", () => {
  beforeEach(() => {
    loadWeeklyAuditResponseMock.mockResolvedValue(undefined);
  });

  it("renders weekly audit destination content with chart context", async () => {
    const html = renderToStaticMarkup(await CalendarPage({}));

    expect(html).toContain("Weekly audit");
    expect(html).toContain("7-day fatigue trade-off review");
    expect(html).toContain("Planning calendar");
    expect(html).toContain("Red zone ≥ 7.0");
    expect(html).toContain("Authenticated session active");
    expect(html).toContain('href="/planner"');
  });

  it("shows session focus details when a today contributor sessionId is provided", async () => {
    const html = renderToStaticMarkup(
      await CalendarPage({
        searchParams: Promise.resolve({
          sessionId: "completed-before-boundary",
        }),
      }),
    );

    expect(html).toContain("Session focus");
    expect(html).toContain("Heavy lower session");
    expect(html).toContain("completed-before-boundary");
  });

  it("renders deterministic fallback chart data when API loading is unavailable", async () => {
    loadWeeklyAuditResponseMock.mockResolvedValueOnce(undefined);

    const html = renderToStaticMarkup(await CalendarPage({}));

    expect(html).toContain("Neural");
    expect(html).toContain("Metabolic");
    expect(html).toContain("Mechanical");
    expect(html).toContain("Recruitment overlay");
  });

  it("falls back to generic session focus copy for unknown session ids", async () => {
    const html = renderToStaticMarkup(
      await CalendarPage({
        searchParams: Promise.resolve({
          sessionId: "unknown-session-id",
        }),
      }),
    );

    expect(html).toContain("Session focus");
    expect(html).toContain("Linked contributor session");
    expect(html).toContain("unknown-session-id");
  });

  it("uses the first sessionId when repeated query params are present", async () => {
    const html = renderToStaticMarkup(
      await CalendarPage({
        searchParams: Promise.resolve({
          sessionId: ["completed-before-boundary", "planned-before-boundary"],
        }),
      }),
    );

    expect(html).toContain("Heavy lower session");
    expect(html).toContain("completed-before-boundary");
    expect(html).not.toContain("planned-before-boundary");
  });
});
