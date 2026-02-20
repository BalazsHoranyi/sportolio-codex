const FALLBACK_REDIRECT = "/";

function hasInvalidPrefix(target: string): boolean {
  return (
    target.startsWith("//") ||
    target.startsWith("/\\") ||
    target.includes("://") ||
    /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(target)
  );
}

export function sanitizeRedirectTarget(
  target: string | null | undefined,
  fallback = FALLBACK_REDIRECT,
): string {
  if (!target) {
    return fallback;
  }

  const trimmed = target.trim();
  if (!trimmed.startsWith("/") || hasInvalidPrefix(trimmed)) {
    return fallback;
  }

  if (trimmed === "/login" || trimmed.startsWith("/login?")) {
    return fallback;
  }

  return trimmed;
}

export function buildLoginRedirect(pathname: string, search = ""): string {
  const destination = `${pathname}${search}`;
  return `/login?next=${encodeURIComponent(destination)}`;
}
