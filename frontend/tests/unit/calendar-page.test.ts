import { renderToStaticMarkup } from "react-dom/server";

import CalendarPage from "../../src/app/calendar/page";

describe("CalendarPage", () => {
  it("renders protected calendar destination content", async () => {
    const html = renderToStaticMarkup(await CalendarPage());

    expect(html).toContain("Plan hybrid training blocks without guesswork.");
    expect(html).toContain("Authenticated session active");
  });
});
