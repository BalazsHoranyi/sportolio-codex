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
