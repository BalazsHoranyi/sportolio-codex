import type { ExtendedBodyPart, Slug } from "react-muscle-highlighter";

import type { MuscleUsageMap } from "./types";

const MUSCLE_KEY_TO_SLUG: Record<string, Slug> = {
  biceps: "biceps",
  calves: "calves",
  chest: "chest",
  front_delts: "deltoids",
  glutes: "gluteal",
  hamstrings: "hamstring",
  lats: "upper-back",
  quads: "quadriceps",
  rear_delts: "deltoids",
  spinal_erectors: "lower-back",
  triceps: "triceps",
};

const INTENSITY_LEVELS = 4;

function toIntensity(value: number, maxValue: number): number {
  if (maxValue <= 0) {
    return 1;
  }
  const ratio = value / maxValue;

  if (ratio >= 0.75) {
    return 4;
  }
  if (ratio >= 0.4) {
    return 3;
  }
  if (ratio >= 0.2) {
    return 2;
  }
  return 1;
}

export function mapMuscleUsageToBodyParts(
  muscleUsage: MuscleUsageMap,
): ExtendedBodyPart[] {
  const usageBySlug = new Map<Slug, number>();

  for (const [muscleKey, value] of Object.entries(muscleUsage)) {
    const slug = MUSCLE_KEY_TO_SLUG[muscleKey];
    if (!slug || value <= 0) {
      continue;
    }
    const current = usageBySlug.get(slug) ?? 0;
    usageBySlug.set(slug, current + value);
  }

  const entries = [...usageBySlug.entries()];
  if (entries.length === 0) {
    return [];
  }

  const maxValue = entries.reduce(
    (running, [, value]) => (value > running ? value : running),
    0,
  );

  return entries
    .map(([slug, value]) => ({
      slug,
      intensity: Math.min(INTENSITY_LEVELS, toIntensity(value, maxValue)),
    }))
    .sort((left, right) => left.slug.localeCompare(right.slug));
}
