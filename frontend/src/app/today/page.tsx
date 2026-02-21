import React from "react";

import { loadTodaySnapshot } from "../../features/today/api";
import {
  todayAccumulationRequestSample,
  todayAccumulationResponseSample,
  todayContributorSample,
} from "../../features/today/sample-data";
import { TodayDashboard } from "../../features/today/today-dashboard";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const loadedSnapshot = await loadTodaySnapshot({
    request: todayAccumulationRequestSample,
  });
  const snapshot = loadedSnapshot ?? todayAccumulationResponseSample;

  return (
    <main className="today-page" id="main-content">
      <div className="auth-banner" role="status" aria-live="polite">
        <p>Authenticated session active</p>
        <div className="today-nav-actions">
          <a className="button button-secondary" href="/">
            Home
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

      <TodayDashboard
        snapshot={snapshot}
        contributors={todayContributorSample}
      />
    </main>
  );
}
