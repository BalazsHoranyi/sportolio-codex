"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "../../components/ui/button";
import { BentoGrid, BentoGridItem } from "../../components/ui/bento-grid";
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
    <section
      className="calendar-bento-layout"
      aria-label="Calendar bento layout"
    >
      <BentoGrid className="calendar-bento-grid">
        <BentoGridItem as="section" className="calendar-bento-status">
          <p className="calendar-recompute-summary" aria-live="polite">
            Audit recompute events applied:{" "}
            {recomputeState.appliedMutationCount}
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
        </BentoGridItem>

        <BentoGridItem
          as="section"
          className="calendar-bento-planning bento-grid-item-plain"
        >
          <PlanningCalendarSurface onMutation={handleMutation} />
        </BentoGridItem>

        <BentoGridItem
          as="section"
          className="calendar-bento-audit bento-grid-item-plain"
        >
          <WeeklyAuditChart response={recomputeState.response} />
        </BentoGridItem>

        {sessionFocus ? (
          <BentoGridItem
            as="section"
            id="session-focus"
            className="session-focus-card calendar-bento-focus"
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
              <Button asChild variant="secondary">
                <Link href="/today">Back to Today</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/calendar">Return to weekly audit</Link>
              </Button>
            </div>
          </BentoGridItem>
        ) : null}
      </BentoGrid>
    </section>
  );
}
