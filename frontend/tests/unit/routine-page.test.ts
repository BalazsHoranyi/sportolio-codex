import { renderToStaticMarkup } from "react-dom/server";

import RoutinePage from "../../src/app/routine/page";

describe("RoutinePage", () => {
  it("renders authenticated routine creation route shell", async () => {
    const html = renderToStaticMarkup(await RoutinePage());

    expect(html).toContain("Authenticated session active");
    expect(html).toContain("Routine creation flow");
    expect(html).toContain("Visual");
    expect(html).toContain("DSL");
    expect(html).toContain('href="/planner"');
  });
});
