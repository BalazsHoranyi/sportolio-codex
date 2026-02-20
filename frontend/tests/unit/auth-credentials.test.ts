import { validateCredentials } from "../../src/features/auth/credentials";

describe("validateCredentials", () => {
  it("accepts known demo credentials and returns sanitized user identity", () => {
    const result = validateCredentials({
      email: "diego.tri@axis.test",
      password: "axis-demo-diego",
    });

    expect(result).toEqual({
      userId: "user-diego-tri",
      email: "diego.tri@axis.test",
      role: "athlete",
      displayName: "Diego",
    });
  });

  it("matches email case-insensitively", () => {
    const result = validateCredentials({
      email: "DIEGO.TRI@AXIS.TEST",
      password: "axis-demo-diego",
    });

    expect(result?.userId).toBe("user-diego-tri");
  });

  it("rejects invalid credentials without detail leakage", () => {
    const badPassword = validateCredentials({
      email: "diego.tri@axis.test",
      password: "wrong-password",
    });
    const badEmail = validateCredentials({
      email: "unknown@axis.test",
      password: "axis-demo-diego",
    });

    expect(badPassword).toBeNull();
    expect(badEmail).toBeNull();
  });
});
