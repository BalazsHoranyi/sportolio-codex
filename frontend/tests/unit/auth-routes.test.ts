import { POST as loginPost } from "../../src/app/api/auth/login/route";
import { POST as logoutPost } from "../../src/app/api/auth/logout/route";
import { GET as sessionGet } from "../../src/app/api/auth/session/route";
import { SESSION_COOKIE_NAME } from "../../src/features/auth/session";

async function responseJson(response: Response): Promise<unknown> {
  return (await response.json()) as unknown;
}

describe("auth api routes", () => {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.SPORTOLO_AUTH_SECRET;

  function setNodeEnv(value: string | undefined) {
    if (value === undefined) {
      delete mutableEnv.NODE_ENV;
      return;
    }

    mutableEnv.NODE_ENV = value;
  }

  beforeEach(() => {
    setNodeEnv("test");
    process.env.SPORTOLO_AUTH_SECRET = "test-secret-sportolo";
  });

  afterEach(() => {
    setNodeEnv(originalNodeEnv);

    if (originalSecret === undefined) {
      delete process.env.SPORTOLO_AUTH_SECRET;
      return;
    }

    process.env.SPORTOLO_AUTH_SECRET = originalSecret;
  });

  it("returns generic non-leaky error for invalid credentials", async () => {
    const response = await loginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "diego.tri@axis.test",
          password: "wrong-password",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await responseJson(response)).toEqual({
      error: "Invalid email or password.",
    });
  });

  it("creates a session cookie for valid credentials", async () => {
    const response = await loginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "diego.tri@axis.test",
          password: "axis-demo-diego",
        }),
      }),
    );

    expect(response.status).toBe(200);

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);

    expect(await responseJson(response)).toMatchObject({
      authenticated: true,
      user: {
        email: "diego.tri@axis.test",
        displayName: "Diego",
      },
    });
  });

  it("fails safely when production auth secret is missing", async () => {
    setNodeEnv("production");
    delete process.env.SPORTOLO_AUTH_SECRET;

    const response = await loginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "diego.tri@axis.test",
          password: "axis-demo-diego",
        }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await responseJson(response)).toEqual({
      error: "Unable to sign in right now. Please try again.",
    });
  });

  it("returns 401 for session endpoint without cookie", async () => {
    const response = await sessionGet(
      new Request("http://localhost/api/auth/session", {
        method: "GET",
      }),
    );

    expect(response.status).toBe(401);
    expect(await responseJson(response)).toEqual({
      authenticated: false,
    });
  });

  it("returns authenticated session when valid cookie is present", async () => {
    const login = await loginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "diego.tri@axis.test",
          password: "axis-demo-diego",
        }),
      }),
    );

    const setCookie = login.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();

    const response = await sessionGet(
      new Request("http://localhost/api/auth/session", {
        method: "GET",
        headers: { cookie: setCookie ?? "" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await responseJson(response)).toEqual({
      authenticated: true,
      user: {
        userId: "user-diego-tri",
        email: "diego.tri@axis.test",
        role: "athlete",
        displayName: "Diego",
      },
    });
  });

  it("clears session cookie and redirects to login on logout", async () => {
    const response = await logoutPost(
      new Request("http://localhost/api/auth/logout?redirect=/login", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/login");
    expect(response.headers.get("set-cookie")).toContain(
      `${SESSION_COOKIE_NAME}=;`,
    );
  });
});
