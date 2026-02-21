import { renderToStaticMarkup } from "react-dom/server";

import AnalyticsPage from "../../src/app/analytics/page";

describe("AnalyticsPage", () => {
  it("renders a single-purpose analytics route", async () => {
    const html = renderToStaticMarkup(await AnalyticsPage());

    expect(html).toContain("Analytics");
    expect(html).toContain("Trend insights and adaptation signals.");
    expect(html).toContain("Axis Fatigue Trend");
    expect(html).toContain("Adaptation risk timeline");
    expect(html).toContain("Session compliance");
    expect(html).toContain('aria-label="Analytics bento layout"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('data-slot="button"');
  });
});
