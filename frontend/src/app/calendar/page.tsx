import React from "react";

import { loadWeeklyAuditResponse } from "../../features/calendar-audit/api";
import { weeklyAuditResponseSample } from "../../features/calendar-audit/sample-data";
import { WeeklyAuditChart } from "../../features/calendar-audit/weekly-audit-chart";
import {
  normalizeSessionId,
  resolveCalendarSessionFocus,
} from "../../features/today/session-focus";

type SearchParams = {
  sessionId?: string | string[];
};

interface CalendarPageProps {
  searchParams?: Promise<SearchParams>;
}

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: CalendarPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sessionId = normalizeSessionId(resolvedSearchParams?.sessionId);
  const sessionFocus = sessionId
    ? resolveCalendarSessionFocus(sessionId)
    : undefined;
  let loadedWeeklyAudit = undefined;
  try {
    loadedWeeklyAudit = await loadWeeklyAuditResponse({
      startDate: weeklyAuditResponseSample.startDate,
    });
  } catch {
    loadedWeeklyAudit = undefined;
  }

  const weeklyAudit = loadedWeeklyAudit ?? weeklyAuditResponseSample;

  return (
    <main className="calendar-page" id="main-content">
      <div className="auth-banner" role="status" aria-live="polite">
        <p>Authenticated session active</p>
        <div className="today-nav-actions">
          <a className="button button-secondary" href="/">
            Home
          </a>
          <a className="button button-secondary" href="/planner">
            Planner
          </a>
          <a className="button button-secondary" href="/routine">
            Routine
          </a>
          <a className="button button-secondary" href="/today">
            Today
          </a>
          <form action="/api/auth/logout?redirect=/login" method="post">
            <button className="button button-secondary" type="submit">
              Logout
            </button>
          </form>
        </div>
      </div>
      <a className="skip-link" href="#calendar-main">
        Skip to Main Content
      </a>

      <section
        className="calendar-header"
        id="calendar-main"
        aria-labelledby="calendar-title"
      >
        <p className="eyebrow">Calendar</p>
        <h1 id="calendar-title">Weekly audit</h1>
        <p>
          7-day fatigue trade-off review for neural, metabolic, and mechanical
          load.
        </p>
      </section>

      <WeeklyAuditChart response={weeklyAudit} />

      {sessionFocus ? (
        <section
          id="session-focus"
          className="section session-focus-card"
          aria-labelledby="session-focus-title"
        >
          <header className="session-focus-head">
            <p className="eyebrow">Session focus</p>
            <h2 id="session-focus-title">{sessionFocus.label}</h2>
          </header>
          <p className="session-focus-copy">{sessionFocus.description}</p>
          <p className="session-focus-id">
            Session ID: <code>{sessionFocus.sessionId}</code>
          </p>
          <div className="session-focus-actions">
            <a className="button button-secondary" href="/today">
              Back to Today
            </a>
            <a className="button button-secondary" href="/calendar">
              Return to weekly audit
            </a>
          </div>
        </section>
      ) : null}
    </main>
  );
}
