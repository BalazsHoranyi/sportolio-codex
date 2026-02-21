import { renderToStaticMarkup } from "react-dom/server";

import SettingsPage from "../../src/app/settings/page";

describe("SettingsPage", () => {
  it("renders a single-purpose settings route", async () => {
    const html = renderToStaticMarkup(await SettingsPage());

    expect(html).toContain("Settings");
    expect(html).toContain("Account and app preferences.");
    expect(html).toContain("Timezone");
    expect(html).toContain("Units");
    expect(html).toContain("Notification digest");
    expect(html).toContain('aria-current="page"');
  });
});
