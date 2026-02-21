import React from "react";

import { AuthenticatedAppShell } from "../../components/navigation/authenticated-app-shell";
import { loadWeeklyAuditResponse } from "../../features/calendar-audit/api";
import { weeklyAuditResponseSample } from "../../features/calendar-audit/sample-data";

export const dynamic = "force-dynamic";

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2),
  );
}

export default async function AnalyticsPage() {
  let loadedWeeklyAudit = undefined;
  try {
    loadedWeeklyAudit = await loadWeeklyAuditResponse({
      startDate: weeklyAuditResponseSample.startDate,
    });
  } catch {
    loadedWeeklyAudit = undefined;
  }

  const weeklyAudit = loadedWeeklyAudit ?? weeklyAuditResponseSample;

  const neuralAverage = average(
    weeklyAudit.points.map((point) => point.completedAxes.neural),
  );
  const metabolicAverage = average(
    weeklyAudit.points.map((point) => point.completedAxes.metabolic),
  );
  const mechanicalAverage = average(
    weeklyAudit.points.map((point) => point.completedAxes.mechanical),
  );

  const highRiskDays = weeklyAudit.points.filter(
    (point) => point.thresholdZoneState === "high",
  ).length;

  return (
    <AuthenticatedAppShell
      activeItem="analytics"
      title="Analytics"
      description="Trend insights and adaptation signals."
    >
      <section className="analytics-grid" aria-label="Analytics summary cards">
        <article className="analytics-card">
          <h2>Axis Fatigue Trend</h2>
          <p className="analytics-card-copy">
            Rolling completed-load averages for the current weekly window.
          </p>
          <dl>
            <div>
              <dt>Neural avg</dt>
              <dd>{neuralAverage}</dd>
            </div>
            <div>
              <dt>Metabolic avg</dt>
              <dd>{metabolicAverage}</dd>
            </div>
            <div>
              <dt>Mechanical avg</dt>
              <dd>{mechanicalAverage}</dd>
            </div>
          </dl>
        </article>

        <article className="analytics-card">
          <h2>Adaptation risk timeline</h2>
          <p className="analytics-card-copy">
            Days crossing the red zone threshold are tracked for intervention.
          </p>
          <p className="analytics-card-value">
            {highRiskDays} high-risk day(s)
          </p>
        </article>

        <article className="analytics-card">
          <h2>Session compliance</h2>
          <p className="analytics-card-copy">
            Use calendar move/skip events and completed-session status to audit
            weekly execution consistency.
          </p>
          <a className="button button-secondary" href="/calendar">
            Open calendar audit
          </a>
        </article>
      </section>
    </AuthenticatedAppShell>
  );
}
