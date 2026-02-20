import { renderToStaticMarkup } from "react-dom/server";

import HomePage from "../../src/app/page";

describe("HomePage", () => {
  it("shows a clear first-time-user primary action and backup path", () => {
    const html = renderToStaticMarkup(HomePage());

    expect(html).toContain("Start here");
    expect(html).toContain("See integration checklist");
    expect(html).toContain('href="#start-here"');
    expect(html).toContain('href="#integration"');
  });

  it("renders onboarding sections that prevent a dead-end experience", () => {
    const html = renderToStaticMarkup(HomePage());

    expect(html).toContain("First session in under 10 minutes");
    expect(html).toContain("Choose your launch path");
    expect(html).toContain("What to do next");
  });

  it("uses accessibility-safe skip navigation to main content", () => {
    const html = renderToStaticMarkup(HomePage());

    expect(html).toContain("Skip to Main Content");
    expect(html).toContain('href="#main-content"');
  });

  it("renders role cards as full clickable surfaces", () => {
    const html = renderToStaticMarkup(HomePage());
    const fullCardLinks = html.match(/class="path-card path-card-link"/g) ?? [];

    expect(fullCardLinks).toHaveLength(3);
  });

  it("uses jump-style CTA labels that match in-page anchor navigation", () => {
    const html = renderToStaticMarkup(HomePage());

    expect(html).toContain("Jump to athlete flow");
    expect(html).toContain("Jump to coach flow");
    expect(html).toContain("Jump to integration checklist");
  });

  it("includes targetable anchor sections and a back-to-top recovery action", () => {
    const html = renderToStaticMarkup(HomePage());

    expect(html).toContain('id="start-here" class="section anchor-target');
    expect(html).toContain('id="athlete-flow" class="flow-card anchor-target');
    expect(html).toContain('id="coach-flow" class="flow-card anchor-target');
    expect(html).toContain('id="integration" class="section anchor-target');
    expect(html).toContain('href="#top"');
    expect(html).toContain("Back to Top");
  });

  it("shows the exact muscle-usage integration endpoint for first-run setup", () => {
    const html = renderToStaticMarkup(HomePage());

    expect(html).toContain(
      "POST /v1/athletes/{athleteId}/muscle-usage/aggregate",
    );
  });
});
