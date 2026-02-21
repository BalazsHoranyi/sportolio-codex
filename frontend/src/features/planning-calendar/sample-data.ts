import type { PlannedWorkout, WorkoutTemplate } from "./types";

export const planningWeekDateOptions = [
  "2026-02-17",
  "2026-02-18",
  "2026-02-19",
  "2026-02-20",
  "2026-02-21",
  "2026-02-22",
  "2026-02-23",
] as const;

export const workoutTemplateCatalog: WorkoutTemplate[] = [
  {
    templateId: "template-recovery-ride",
    title: "Recovery ride",
    workoutType: "recovery",
    intensity: "easy",
  },
  {
    templateId: "template-threshold-bike",
    title: "Threshold bike",
    workoutType: "endurance",
    intensity: "hard",
  },
  {
    templateId: "template-upper-hypertrophy",
    title: "Upper hypertrophy",
    workoutType: "strength",
    intensity: "moderate",
  },
];

export const initialPlannedWorkouts: PlannedWorkout[] = [
  {
    workoutId: "workout-strength-a",
    title: "Heavy lower",
    date: "2026-02-17",
    sessionOrder: 1,
    workoutType: "strength",
    intensity: "hard",
  },
  {
    workoutId: "workout-endurance-a",
    title: "Tempo run",
    date: "2026-02-19",
    sessionOrder: 1,
    workoutType: "endurance",
    intensity: "moderate",
  },
  {
    workoutId: "workout-recovery-a",
    title: "Easy spin",
    date: "2026-02-22",
    sessionOrder: 1,
    workoutType: "recovery",
    intensity: "easy",
  },
];
