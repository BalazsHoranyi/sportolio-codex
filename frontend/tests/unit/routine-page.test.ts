import { renderToStaticMarkup } from "react-dom/server";

import RoutinePage from "../../src/app/routine/page";

describe("RoutinePage", () => {
  it("renders routine builder workspace without mixed dashboard concerns", async () => {
    const html = renderToStaticMarkup(await RoutinePage());

    expect(html).toContain("Routine Builder");
    expect(html).toContain("Build and refine strength or endurance routines.");
    expect(html).toContain("Routine creation flow");
    expect(html).toContain("Visual");
    expect(html).toContain("DSL");
    expect(html).not.toContain("Integration checklist");
  });
});
