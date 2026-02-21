export interface SearchableExerciseCatalogItem {
  id: string;
  canonicalName: string;
  aliases: string[];
  regionTags: string[];
  equipmentOptions: string[];
}

export interface RoutineDraftExercise {
  exerciseId: string;
  canonicalName: string;
  selectedEquipment: string | null;
  regionTags: string[];
}

export interface RoutineDraft {
  routineId: string;
  routineName: string;
  exercises: RoutineDraftExercise[];
}

interface FilterAndRankExercisesOptions {
  catalog: SearchableExerciseCatalogItem[];
  searchText: string;
  equipmentFilter: string;
  muscleFilter: string;
}

interface NextExerciseOptionIndexOptions {
  activeIndex: number;
  itemCount: number;
  key: string;
}

interface AddExerciseToRoutineDraftOptions {
  exercise: SearchableExerciseCatalogItem;
  equipment: string | null;
}

function normalizePhrase(value: string): string {
  return value.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

function normalizeToken(value: string): string {
  return normalizePhrase(value).replace(/\s+/g, "_");
}

function maxAllowedDistance(query: string): number {
  if (query.includes(" ") && query.length >= 8) {
    return 3;
  }
  if (query.length >= 13) {
    return 3;
  }
  if (query.length >= 8) {
    return 2;
  }
  return 1;
}

function levenshteinDistance(source: string, target: string): number {
  if (source === target) {
    return 0;
  }
  if (source.length === 0) {
    return target.length;
  }
  if (target.length === 0) {
    return source.length;
  }

  let previous = Array.from({ length: target.length + 1 }, (_, index) => index);

  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    const current = [sourceIndex];
    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      const substitutionCost =
        source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1;
      current.push(
        Math.min(
          previous[targetIndex] + 1,
          current[targetIndex - 1] + 1,
          previous[targetIndex - 1] + substitutionCost,
        ),
      );
    }
    previous = current;
  }

  return previous[previous.length - 1] ?? 0;
}

function searchRank(
  exercise: SearchableExerciseCatalogItem,
  normalizedQuery: string,
): number | null {
  const canonical = normalizePhrase(exercise.canonicalName);
  const aliases = exercise.aliases.map((alias) => normalizePhrase(alias));

  if (canonical === normalizedQuery) {
    return 0;
  }
  if (canonical.startsWith(normalizedQuery)) {
    return 1;
  }
  if (canonical.includes(normalizedQuery)) {
    return 2;
  }
  if (aliases.some((alias) => alias === normalizedQuery)) {
    return 3;
  }
  if (aliases.some((alias) => alias.startsWith(normalizedQuery))) {
    return 4;
  }
  if (aliases.some((alias) => alias.includes(normalizedQuery))) {
    return 5;
  }

  if (normalizedQuery.length < 4) {
    return null;
  }

  const threshold = maxAllowedDistance(normalizedQuery);
  const canonicalDistance = levenshteinDistance(normalizedQuery, canonical);
  if (canonicalDistance <= threshold) {
    return 6 + canonicalDistance;
  }

  const aliasDistances = aliases.map((alias) =>
    levenshteinDistance(normalizedQuery, alias),
  );
  const bestAliasDistance = Math.min(...aliasDistances, threshold + 1);
  if (bestAliasDistance <= threshold) {
    return 10 + bestAliasDistance;
  }

  return null;
}

export function filterAndRankExercises({
  catalog,
  searchText,
  equipmentFilter,
  muscleFilter,
}: FilterAndRankExercisesOptions): SearchableExerciseCatalogItem[] {
  const normalizedEquipment =
    equipmentFilter === "all" ? null : normalizeToken(equipmentFilter);
  const normalizedMuscle =
    muscleFilter === "all" ? null : normalizeToken(muscleFilter);
  const filtered = catalog.filter((exercise) => {
    const matchesEquipment =
      normalizedEquipment === null ||
      exercise.equipmentOptions
        .map((option) => normalizeToken(option))
        .includes(normalizedEquipment);
    const matchesMuscle =
      normalizedMuscle === null ||
      exercise.regionTags
        .map((tag) => normalizeToken(tag))
        .includes(normalizedMuscle);
    return matchesEquipment && matchesMuscle;
  });

  const normalizedSearch = normalizePhrase(searchText);
  if (!normalizedSearch) {
    return [...filtered].sort((left, right) => {
      const leftName = normalizePhrase(left.canonicalName);
      const rightName = normalizePhrase(right.canonicalName);
      if (leftName < rightName) {
        return -1;
      }
      if (leftName > rightName) {
        return 1;
      }
      return left.id.localeCompare(right.id);
    });
  }

  const ranked = filtered
    .map((exercise) => ({
      exercise,
      rank: searchRank(exercise, normalizedSearch),
    }))
    .filter(
      (
        entry,
      ): entry is { exercise: SearchableExerciseCatalogItem; rank: number } =>
        Number.isInteger(entry.rank),
    );

  ranked.sort((left, right) => {
    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }
    const leftName = normalizePhrase(left.exercise.canonicalName);
    const rightName = normalizePhrase(right.exercise.canonicalName);
    if (leftName < rightName) {
      return -1;
    }
    if (leftName > rightName) {
      return 1;
    }
    return left.exercise.id.localeCompare(right.exercise.id);
  });

  return ranked.map((entry) => entry.exercise);
}

export function nextExerciseOptionIndex({
  activeIndex,
  itemCount,
  key,
}: NextExerciseOptionIndexOptions): number {
  if (itemCount <= 0) {
    return -1;
  }

  if (key === "ArrowDown") {
    return activeIndex >= itemCount - 1 ? 0 : activeIndex + 1;
  }
  if (key === "ArrowUp") {
    return activeIndex <= 0 ? itemCount - 1 : activeIndex - 1;
  }
  if (key === "Home") {
    return 0;
  }
  if (key === "End") {
    return itemCount - 1;
  }
  return activeIndex;
}

export function addExerciseToRoutineDraft(
  draft: RoutineDraft,
  { exercise, equipment }: AddExerciseToRoutineDraftOptions,
): RoutineDraft {
  return {
    ...draft,
    exercises: [
      ...draft.exercises,
      {
        exerciseId: exercise.id,
        canonicalName: exercise.canonicalName,
        selectedEquipment: equipment,
        regionTags: [...exercise.regionTags],
      },
    ],
  };
}

export function toRoutineDsl(draft: RoutineDraft): string {
  const payload = {
    routineId: draft.routineId,
    routineName: draft.routineName,
    exercises: draft.exercises.map((exercise, index) => ({
      sequence: index + 1,
      exerciseId: exercise.exerciseId,
      canonicalName: exercise.canonicalName,
      selectedEquipment: exercise.selectedEquipment,
      regionTags: exercise.regionTags,
    })),
  };

  return JSON.stringify(payload, null, 2);
}
