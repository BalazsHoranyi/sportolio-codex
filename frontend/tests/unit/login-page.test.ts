import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import LoginPage from "../../src/app/login/page";

describe("LoginPage", () => {
  it("renders Aceternity-style gradient login structure", async () => {
    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/calendar" }),
      }),
    );

    expect(html).toContain("Sign in to Sportolo");
    expect(html).toContain("Email address");
    expect(html).toContain("Password");
    expect(html).toContain("Continue to dashboard");
    expect(html).toContain("axis-demo-diego");
    expect(html).toContain("auth-gradient-surface");
  });
});
