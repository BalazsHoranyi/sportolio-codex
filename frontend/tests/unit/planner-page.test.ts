import { renderToStaticMarkup } from "react-dom/server";

import PlannerPage from "../../src/app/planner/page";

describe("PlannerPage", () => {
  it("renders planner route inside shared shell with planning-focused copy", async () => {
    const html = renderToStaticMarkup(await PlannerPage());

    expect(html).toContain("Planner");
    expect(html).toContain("Cycle planning and block design context.");
    expect(html).toContain("Cycle creation flow");
    expect(html).toContain("Macro goals and events");
    expect(html).toContain('href="/routine"');
    expect(html).toContain("Open routine builder");
    expect(html).toContain('data-slot="button"');
    expect(html).toContain('aria-label="Planner bento layout"');
    expect(html.match(/<h1\b/g)?.length).toBe(1);
  });
});
