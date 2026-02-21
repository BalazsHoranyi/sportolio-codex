"use client";

import React, { useCallback, useMemo, useState } from "react";

import type { WeeklyAuditApiResponse } from "../../features/calendar-audit/types";
import { recomputeWeeklyAuditResponse } from "../../features/calendar-audit/recompute";
import { WeeklyAuditChart } from "../../features/calendar-audit/weekly-audit-chart";
import { PlanningCalendarSurface } from "../../features/planning-calendar/planning-calendar-surface";
import type { PlanningMutationEvent } from "../../features/planning-calendar/types";
import type { CalendarSessionFocus } from "../../features/today/session-focus";

interface CalendarPageClientProps {
  weeklyAudit: WeeklyAuditApiResponse;
  sessionFocus?: CalendarSessionFocus;
}

export function CalendarPageClient({
  weeklyAudit,
  sessionFocus,
}: CalendarPageClientProps) {
  const [mutations, setMutations] = useState<PlanningMutationEvent[]>([]);

  const recomputedWeeklyAudit = useMemo(
    () => recomputeWeeklyAuditResponse(weeklyAudit, mutations),
    [weeklyAudit, mutations],
  );

  const handleMutation = useCallback((mutation: PlanningMutationEvent) => {
    setMutations((previous) => [...previous, mutation]);
  }, []);

  return (
    <main className="calendar-page" id="main-content">
      <a className="skip-link" href="#calendar-main">
        Skip to Main Content
      </a>
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

      <p className="calendar-recompute-summary" aria-live="polite">
        Audit recompute events applied: {mutations.length}
      </p>

      <PlanningCalendarSurface onMutation={handleMutation} />

      <WeeklyAuditChart response={recomputedWeeklyAudit} />

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
