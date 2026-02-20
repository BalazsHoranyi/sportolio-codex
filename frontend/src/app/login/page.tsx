import React from "react";

import { LoginForm } from "../../features/auth/login-form";
import { primaryDemoCredential } from "../../features/auth/credentials";
import { sanitizeRedirectTarget } from "../../features/auth/redirect";

type SearchParams = {
  next?: string | string[];
};

interface LoginPageProps {
  searchParams?: Promise<SearchParams>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawNextPath = resolvedSearchParams?.next;
  const nextPath = sanitizeRedirectTarget(
    Array.isArray(rawNextPath) ? rawNextPath[0] : rawNextPath,
  );

  return (
    <main className="auth-shell">
      <div className="auth-stage">
        <section className="auth-grid" aria-label="Sign in to Sportolo">
          <div className="auth-left-panel">
            <svg
              aria-hidden="true"
              className="auth-brand-mark"
              width="20"
              height="24"
              viewBox="0 0 20 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 4.5C0 3.11929 1.11929 2 2.5 2H7.5C8.88071 2 10 3.11929 10 4.5V9.40959C10.0001 9.4396 10.0002 9.46975 10.0002 9.50001C10.0002 10.8787 11.1162 11.9968 12.4942 12C12.4961 12 12.4981 12 12.5 12H17.5C18.8807 12 20 13.1193 20 14.5V19.5C20 20.8807 18.8807 22 17.5 22H12.5C11.1193 22 10 20.8807 10 19.5V14.5C10 14.4931 10 14.4861 10.0001 14.4792C9.98891 13.1081 8.87394 12 7.50017 12C7.4937 12 7.48725 12 7.48079 12H2.5C1.11929 12 0 10.8807 0 9.5V4.5Z"
                fill="currentColor"
              />
            </svg>
            <h1 id="auth-title">Welcome back!</h1>
            <p className="auth-subtitle">
              We empower developers and technical teams to create, simulate, and
              manage AI-driven workflows visually.
            </p>

            <LoginForm
              nextPath={nextPath}
              demoEmail={primaryDemoCredential.email}
              demoPassword={primaryDemoCredential.password}
            />

            <p className="auth-signup-note">
              New to Sportolo? Use the demo credentials above to explore.
            </p>
          </div>

          <aside className="auth-right-panel" aria-label="Customer story">
            <div className="auth-pill-row">
              <p>Product Company</p>
              <p>Cloud Management</p>
            </div>
            <div className="auth-quote">
              <h2>
                Aceternity Pro Components have completely changed how we work.
                What used to take hours every week is now fully automated.
              </h2>
              <p>Gina Clinton</p>
              <p>
                Head of Product, <span>Acme Inc.</span>
              </p>
            </div>
            <div className="auth-pattern auth-pattern-top" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div
              className="auth-pattern auth-pattern-bottom"
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="auth-canvas-blur" aria-hidden="true" />
          </aside>
        </section>
      </div>
    </main>
  );
}
