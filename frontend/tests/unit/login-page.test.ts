import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import LoginPage from "../../src/app/login/page";

describe("LoginPage", () => {
  it("renders the Aceternity gradient login structure and controls", async () => {
    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/calendar" }),
      }),
    );

    expect(html).toContain("Welcome back!");
    expect(html).toContain("Email");
    expect(html).toContain("Password");
    expect(html).toContain("Sign in");
    expect(html).toContain("or");
    expect(html).toContain("Continue with Google (coming soon)");
    expect(html).toContain("Continue with Facebook (coming soon)");
    expect(html).toContain("Continue with Apple (coming soon)");
    expect(html).toContain("disabled");
    expect(html).toContain("Single sign-on options are coming soon.");
    expect(html).toContain("axis-demo-diego");
    expect(html).toContain(
      "New to Sportolo? Use the demo credentials above to explore.",
    );
    expect(html).toContain("Product Company");
    expect(html).toContain("Acme Inc.");
    expect(html).not.toContain("Already have an account?");
    expect(html).not.toContain(">Sign up<");
  });

  it("handles repeated next query params without crashing", async () => {
    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({
          next: ["/calendar?week=2026-W08", "/planner"],
        }),
      }),
    );

    expect(html).toContain("Welcome back!");
  });
});
