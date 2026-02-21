"use client";

import React, { useCallback, useEffect, useState } from "react";

import type { WeeklyAuditApiResponse } from "../../features/calendar-audit/types";
import { applyWeeklyAuditMutationIncrementally } from "../../features/calendar-audit/recompute";
import { WeeklyAuditChart } from "../../features/calendar-audit/weekly-audit-chart";
import { PlanningCalendarSurface } from "../../features/planning-calendar/planning-calendar-surface";
import type { PlanningMutationEvent } from "../../features/planning-calendar/types";
import type { CalendarSessionFocus } from "../../features/today/session-focus";

interface CalendarPageClientProps {
  weeklyAudit: WeeklyAuditApiResponse;
  sessionFocus?: CalendarSessionFocus;
}

interface CalendarAuditRecomputeState {
  response: WeeklyAuditApiResponse;
  appliedMutationCount: number;
  warning: string | null;
  lastDurationMs: number | null;
}

function createInitialRecomputeState(
  weeklyAudit: WeeklyAuditApiResponse,
): CalendarAuditRecomputeState {
  return {
    response: weeklyAudit,
    appliedMutationCount: 0,
    warning: null,
    lastDurationMs: null,
  };
}

export function CalendarPageClient({
  weeklyAudit,
  sessionFocus,
}: CalendarPageClientProps) {
  const [recomputeState, setRecomputeState] =
    useState<CalendarAuditRecomputeState>(() =>
      createInitialRecomputeState(weeklyAudit),
    );

  useEffect(() => {
    setRecomputeState(createInitialRecomputeState(weeklyAudit));
  }, [weeklyAudit]);

  const handleMutation = useCallback((mutation: PlanningMutationEvent) => {
    setRecomputeState((previous) => {
      const result = applyWeeklyAuditMutationIncrementally(
        previous.response,
        mutation,
      );

      if (!result.applied) {
        return {
          ...previous,
          warning: result.warning ?? null,
          lastDurationMs: result.durationMs,
        };
      }

      return {
        response: result.response,
        appliedMutationCount: previous.appliedMutationCount + 1,
        warning: result.warning ?? null,
        lastDurationMs: result.durationMs,
      };
    });
  }, []);

  const latencyLabel =
    recomputeState.lastDurationMs === null
      ? null
      : `${recomputeState.lastDurationMs.toFixed(2)}ms`;

  return (
    <>
      <p className="calendar-recompute-summary" aria-live="polite">
        Audit recompute events applied: {recomputeState.appliedMutationCount}
        {latencyLabel ? ` | Last recompute latency: ${latencyLabel}` : ""}
      </p>

      {recomputeState.warning ? (
        <p
          className="calendar-recompute-warning"
          role="status"
          aria-live="polite"
        >
          Calendar recompute warning: {recomputeState.warning}
        </p>
      ) : null}

      <PlanningCalendarSurface onMutation={handleMutation} />

      <WeeklyAuditChart response={recomputeState.response} />

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
