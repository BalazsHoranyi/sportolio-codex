import {
  buildLoginRedirect,
  sanitizeRedirectTarget,
} from "../../src/features/auth/redirect";

describe("auth redirect helpers", () => {
  it("builds login redirect preserving path and query", () => {
    expect(buildLoginRedirect("/calendar", "?week=2026-W08")).toBe(
      "/login?next=%2Fcalendar%3Fweek%3D2026-W08",
    );
  });

  it("accepts safe internal redirects", () => {
    expect(sanitizeRedirectTarget("/planner?step=2")).toBe("/planner?step=2");
  });

  it("rejects open redirect targets and falls back", () => {
    expect(sanitizeRedirectTarget("https://evil.example")).toBe("/");
    expect(sanitizeRedirectTarget("//evil.example")).toBe("/");
    expect(sanitizeRedirectTarget("javascript:alert(1)")).toBe("/");
    expect(sanitizeRedirectTarget("/login")).toBe("/");
  });
});
