import React from "react";

import { BentoGrid, BentoGridItem } from "../../components/ui/bento-grid";
import type {
  TodayAccumulationResponse,
  TodayContributorSession,
} from "./types";
import {
  buildTodayDashboardViewModel,
  type ScoreExplainabilityViewModel,
  type WhyThisLink,
} from "./view-model";

interface TodayDashboardProps {
  snapshot: TodayAccumulationResponse;
  contributors?: TodayContributorSession[];
}

interface ScoreExplainabilityDetailsProps {
  scoreKey: string;
  scoreLabel: string;
  explainability: ScoreExplainabilityViewModel;
}

function ContributorChips({ contributors }: { contributors: WhyThisLink[] }) {
  if (contributors.length < 1) {
    return (
      <p className="today-empty">
        No completed contributors inside today's boundary.
      </p>
    );
  }

  return (
    <div className="today-chip-row today-chip-row-compact">
      {contributors.map((contributor) => (
        <a
          className="today-chip"
          href={contributor.href}
          key={contributor.sessionId}
        >
          <span>{contributor.label}</span>
          {contributor.shareLabel ? (
            <span aria-label={`${contributor.label} contribution share`}>
              {contributor.shareLabel}
            </span>
          ) : null}
        </a>
      ))}
    </div>
  );
}

function ScoreExplainabilityDetails({
  scoreKey,
  scoreLabel,
  explainability,
}: ScoreExplainabilityDetailsProps) {
  return (
    <details
      className="today-score-explain"
      data-testid={`${scoreKey}-explain`}
    >
      <summary role="button" aria-label="Why this score">
        Why this score
      </summary>
      <div
        className="today-score-explain-content"
        role="region"
        aria-label={`${scoreLabel} score explanation`}
      >
        <p className="today-score-explain-axis">{explainability.axisMeaning}</p>
        <p className="today-score-explain-decision">
          {explainability.decisionHint}
        </p>
        <p className="today-score-explain-label">Top contributors</p>
        <ContributorChips contributors={explainability.contributors} />
      </div>
    </details>
  );
}

export function TodayDashboard({
  snapshot,
  contributors,
}: TodayDashboardProps) {
  const viewModel = buildTodayDashboardViewModel(snapshot, contributors);

  return (
    <section className="today-shell" aria-label="Today bento layout">
      <BentoGrid className="today-bento-grid">
        <BentoGridItem as="section" className="today-bento-intro">
          <header className="today-header">
            <p className="eyebrow">Today</p>
            <h2>Today fatigue snapshot</h2>
            <p>Completed-only carryover from the current boundary window.</p>
          </header>

          <dl
            className="today-boundary"
            aria-label="Today accumulation boundary"
          >
            <div>
              <dt>Boundary source</dt>
              <dd>{viewModel.boundarySourceLabel}</dd>
            </div>
            <div>
              <dt>Boundary window</dt>
              <dd>{viewModel.boundaryWindow}</dd>
            </div>
            <div>
              <dt>As of</dt>
              <dd>{viewModel.asOf}</dd>
            </div>
          </dl>
        </BentoGridItem>

        <BentoGridItem
          as="section"
          className="today-bento-axes bento-grid-item-plain"
        >
          <div
            className="today-axis-grid"
            role="list"
            aria-label="Fatigue axis gauges"
          >
            {viewModel.gauges.map((gauge) => (
              <article
                className="today-axis-card"
                data-threshold-state={gauge.thresholdState}
                key={gauge.id}
                role="listitem"
              >
                <div className="today-axis-head">
                  <h2>{gauge.label}</h2>
                  <p>{gauge.value.toFixed(1)}</p>
                </div>
                <div
                  aria-label={`${gauge.label} gauge`}
                  className="today-gauge-track"
                  role="img"
                >
                  <span style={{ width: `${gauge.percent}%` }} />
                </div>
                <ScoreExplainabilityDetails
                  scoreKey={gauge.id}
                  scoreLabel={gauge.label}
                  explainability={viewModel.scoreExplainability[gauge.id]}
                />
              </article>
            ))}

            <article
              className="today-recruitment-card"
              data-threshold-state={viewModel.recruitmentState}
            >
              <h2>Recruitment</h2>
              <p className="today-recruitment-value">
                {viewModel.recruitmentValue.toFixed(1)}
              </p>
              <p className="today-recruitment-copy">
                Derived from neural and mechanical carryover.
              </p>
              <ScoreExplainabilityDetails
                scoreKey="recruitment"
                scoreLabel="Recruitment"
                explainability={viewModel.scoreExplainability.recruitment}
              />
            </article>
          </div>
        </BentoGridItem>

        <BentoGridItem
          as="section"
          className="today-bento-decisions bento-grid-item-plain"
        >
          <div className="today-decision-grid">
            <article
              className="today-decision-card"
              data-testid="combined-score-card"
              data-threshold-state={viewModel.combinedThresholdState}
            >
              <h2>Combined fatigue score</h2>
              <p className="today-decision-value">
                {viewModel.combinedScoreValue.toFixed(2)}
              </p>
              <p className="today-decision-copy">
                {viewModel.combinedInterpretation}
              </p>
              {viewModel.combinedThresholdState === "high" ? (
                <p className="today-alert">Threshold reached</p>
              ) : (
                <p className="today-safe">Below red threshold</p>
              )}
              <ScoreExplainabilityDetails
                scoreKey="combined"
                scoreLabel="Combined"
                explainability={viewModel.scoreExplainability.combined}
              />
            </article>

            <article
              className="today-decision-card"
              data-testid="capacity-card"
              data-threshold-state={viewModel.capacityState}
            >
              <h2>System capacity</h2>
              <p className="today-decision-value">
                x{viewModel.capacityFactor.toFixed(2)}
              </p>
              <p className="today-decision-copy">{viewModel.capacityLabel}</p>
              <p className="today-safe">
                Capacity gate factor from sleep/fuel/stress inputs.
              </p>
            </article>
          </div>
        </BentoGridItem>

        <BentoGridItem
          as="section"
          className="today-bento-contributors"
          aria-label="Why this today contributors"
        >
          <h2>Why this today</h2>
          <p>
            Contributors are limited to sessions included by the accumulation
            boundary.
          </p>
          <ContributorChips contributors={viewModel.whyThisLinks} />
        </BentoGridItem>
      </BentoGrid>
    </section>
  );
}
