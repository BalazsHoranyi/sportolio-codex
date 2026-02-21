import { renderToStaticMarkup } from "react-dom/server";

import PlannerPage from "../../src/app/planner/page";

describe("PlannerPage", () => {
  it("renders authenticated planner route shell", async () => {
    const html = renderToStaticMarkup(await PlannerPage());

    expect(html).toContain("Authenticated session active");
    expect(html).toContain("Cycle creation flow");
    expect(html).toContain("Macro goals and events");
  });
});
