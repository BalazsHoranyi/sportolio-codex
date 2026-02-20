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
    expect(html).toContain("Continue with Google");
    expect(html).toContain("Continue with Facebook");
    expect(html).toContain("Continue with Apple");
    expect(html).toContain("axis-demo-diego");
    expect(html).toContain("Product Company");
    expect(html).toContain("Acme Inc.");
  });
});
