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
});
