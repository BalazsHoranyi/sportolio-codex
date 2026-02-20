import React from "react";

import { LoginForm } from "../../features/auth/login-form";
import { primaryDemoCredential } from "../../features/auth/credentials";
import { sanitizeRedirectTarget } from "../../features/auth/redirect";

type SearchParams = {
  next?: string;
};

interface LoginPageProps {
  searchParams?: Promise<SearchParams>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = sanitizeRedirectTarget(resolvedSearchParams?.next);

  return (
    <main className="auth-shell">
      <div className="auth-gradient-surface" aria-hidden="true" />
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-copy-block">
          <p className="auth-kicker">Sportolo v1</p>
          <h1 id="auth-title">Sign in to Sportolo</h1>
          <p>
            Keep planning, fatigue insights, and workout execution behind a
            single authenticated session.
          </p>
          <ul className="auth-feature-list">
            <li>Redirects back to your intended page after login.</li>
            <li>Protects all product routes from unauthenticated access.</li>
            <li>Keeps session state active across browser refresh.</li>
          </ul>
        </div>

        <LoginForm
          nextPath={nextPath}
          demoEmail={primaryDemoCredential.email}
          demoPassword={primaryDemoCredential.password}
        />
      </section>
    </main>
  );
}
