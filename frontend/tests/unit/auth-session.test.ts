import {
  createSessionToken,
  getSessionFromToken,
  sessionExpiresAtFrom,
} from "../../src/features/auth/session";

describe("auth session token", () => {
  beforeEach(() => {
    process.env.SPORTOLO_AUTH_SECRET = "test-secret-sportolo";
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
});
