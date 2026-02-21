import type {
  TodayAccumulationRequest,
  TodayAccumulationResponse,
  TodayContributorSession,
} from "./types";

export const todayAccumulationRequestSample: TodayAccumulationRequest = {
  asOf: "2026-02-20T15:00:00Z",
  timezone: "America/New_York",
  combinedScoreContext: {
    workoutType: "strength",
  },
  systemCapacity: {
    sleep: 2,
    fuel: 2,
    stress: 4,
  },
  sleepEvents: [
    {
      sleepEndedAt: "2026-02-20T10:45:00Z",
    },
  ],
  sessions: [
    {
      sessionId: "completed-before-boundary",
      sessionLabel: "Heavy lower session",
      sessionHref: "/calendar?sessionId=completed-before-boundary",
      state: "completed",
      endedAt: "2026-02-20T10:00:00Z",
      fatigueAxes: {
        neural: 8,
        metabolic: 4,
        mechanical: 3,
        recruitment: 5,
      },
    },
    {
      sessionId: "sprint-starts-1",
      sessionLabel: "Sprint starts",
      sessionHref: "/calendar?sessionId=sprint-starts-1",
      state: "completed",
      endedAt: "2026-02-20T04:10:00Z",
      fatigueAxes: {
        neural: 6,
        metabolic: 3,
        mechanical: 2,
        recruitment: 4,
      },
    },
    {
      sessionId: "threshold-run-1",
      sessionLabel: "Threshold run",
      sessionHref: "/calendar?sessionId=threshold-run-1",
      state: "completed",
      endedAt: "2026-02-19T23:20:00Z",
      fatigueAxes: {
        neural: 5,
        metabolic: 4,
        mechanical: 2,
        recruitment: 3,
      },
    },
    {
      sessionId: "planned-before-boundary",
      sessionLabel: "Planned tempo run",
      sessionHref: "/calendar?sessionId=planned-before-boundary",
      state: "planned",
      endedAt: "2026-02-20T09:30:00Z",
      fatigueAxes: {
        neural: 9,
        metabolic: 9,
        mechanical: 9,
        recruitment: 9,
      },
    },
  ],
};

export const todayAccumulationResponseSample: TodayAccumulationResponse = {
  asOf: "2026-02-20T15:00:00Z",
  boundary: {
    boundaryStart: "2026-02-19T00:00:00-05:00",
    boundaryEnd: "2026-02-20T05:45:00-05:00",
    boundarySource: "sleep_event",
    timezone: "America/New_York",
  },
  includedSessionIds: [
    "completed-before-boundary",
    "sprint-starts-1",
    "threshold-run-1",
  ],
  excludedSessionIds: ["planned-before-boundary", "completed-after-boundary"],
  accumulatedFatigue: {
    neural: 8,
    metabolic: 4,
    mechanical: 3,
    recruitment: 5,
  },
  combinedScore: {
    value: 5.3333,
    interpretation: "probability next hard session degrades adaptation",
    debug: {
      workoutType: "strength",
      defaultSleepApplied: false,
      baseWeights: {
        metabolic: 0.45,
        mechanical: 0.35,
        recruitment: 0.2,
      },
      modifierWeights: {
        metabolic: 0.85,
        mechanical: 1.15,
        recruitment: 1.25,
      },
      effectiveWeights: {
        metabolic: 0.3696,
        mechanical: 0.3889,
        recruitment: 0.2415,
      },
      baseWeightedScore: 3.8527,
      neuralGateFactor: 1.27,
      neuralGatedScore: 4.8929,
      capacityGateFactor: 1.09,
      capacityGatedScore: 5.3333,
    },
  },
  explainability: {
    neural: {
      scoreValue: 8,
      thresholdState: "high",
      axisMeaning:
        "Neural reflects central-drive and coordination readiness for precision or high-skill work.",
      decisionHint:
        "Load is high. Consider reducing intensity or moving hard work.",
      contributors: [
        {
          sessionId: "completed-before-boundary",
          label: "Heavy lower session",
          href: "/calendar?sessionId=completed-before-boundary",
          contributionMagnitude: 4.2,
          contributionShare: 0.52,
        },
        {
          sessionId: "sprint-starts-1",
          label: "Sprint starts",
          href: "/calendar?sessionId=sprint-starts-1",
          contributionMagnitude: 2.4,
          contributionShare: 0.3,
        },
        {
          sessionId: "threshold-run-1",
          label: "Threshold run",
          href: "/calendar?sessionId=threshold-run-1",
          contributionMagnitude: 1.4,
          contributionShare: 0.18,
        },
      ],
    },
    metabolic: {
      scoreValue: 4,
      thresholdState: "moderate",
      axisMeaning:
        "Metabolic reflects substrate and energetic strain from recent work density.",
      decisionHint:
        "Load is building. Consolidate hard work and monitor drift.",
      contributors: [
        {
          sessionId: "completed-before-boundary",
          label: "Heavy lower session",
          href: "/calendar?sessionId=completed-before-boundary",
          contributionMagnitude: 1.7,
          contributionShare: 0.42,
        },
        {
          sessionId: "threshold-run-1",
          label: "Threshold run",
          href: "/calendar?sessionId=threshold-run-1",
          contributionMagnitude: 1.4,
          contributionShare: 0.35,
        },
        {
          sessionId: "sprint-starts-1",
          label: "Sprint starts",
          href: "/calendar?sessionId=sprint-starts-1",
          contributionMagnitude: 0.9,
          contributionShare: 0.23,
        },
      ],
    },
    mechanical: {
      scoreValue: 3,
      thresholdState: "low",
      axisMeaning:
        "Mechanical reflects force and tissue load accumulation that drives soreness and risk.",
      decisionHint: "Load is low. Keep planned quality if execution is crisp.",
      contributors: [
        {
          sessionId: "completed-before-boundary",
          label: "Heavy lower session",
          href: "/calendar?sessionId=completed-before-boundary",
          contributionMagnitude: 2.1,
          contributionShare: 0.7,
        },
        {
          sessionId: "sprint-starts-1",
          label: "Sprint starts",
          href: "/calendar?sessionId=sprint-starts-1",
          contributionMagnitude: 0.6,
          contributionShare: 0.2,
        },
        {
          sessionId: "threshold-run-1",
          label: "Threshold run",
          href: "/calendar?sessionId=threshold-run-1",
          contributionMagnitude: 0.3,
          contributionShare: 0.1,
        },
      ],
    },
    recruitment: {
      scoreValue: 5,
      thresholdState: "moderate",
      axisMeaning:
        "Recruitment reflects high-threshold motor-unit demand derived from neural and mechanical stress.",
      decisionHint:
        "Load is building. Consolidate hard work and monitor drift.",
      contributors: [
        {
          sessionId: "completed-before-boundary",
          label: "Heavy lower session",
          href: "/calendar?sessionId=completed-before-boundary",
          contributionMagnitude: 2.5,
          contributionShare: 0.5,
        },
        {
          sessionId: "sprint-starts-1",
          label: "Sprint starts",
          href: "/calendar?sessionId=sprint-starts-1",
          contributionMagnitude: 1.5,
          contributionShare: 0.3,
        },
        {
          sessionId: "threshold-run-1",
          label: "Threshold run",
          href: "/calendar?sessionId=threshold-run-1",
          contributionMagnitude: 1,
          contributionShare: 0.2,
        },
      ],
    },
    combined: {
      scoreValue: 5.3333,
      thresholdState: "moderate",
      axisMeaning:
        "Combined estimates the probability that the next hard session degrades adaptation.",
      decisionHint:
        "Load is building. Consolidate hard work and monitor drift.",
      contributors: [
        {
          sessionId: "completed-before-boundary",
          label: "Heavy lower session",
          href: "/calendar?sessionId=completed-before-boundary",
          contributionMagnitude: 2.4533,
          contributionShare: 0.46,
        },
        {
          sessionId: "sprint-starts-1",
          label: "Sprint starts",
          href: "/calendar?sessionId=sprint-starts-1",
          contributionMagnitude: 1.6533,
          contributionShare: 0.31,
        },
        {
          sessionId: "threshold-run-1",
          label: "Threshold run",
          href: "/calendar?sessionId=threshold-run-1",
          contributionMagnitude: 1.2267,
          contributionShare: 0.23,
        },
      ],
    },
  },
};

export const todayContributorSample: TodayContributorSession[] = [
  {
    sessionId: "completed-before-boundary",
    label: "Heavy lower session",
    href: "/calendar?sessionId=completed-before-boundary",
  },
  {
    sessionId: "sprint-starts-1",
    label: "Sprint starts",
    href: "/calendar?sessionId=sprint-starts-1",
  },
  {
    sessionId: "threshold-run-1",
    label: "Threshold run",
    href: "/calendar?sessionId=threshold-run-1",
  },
  {
    sessionId: "planned-before-boundary",
    label: "Planned tempo run",
    href: "/calendar?sessionId=planned-before-boundary",
  },
];
