"use client";

import React, { useMemo, useState } from "react";

import type { WeeklyAuditApiResponse } from "./types";
import { buildWeeklyAuditViewModel } from "./view-model";

interface WeeklyAuditChartProps {
  response: WeeklyAuditApiResponse;
}

type AxisKey = "neural" | "metabolic" | "mechanical";

const axisStrokeByKey: Record<AxisKey, string> = {
  neural: "var(--calendar-neural)",
  metabolic: "var(--calendar-metabolic)",
  mechanical: "var(--calendar-mechanical)",
};

function axisLabel(key: AxisKey): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function WeeklyAuditChart({ response }: WeeklyAuditChartProps) {
  const viewModel = useMemo(
    () => buildWeeklyAuditViewModel(response),
    [response],
  );
  const [activePointId, setActivePointId] = useState<string | undefined>(
    viewModel.points[0]?.id,
  );

  const activePoint =
    viewModel.points.find((point) => point.id === activePointId) ??
    viewModel.points[0];

  return (
    <section className="calendar-audit-chart" aria-label="Weekly audit chart">
      <div className="calendar-audit-legend" aria-label="Weekly audit legend">
        <span className="calendar-legend-item">
          <i aria-hidden="true" className="calendar-legend-line neural" />
          Neural
        </span>
        <span className="calendar-legend-item">
          <i aria-hidden="true" className="calendar-legend-line metabolic" />
          Metabolic
        </span>
        <span className="calendar-legend-item">
          <i aria-hidden="true" className="calendar-legend-line mechanical" />
          Mechanical
        </span>
        <span className="calendar-legend-item">
          <i aria-hidden="true" className="calendar-legend-band" />
          Recruitment overlay
        </span>
        <span className="calendar-legend-item">
          <i aria-hidden="true" className="calendar-legend-zone" />
          Red zone ≥ 7.0
        </span>
      </div>

      <div className="calendar-audit-plot-wrap">
        <svg
          aria-label="Weekly fatigue chart"
          className="calendar-audit-svg"
          viewBox={`0 0 ${viewModel.width} ${viewModel.height}`}
        >
          <rect
            className="calendar-threshold-zone"
            data-testid="red-threshold-zone"
            x={viewModel.plotLeft}
            y={viewModel.plotTop}
            width={viewModel.plotRight - viewModel.plotLeft}
            height={viewModel.thresholdY - viewModel.plotTop}
          />

          <line
            className="calendar-threshold-line"
            x1={viewModel.plotLeft}
            x2={viewModel.plotRight}
            y1={viewModel.thresholdY}
            y2={viewModel.thresholdY}
          />

          <text
            className="calendar-threshold-label"
            x={viewModel.plotRight - 2}
            y={viewModel.thresholdY - 6}
            textAnchor="end"
          >
            Red zone ≥ 7.0
          </text>

          <path
            className="calendar-recruitment-band"
            d={viewModel.recruitmentBandPath}
            data-testid="recruitment-overlay-band"
          />

          {(
            [
              ["neural", viewModel.neuralPath],
              ["metabolic", viewModel.metabolicPath],
              ["mechanical", viewModel.mechanicalPath],
            ] as const
          ).map(([axis, path]) => (
            <path
              key={axis}
              className={`calendar-axis-line ${axis}`}
              d={path}
              fill="none"
              stroke={axisStrokeByKey[axis]}
              strokeWidth={2.8}
            />
          ))}

          {(["neural", "metabolic", "mechanical"] as const).map((axis) =>
            viewModel.series[axis].map((point) => (
              <circle
                key={point.id}
                className={`calendar-axis-point ${axis}`}
                cx={point.x}
                cy={point.y}
                data-testid={`axis-${axis}-point`}
                fill={
                  point.isHighRisk
                    ? "var(--calendar-point-alert)"
                    : axisStrokeByKey[axis]
                }
                r={4}
              />
            )),
          )}

          {viewModel.points.map((point) => (
            <text
              key={`${point.id}-tick`}
              className="calendar-axis-tick"
              textAnchor="middle"
              x={point.x}
              y={viewModel.plotBottom + 18}
            >
              {point.label}
            </text>
          ))}
        </svg>

        <div className="calendar-point-actions">
          {viewModel.points.map((point) => (
            <button
              aria-label={`Show audit details for ${point.date}`}
              className={
                point.id === activePoint?.id
                  ? "calendar-point-button active"
                  : "calendar-point-button"
              }
              key={`${point.id}-button`}
              onClick={() => setActivePointId(point.id)}
              onFocus={() => setActivePointId(point.id)}
              type="button"
            >
              {point.label}
            </button>
          ))}
        </div>
      </div>

      {activePoint ? (
        <aside
          aria-label={`Audit details for ${activePoint.date}`}
          className="calendar-point-tooltip"
          role="dialog"
        >
          <header>
            <p className="eyebrow">Daily detail</p>
            <h3>{activePoint.date}</h3>
          </header>
          <dl className="calendar-tooltip-metrics">
            {(["neural", "metabolic", "mechanical"] as const).map((axis) => (
              <div key={axis}>
                <dt>{axisLabel(axis)}</dt>
                <dd>{activePoint[axis].toFixed(1)}</dd>
              </div>
            ))}
            <div>
              <dt>Recruitment overlay</dt>
              <dd>{activePoint.recruitment.toFixed(1)}</dd>
            </div>
          </dl>

          {activePoint.contributors.length > 0 ? (
            <ul
              className="calendar-tooltip-links"
              aria-label="Explainability links"
            >
              {activePoint.contributors.map((contributor) => (
                <li key={`${activePoint.id}-${contributor.sessionId}`}>
                  <a href={contributor.href}>{contributor.label}</a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="calendar-tooltip-empty">
              No contributor sessions for this day.
            </p>
          )}
        </aside>
      ) : null}
    </section>
  );
}
