import { renderToStaticMarkup } from "react-dom/server";

import HomePage from "../../src/app/page";

describe("HomePage", () => {
  it("renders the authenticated shell with top-level navigation", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Today");
    expect(html).toContain("Calendar");
    expect(html).toContain("Planner");
    expect(html).toContain("Analytics");
    expect(html).toContain("Settings");
    expect(html).toContain("Daily readiness and execution context.");
    expect(html).toContain('href="/today"');
    expect(html).toContain('href="/calendar"');
    expect(html).toContain('href="/planner"');
    expect(html).toContain('href="/analytics"');
    expect(html).toContain('href="/settings"');
  });

  it("keeps the landing route single-purpose for today readiness", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(html).not.toContain("Integration checklist");
    expect(html).not.toContain("Muscle Map Explorer");
    expect(html).not.toContain("Strength routine builder");
    expect(html).not.toContain("Choose your launch path");
  });
});
