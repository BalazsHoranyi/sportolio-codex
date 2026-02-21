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
    <>
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
    </>
  );
}
