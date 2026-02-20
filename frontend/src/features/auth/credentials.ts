export type AuthRole = "athlete" | "coach";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: AuthRole;
  displayName: string;
}

interface DemoCredential extends AuthenticatedUser {
  password: string;
}

const DEMO_CREDENTIALS: ReadonlyArray<DemoCredential> = [
  {
    userId: "user-diego-tri",
    email: "diego.tri@axis.test",
    password: "axis-demo-diego",
    role: "athlete",
    displayName: "Diego",
  },
  {
    userId: "user-evan-power",
    email: "evan.powerlifter@axis.test",
    password: "axis-demo-evan",
    role: "athlete",
    displayName: "Evan",
  },
  {
    userId: "user-hybrid-athlete",
    email: "hybrid-athlete@axis.test",
    password: "axis-demo-hybrid-athlete",
    role: "athlete",
    displayName: "Hybrid Athlete",
  },
  {
    userId: "user-lena-hybrid",
    email: "lena.hybrid@axis.test",
    password: "axis-demo-lena",
    role: "athlete",
    displayName: "Lena",
  },
  {
    userId: "user-nora-masters",
    email: "nora.masters@axis.test",
    password: "axis-demo-nora",
    role: "athlete",
    displayName: "Nora",
  },
  {
    userId: "user-priya-marathon",
    email: "priya.marathon@axis.test",
    password: "axis-demo-priya",
    role: "athlete",
    displayName: "Priya",
  },
  {
    userId: "user-coach-demo",
    email: "coach.demo@axis.test",
    password: "axis-demo-coach",
    role: "coach",
    displayName: "Coach Demo",
  },
];

export const primaryDemoCredential = {
  email: DEMO_CREDENTIALS[0].email,
  password: DEMO_CREDENTIALS[0].password,
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateCredentials({
  email,
  password,
}: {
  email: string;
  password: string;
}): AuthenticatedUser | null {
  const normalizedEmail = normalizeEmail(email);

  const match = DEMO_CREDENTIALS.find(
    (candidate) =>
      candidate.email === normalizedEmail && candidate.password === password,
  );

  if (!match) {
    return null;
  }

  return {
    userId: match.userId,
    email: match.email,
    role: match.role,
    displayName: match.displayName,
  };
}
