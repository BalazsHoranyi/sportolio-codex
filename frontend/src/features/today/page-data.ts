import { loadTodaySnapshot } from "./api";
import {
  todayAccumulationRequestSample,
  todayAccumulationResponseSample,
  todayContributorSample,
} from "./sample-data";
import type {
  TodayAccumulationResponse,
  TodayContributorSession,
} from "./types";

export interface TodayPageData {
  snapshot: TodayAccumulationResponse;
  contributors: TodayContributorSession[] | undefined;
  source: "api" | "sample";
}

export async function loadTodayPageData(): Promise<TodayPageData> {
  let loadedSnapshot: TodayAccumulationResponse | undefined;
  try {
    loadedSnapshot = await loadTodaySnapshot({
      request: todayAccumulationRequestSample,
    });
  } catch {
    loadedSnapshot = undefined;
  }

  const snapshot = loadedSnapshot ?? todayAccumulationResponseSample;
  const contributors = loadedSnapshot ? undefined : todayContributorSample;
  const source = loadedSnapshot ? "api" : "sample";

  return {
    snapshot,
    contributors,
    source,
  };
}
