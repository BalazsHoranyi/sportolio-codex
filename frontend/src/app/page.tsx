import React from "react";

import { loadMuscleUsageResponse } from "../features/muscle-map/api";
import { MuscleMapExplorer } from "../features/muscle-map/muscle-map-explorer";
import {
  muscleUsageRequestSample,
  muscleUsageSample,
} from "../features/muscle-map/sample-data";

export const dynamic = "force-dynamic";

const launchPaths = [
  {
    id: "path-athlete",
    title: "Athlete",
    detail:
      "Log sessions, monitor fatigue trends, and keep endurance + strength work coordinated.",
    timeEstimate: "2-min kickoff",
    cta: "Jump to athlete flow",
    href: "#athlete-flow",
  },
  {
    id: "path-coach",
    title: "Coach",
    detail:
      "Audit weekly adherence and compare athlete load profiles without manual spreadsheet work.",
    timeEstimate: "3-min kickoff",
    cta: "Jump to coach flow",
    href: "#coach-flow",
  },
  {
    id: "path-engineering",
    title: "Engineering",
    detail:
      "Connect the new muscle-usage endpoint and validate deterministic aggregation behavior.",
    timeEstimate: "4-min kickoff",
    cta: "Jump to integration checklist",
    href: "#integration",
  },
];

const nextSteps = [
  "Start with one objective metric for this week (strength or endurance priority).",
  "Tag each planned session against the 4-axis fatigue model before scheduling.",
  "Run the muscle-usage aggregation check before syncing your next microcycle.",
];

const integrationEndpoint =
  "POST /v1/athletes/{athleteId}/muscle-usage/aggregate";

async function loadHomePageMuscleUsage() {
  try {
    const response = await loadMuscleUsageResponse({
      request: muscleUsageRequestSample,
    });

    return response ?? muscleUsageSample;
  } catch {
    return muscleUsageSample;
  }
}

export default async function HomePage() {
  const muscleUsageResponse = await loadHomePageMuscleUsage();

  return (
    <main className="home-shell" id="main-content">
      <div id="top" />
      <a className="skip-link" href="#main-content">
        Skip to Main Content
      </a>
      <div className="home-background" aria-hidden="true" />

      <section className="home-hero fade-in" aria-labelledby="hero-title">
        <p className="eyebrow">Sportolo v1</p>
        <h1 id="hero-title">Plan hybrid training blocks without guesswork.</h1>
        <p className="hero-copy">
          Use fatigue-aware planning to protect high-threshold sessions and keep
          strength plus endurance aligned through every microcycle.
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href="#start-here">
            Start here
          </a>
          <a className="button button-secondary" href="#integration">
            See integration checklist
          </a>
        </div>
        <dl className="hero-metrics" aria-label="Performance targets">
          <div>
            <dt>Today/Calendar load</dt>
            <dd>p95 ≤ 2s</dd>
          </div>
          <div>
            <dt>Workout logging ack</dt>
            <dd>p95 ≤ 1s</dd>
          </div>
          <div>
            <dt>Sync completion</dt>
            <dd>p95 ≤ 60s</dd>
          </div>
        </dl>
      </section>

      <section
        id="start-here"
        className="section anchor-target fade-in delay-1"
      >
        <header className="section-header">
          <h2>First session in under 10 minutes</h2>
          <p>
            Begin with the path that matches your role. Each path is designed
            for first-time users with no product context.
          </p>
        </header>
        <div className="path-grid" aria-label="Choose your launch path">
          <div className="path-cards">
            {launchPaths.map((path) => (
              <a
                className="path-card path-card-link"
                href={path.href}
                id={path.id}
                key={path.id}
                aria-describedby={`${path.id}-detail ${path.id}-meta`}
              >
                <h4>{path.title}</h4>
                <p id={`${path.id}-detail`}>{path.detail}</p>
                <p className="path-meta" id={`${path.id}-meta`}>
                  {path.timeEstimate}
                </p>
                <span className="path-cta">{path.cta}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section split-layout fade-in delay-2">
        <article id="athlete-flow" className="flow-card anchor-target">
          <h3>Athlete flow</h3>
          <p>
            Set a weekly focus, then anchor your first microcycle around it.
          </p>
          <ul>
            <li>Define one goal: durability, speed, or pure strength.</li>
            <li>Keep high-neural sessions first in day order.</li>
            <li>Use low-threshold work to fill recovery windows.</li>
          </ul>
        </article>

        <article id="coach-flow" className="flow-card anchor-target">
          <h3>Coach flow</h3>
          <p>Run one deterministic review cycle each week for every athlete.</p>
          <ul>
            <li>Confirm adherence flags before changing progression logic.</li>
            <li>Review fatigue history deltas instead of isolated sessions.</li>
            <li>Escalate only when recruitment + neural clash repeats.</li>
          </ul>
        </article>
      </section>

      <MuscleMapExplorer response={muscleUsageResponse} />

      <section
        id="integration"
        className="section anchor-target integration-card fade-in delay-3"
      >
        <h3>Integration checklist</h3>
        <p>
          Backend muscle-usage aggregation is available and ready for frontend
          consumption.
        </p>
        <p className="integration-endpoint">
          <code>{integrationEndpoint}</code>
        </p>
        <ol>
          <li>Run the API service and confirm contract alignment.</li>
          <li>Call the aggregation endpoint for one completed session.</li>
          <li>Display deterministic usage totals in your audit panel.</li>
        </ol>
      </section>

      <section className="section next-steps fade-in delay-4">
        <h3>What to do next</h3>
        <ul>
          {nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </section>

      <a className="back-to-top" href="#top">
        Back to Top
      </a>
    </main>
  );
}
