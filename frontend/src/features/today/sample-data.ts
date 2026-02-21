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
  includedSessionIds: ["completed-before-boundary"],
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
          contributionMagnitude: 8,
          contributionShare: 1,
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
          contributionMagnitude: 4,
          contributionShare: 1,
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
          contributionMagnitude: 3,
          contributionShare: 1,
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
          contributionMagnitude: 5,
          contributionShare: 1,
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
          contributionMagnitude: 5.3333,
          contributionShare: 1,
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
    sessionId: "planned-before-boundary",
    label: "Planned tempo run",
    href: "/calendar?sessionId=planned-before-boundary",
  },
];
