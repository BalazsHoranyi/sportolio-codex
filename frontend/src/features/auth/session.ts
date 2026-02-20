import type { AuthenticatedUser } from "./credentials";

export const SESSION_COOKIE_NAME = "sportolo_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;
const DEVELOPMENT_SESSION_SECRET = "sportolo-dev-auth-secret";

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

interface SessionTokenPayload extends AuthenticatedUser {
  version: "v1";
  iat: number;
  exp: number;
}

export class SessionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionConfigurationError";
  }
}

function configuredSessionSecret(): string | null {
  const configuredSecret = process.env.SPORTOLO_AUTH_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return DEVELOPMENT_SESSION_SECRET;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string): Uint8Array | null {
  try {
    const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function nowEpochSeconds(now: Date): number {
  return Math.floor(now.getTime() / 1000);
}

function toSessionPayload(
  user: AuthenticatedUser,
  issuedAt: Date,
): SessionTokenPayload {
  const issuedAtEpoch = nowEpochSeconds(issuedAt);
  return {
    ...user,
    version: "v1",
    iat: issuedAtEpoch,
    exp: issuedAtEpoch + SESSION_TTL_SECONDS,
  };
}

function sessionPayloadToUser(payload: SessionTokenPayload): AuthenticatedUser {
  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    displayName: payload.displayName,
  };
}

function isSessionPayload(value: unknown): value is SessionTokenPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SessionTokenPayload>;

  return (
    candidate.version === "v1" &&
    typeof candidate.iat === "number" &&
    typeof candidate.exp === "number" &&
    typeof candidate.userId === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.displayName === "string" &&
    (candidate.role === "athlete" || candidate.role === "coach")
  );
}

async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(
  payloadSegment: string,
  secret: string,
): Promise<string> {
  const key = await signingKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadSegment),
  );
  return toBase64Url(new Uint8Array(signature));
}

async function verifyPayloadSignature(
  payloadSegment: string,
  signatureSegment: string,
  secret: string,
): Promise<boolean> {
  const signatureBytes = fromBase64Url(signatureSegment);
  if (!signatureBytes) {
    return false;
  }

  const key = await signingKey(secret);
  const normalizedSignature = new Uint8Array(signatureBytes.byteLength);
  normalizedSignature.set(signatureBytes);

  return crypto.subtle.verify(
    "HMAC",
    key,
    normalizedSignature,
    new TextEncoder().encode(payloadSegment),
  );
}

export function sessionExpiresAtFrom(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + SESSION_TTL_SECONDS * 1000);
}

export async function createSessionToken(
  user: AuthenticatedUser,
  issuedAt = new Date(),
): Promise<string> {
  const secret = configuredSessionSecret();
  if (!secret) {
    throw new SessionConfigurationError(
      "SPORTOLO_AUTH_SECRET is required when NODE_ENV=production.",
    );
  }

  const payload = toSessionPayload(user, issuedAt);
  const payloadSegment = toBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signatureSegment = await signPayload(payloadSegment, secret);

  return `${payloadSegment}.${signatureSegment}`;
}

export async function getSessionFromToken(
  token: string,
  now = new Date(),
): Promise<AuthenticatedUser | null> {
  const secret = configuredSessionSecret();
  if (!secret) {
    return null;
  }

  const [payloadSegment, signatureSegment, extraSegment] = token.split(".");
  if (!payloadSegment || !signatureSegment || extraSegment) {
    return null;
  }

  const signatureValid = await verifyPayloadSignature(
    payloadSegment,
    signatureSegment,
    secret,
  );
  if (!signatureValid) {
    return null;
  }

  const payloadBytes = fromBase64Url(payloadSegment);
  if (!payloadBytes) {
    return null;
  }

  const payloadJson = new TextDecoder().decode(payloadBytes);

  let payload: unknown;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    return null;
  }

  if (!isSessionPayload(payload)) {
    return null;
  }

  if (payload.exp <= nowEpochSeconds(now)) {
    return null;
  }

  return sessionPayloadToUser(payload);
}

export function readCookieValue(
  cookieHeader: string | null,
  key: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const entry of cookies) {
    const trimmed = entry.trim();
    if (!trimmed.startsWith(`${key}=`)) {
      continue;
    }

    return trimmed.slice(key.length + 1);
  }

  return null;
}
