"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  nextPath: string;
  demoEmail: string;
  demoPassword: string;
}

export function LoginForm({
  nextPath,
  demoEmail,
  demoPassword,
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(demoEmail);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          next: nextPath,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Invalid email or password.");
        return;
      }

      router.push(payload.redirectTo ?? nextPath);
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <label className="auth-label" htmlFor="email">
        Email address
      </label>
      <input
        id="email"
        name="email"
        className="auth-input"
        type="email"
        value={email}
        autoComplete="email"
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <label className="auth-label" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        name="password"
        className="auth-input"
        type="password"
        value={password}
        autoComplete="current-password"
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      {error ? (
        <p className="auth-error" role="status" aria-live="polite">
          {error}
        </p>
      ) : null}

      <button className="auth-submit" type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Continue to dashboard"}
      </button>

      <p className="auth-hint">
        Demo login: <strong>{demoEmail}</strong> /{" "}
        <strong>{demoPassword}</strong>
      </p>
    </form>
  );
}
