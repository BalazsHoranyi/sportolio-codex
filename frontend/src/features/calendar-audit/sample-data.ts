import type { WeeklyAuditApiResponse } from "./types";

export const weeklyAuditResponseSample: WeeklyAuditApiResponse = {
  startDate: "2026-02-17",
  points: [
    {
      date: "2026-02-17",
      completedAxes: {
        neural: 7.4,
        metabolic: 4.8,
        mechanical: 6.1,
      },
      recruitmentOverlay: 6.7,
      thresholdZoneState: "high",
      contributors: [
        {
          sessionId: "completed-before-boundary",
          label: "Heavy lower session",
          href: "/calendar?sessionId=completed-before-boundary",
        },
        {
          sessionId: "sprint-starts-1",
          label: "Sprint starts",
        },
      ],
    },
    {
      date: "2026-02-18",
      completedAxes: {
        neural: 5.8,
        metabolic: 6.4,
        mechanical: 5.9,
      },
      recruitmentOverlay: 6.0,
      thresholdZoneState: "moderate",
      contributors: [
        {
          sessionId: "threshold-run-1",
          label: "Threshold run",
        },
      ],
    },
    {
      date: "2026-02-19",
      completedAxes: {
        neural: 4.7,
        metabolic: 5.3,
        mechanical: 4.9,
      },
      recruitmentOverlay: 4.8,
      thresholdZoneState: "moderate",
      contributors: [
        {
          sessionId: "easy-ride-1",
          label: "Easy ride",
        },
      ],
    },
    {
      date: "2026-02-20",
      completedAxes: {
        neural: 6.8,
        metabolic: 6.1,
        mechanical: 6.9,
      },
      recruitmentOverlay: 6.7,
      thresholdZoneState: "moderate",
      contributors: [
        {
          sessionId: "strength-day-2",
          label: "Strength day B",
        },
      ],
    },
    {
      date: "2026-02-21",
      completedAxes: {
        neural: 7.1,
        metabolic: 5.6,
        mechanical: 7.2,
      },
      recruitmentOverlay: 7.0,
      thresholdZoneState: "high",
      contributors: [
        {
          sessionId: "tempo-run-2",
          label: "Tempo run",
        },
        {
          sessionId: "deadlift-peak-1",
          label: "Deadlift peak sets",
        },
      ],
    },
    {
      date: "2026-02-22",
      completedAxes: {
        neural: 5.1,
        metabolic: 4.9,
        mechanical: 5.7,
      },
      recruitmentOverlay: 5.3,
      thresholdZoneState: "moderate",
      contributors: [
        {
          sessionId: "vt1-long-1",
          label: "Long VT1 ride",
        },
      ],
    },
    {
      date: "2026-02-23",
      completedAxes: {
        neural: 4.4,
        metabolic: 4.2,
        mechanical: 4.8,
      },
      recruitmentOverlay: 4.6,
      thresholdZoneState: "low",
      contributors: [
        {
          sessionId: "recovery-day-1",
          label: "Recovery day",
        },
      ],
    },
  ],
};
