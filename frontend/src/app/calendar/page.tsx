import React from "react";

import { CalendarPageClient } from "./calendar-page-client";
import { AuthenticatedAppShell } from "../../components/navigation/authenticated-app-shell";
import { loadWeeklyAuditResponse } from "../../features/calendar-audit/api";
import { weeklyAuditResponseSample } from "../../features/calendar-audit/sample-data";
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
    <AuthenticatedAppShell
      activeItem="calendar"
      title="Calendar"
      description="Schedule and audit timeline context."
    >
      <CalendarPageClient
        weeklyAudit={weeklyAudit}
        sessionFocus={sessionFocus}
      />
    </AuthenticatedAppShell>
  );
}
