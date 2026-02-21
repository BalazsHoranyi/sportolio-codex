import { renderToStaticMarkup } from "react-dom/server";

import CalendarPage from "../../src/app/calendar/page";

describe("CalendarPage", () => {
  it("renders protected calendar destination content", async () => {
    const html = renderToStaticMarkup(await CalendarPage({}));

    expect(html).toContain("Plan hybrid training blocks without guesswork.");
    expect(html).toContain("Authenticated session active");
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
