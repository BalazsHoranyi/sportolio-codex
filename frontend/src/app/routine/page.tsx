import React from "react";

import { RoutineCreationFlow } from "../../features/routine/components/routine-creation-flow";

export const dynamic = "force-dynamic";

export default async function RoutinePage() {
  return (
    <main className="routine-page" id="main-content">
      <div className="auth-banner" role="status" aria-live="polite">
        <p>Authenticated session active</p>
        <div className="today-nav-actions">
          <a className="button button-secondary" href="/">
            Home
          </a>
          <a className="button button-secondary" href="/today">
            Today
          </a>
          <a className="button button-secondary" href="/calendar">
            Calendar
          </a>
          <form action="/api/auth/logout?redirect=/login" method="post">
            <button className="button button-secondary" type="submit">
              Logout
            </button>
          </form>
        </div>
      </div>

      <RoutineCreationFlow />
    </main>
  );
}
