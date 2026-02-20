import {
  createSessionToken,
  getSessionFromToken,
  sessionExpiresAtFrom,
} from "../../src/features/auth/session";

describe("auth session token", () => {
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

  it("creates and verifies a valid signed session token", async () => {
    const issuedAt = new Date("2026-02-20T12:00:00.000Z");

    const token = await createSessionToken(
      {
        userId: "user-diego-tri",
        email: "diego.tri@axis.test",
        role: "athlete",
        displayName: "Diego",
      },
      issuedAt,
    );

    const principal = await getSessionFromToken(token, issuedAt);

    expect(principal).toEqual({
      userId: "user-diego-tri",
      email: "diego.tri@axis.test",
      role: "athlete",
      displayName: "Diego",
    });
  });

  it("rejects tampered tokens", async () => {
    const issuedAt = new Date("2026-02-20T12:00:00.000Z");

    const token = await createSessionToken(
      {
        userId: "user-diego-tri",
        email: "diego.tri@axis.test",
        role: "athlete",
        displayName: "Diego",
      },
      issuedAt,
    );

    const tampered = `${token.slice(0, -1)}x`;

    expect(await getSessionFromToken(tampered, issuedAt)).toBeNull();
  });

  it("rejects expired tokens", async () => {
    const issuedAt = new Date("2026-02-20T12:00:00.000Z");
    const expiresAt = sessionExpiresAtFrom(issuedAt);

    const token = await createSessionToken(
      {
        userId: "user-diego-tri",
        email: "diego.tri@axis.test",
        role: "athlete",
        displayName: "Diego",
      },
      issuedAt,
    );

    const afterExpiry = new Date(expiresAt.getTime() + 1);

    expect(await getSessionFromToken(token, afterExpiry)).toBeNull();
  });

  it("requires explicit secret for token creation in production", async () => {
    setNodeEnv("production");
    delete process.env.SPORTOLO_AUTH_SECRET;

    await expect(
      createSessionToken({
        userId: "user-diego-tri",
        email: "diego.tri@axis.test",
        role: "athlete",
        displayName: "Diego",
      }),
    ).rejects.toThrowError(/SPORTOLO_AUTH_SECRET/);
  });

  it("treats tokens as unauthenticated in production when secret is missing", async () => {
    const issuedAt = new Date("2026-02-20T12:00:00.000Z");

    const token = await createSessionToken(
      {
        userId: "user-diego-tri",
        email: "diego.tri@axis.test",
        role: "athlete",
        displayName: "Diego",
      },
      issuedAt,
    );

    setNodeEnv("production");
    delete process.env.SPORTOLO_AUTH_SECRET;

    expect(await getSessionFromToken(token, issuedAt)).toBeNull();
  });
});
