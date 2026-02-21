import { NextRequest } from "next/server";

import {
  createSessionToken,
  SESSION_COOKIE_NAME,
} from "../../src/features/auth/session";
import { middleware } from "../../src/middleware";

describe("auth middleware", () => {
  beforeEach(() => {
    process.env.SPORTOLO_AUTH_SECRET = "test-secret-sportolo";
  });

  it("redirects unauthenticated protected route access to login with next", async () => {
    const request = new NextRequest("http://localhost/calendar?week=2026-W08");

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fcalendar%3Fweek%3D2026-W08",
    );
  });

  it("protects newly added top-level routes with the same login redirect contract", async () => {
    const request = new NextRequest("http://localhost/analytics?window=30d");

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fanalytics%3Fwindow%3D30d",
    );
  });

  it("protects settings route with the same login redirect contract", async () => {
    const request = new NextRequest(
      "http://localhost/settings?tab=notifications",
    );

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fsettings%3Ftab%3Dnotifications",
    );
  });

  it("allows authenticated access to protected routes", async () => {
    const token = await createSessionToken({
      userId: "user-diego-tri",
      email: "diego.tri@axis.test",
      role: "athlete",
      displayName: "Diego",
    });

    const request = new NextRequest("http://localhost/", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });

    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects authenticated users away from login page", async () => {
    const token = await createSessionToken({
      userId: "user-diego-tri",
      email: "diego.tri@axis.test",
      role: "athlete",
      displayName: "Diego",
    });

    const request = new NextRequest("http://localhost/login?next=%2Fplanner", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/planner");
  });
});
