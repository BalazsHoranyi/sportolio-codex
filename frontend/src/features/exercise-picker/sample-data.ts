import type { SearchableExerciseCatalogItem } from "./state";

export const exercisePickerSampleCatalog: SearchableExerciseCatalogItem[] = [
  {
    id: "global-back-squat",
    canonicalName: "Back Squat",
    aliases: ["Barbell Back Squat", "BB Back Squat"],
    regionTags: ["quads", "glutes", "spinal_erectors"],
    equipmentOptions: ["barbell", "smith_machine"],
  },
  {
    id: "global-split-squat",
    canonicalName: "Split Squat",
    aliases: ["Barbell Split Squat", "DB Split Squat"],
    regionTags: ["quads", "glutes", "hamstrings"],
    equipmentOptions: ["barbell", "dumbbell", "kettlebell"],
  },
  {
    id: "global-pallof-press",
    canonicalName: "Pallof Press",
    aliases: ["Cable Pallof Press", "Band Pallof Press"],
    regionTags: ["core", "obliques"],
    equipmentOptions: ["cable", "band"],
  },
  {
    id: "global-bench-press",
    canonicalName: "Bench Press",
    aliases: ["Barbell Bench Press", "DB Bench Press"],
    regionTags: ["chest", "triceps", "front_delts"],
    equipmentOptions: ["barbell", "dumbbell", "machine"],
  },
  {
    id: "global-running-easy",
    canonicalName: "Running Easy",
    aliases: [],
    regionTags: ["quads", "hamstrings", "calves"],
    equipmentOptions: [],
  },
];
