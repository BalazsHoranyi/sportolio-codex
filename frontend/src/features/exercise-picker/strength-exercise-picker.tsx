"use client";

import React, {
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";

import { loadExerciseCatalog } from "./api";
import { exercisePickerSampleCatalog } from "./sample-data";
import {
  addExerciseToRoutineDraft,
  filterAndRankExercises,
  nextExerciseOptionIndex,
  toRoutineDsl,
  type RoutineDraft,
  type RoutineDraftExercise,
  type SearchableExerciseCatalogItem,
} from "./state";

const initialRoutineDraft: RoutineDraft = {
  routineId: "routine-strength-a",
  routineName: "Strength A",
  exercises: [],
};

function formatToken(value: string): string {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function preferredEquipmentForSelection(
  exercise: SearchableExerciseCatalogItem,
  equipmentFilter: string,
): string | null {
  if (exercise.equipmentOptions.length === 0) {
    return null;
  }
  if (
    equipmentFilter !== "all" &&
    exercise.equipmentOptions.includes(equipmentFilter)
  ) {
    return equipmentFilter;
  }
  return exercise.equipmentOptions[0] ?? null;
}

export function StrengthExercisePicker() {
  const searchInputId = useId();
  const equipmentSelectId = useId();
  const muscleSelectId = useId();
  const [catalog, setCatalog] = useState<SearchableExerciseCatalogItem[]>(
    exercisePickerSampleCatalog,
  );
  const [searchText, setSearchText] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [isUsingFallbackData, setIsUsingFallbackData] = useState(false);
  const [routineDraft, setRoutineDraft] =
    useState<RoutineDraft>(initialRoutineDraft);

  useEffect(() => {
    let isActive = true;

    async function hydrateCatalog() {
      setIsLoadingCatalog(true);
      const items = await loadExerciseCatalog({});
      if (!isActive) {
        return;
      }

      if (items.length > 0) {
        setCatalog(items);
        setIsUsingFallbackData(false);
      } else {
        setCatalog(exercisePickerSampleCatalog);
        setIsUsingFallbackData(true);
      }
      setIsLoadingCatalog(false);
    }

    hydrateCatalog().catch(() => {
      if (!isActive) {
        return;
      }
      setCatalog(exercisePickerSampleCatalog);
      setIsUsingFallbackData(true);
      setIsLoadingCatalog(false);
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setActiveOptionIndex(-1);
  }, [searchText, equipmentFilter, muscleFilter]);

  const rankedExercises = useMemo(
    () =>
      filterAndRankExercises({
        catalog,
        searchText,
        equipmentFilter,
        muscleFilter,
      }),
    [catalog, equipmentFilter, muscleFilter, searchText],
  );

  const visibleExercises = useMemo(
    () => rankedExercises.slice(0, 24),
    [rankedExercises],
  );

  const equipmentFacetOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const exercise of catalog) {
      for (const option of exercise.equipmentOptions) {
        unique.add(option);
      }
    }
    return ["all", ...Array.from(unique).sort()];
  }, [catalog]);

  const muscleFacetOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const exercise of catalog) {
      for (const muscleTag of exercise.regionTags) {
        unique.add(muscleTag);
      }
    }
    return ["all", ...Array.from(unique).sort()];
  }, [catalog]);

  const dslPreview = useMemo(() => toRoutineDsl(routineDraft), [routineDraft]);

  function addExercise(exercise: SearchableExerciseCatalogItem) {
    const selectedEquipment = preferredEquipmentForSelection(
      exercise,
      equipmentFilter,
    );
    setRoutineDraft((previous) =>
      addExerciseToRoutineDraft(previous, {
        exercise,
        equipment: selectedEquipment,
      }),
    );
  }

  function removeExercise(exerciseIndex: number) {
    setRoutineDraft((previous) => {
      const nextExercises = previous.exercises.filter(
        (_, index) => index !== exerciseIndex,
      );
      return {
        ...previous,
        exercises: nextExercises,
      };
    });
  }

  function updateSelectedEquipment(exerciseIndex: number, value: string) {
    setRoutineDraft((previous) => {
      const nextExercises: RoutineDraftExercise[] = previous.exercises.map(
        (exercise, index) =>
          index === exerciseIndex
            ? {
                ...exercise,
                selectedEquipment: value || null,
              }
            : exercise,
      );
      return {
        ...previous,
        exercises: nextExercises,
      };
    });
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End", "Enter"].includes(event.key)) {
      return;
    }

    if (event.key === "Enter" && activeOptionIndex >= 0) {
      event.preventDefault();
      const selectedExercise = visibleExercises[activeOptionIndex];
      if (selectedExercise) {
        addExercise(selectedExercise);
      }
      return;
    }

    event.preventDefault();
    setActiveOptionIndex((previous) =>
      nextExerciseOptionIndex({
        activeIndex: previous,
        itemCount: visibleExercises.length,
        key: event.key,
      }),
    );
  }

  return (
    <section
      id="strength-routine-builder"
      className="section anchor-target routine-builder-section fade-in delay-2"
      aria-labelledby="routine-builder-title"
    >
      <header className="section-header routine-builder-header">
        <h2 id="routine-builder-title">Strength routine builder</h2>
        <p>
          Exercise picker supports fuzzy search and deterministic metadata
          binding into your workout DSL draft.
        </p>
      </header>

      <div className="routine-builder-grid">
        <article className="routine-builder-picker-card">
          <h3>Exercise picker</h3>
          <p className="routine-builder-helper">
            Type to search, use arrow keys to highlight options, then press
            Enter to add.
          </p>

          <div className="routine-builder-controls">
            <label htmlFor={searchInputId}>Exercise search</label>
            <input
              id={searchInputId}
              className="routine-builder-input"
              name="exercise-search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Try: splt sqaut"
              autoComplete="off"
            />

            <label htmlFor={equipmentSelectId}>Equipment filter</label>
            <select
              id={equipmentSelectId}
              className="routine-builder-select"
              value={equipmentFilter}
              onChange={(event) => setEquipmentFilter(event.target.value)}
            >
              {equipmentFacetOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All equipment" : formatToken(option)}
                </option>
              ))}
            </select>

            <label htmlFor={muscleSelectId}>Muscle filter</label>
            <select
              id={muscleSelectId}
              className="routine-builder-select"
              value={muscleFilter}
              onChange={(event) => setMuscleFilter(event.target.value)}
            >
              {muscleFacetOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All muscles" : formatToken(option)}
                </option>
              ))}
            </select>
          </div>

          <p
            className="routine-builder-status"
            role="status"
            aria-live="polite"
          >
            {isLoadingCatalog && "Loading exercise catalog..."}
            {!isLoadingCatalog &&
              isUsingFallbackData &&
              "Using fallback catalog sample while API is unavailable."}
            {!isLoadingCatalog &&
              !isUsingFallbackData &&
              `Showing ${visibleExercises.length} matches.`}
          </p>

          <ul
            className="routine-builder-results"
            role="listbox"
            aria-label="Exercise search results"
          >
            {visibleExercises.length === 0 && (
              <li className="routine-builder-empty">
                No exercises match this search and filter combination.
              </li>
            )}
            {visibleExercises.map((exercise, index) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={activeOptionIndex === index}
                  className={
                    activeOptionIndex === index
                      ? "routine-builder-result is-active"
                      : "routine-builder-result"
                  }
                  onMouseEnter={() => setActiveOptionIndex(index)}
                  onClick={() => addExercise(exercise)}
                >
                  <span className="routine-builder-result-title">
                    {exercise.canonicalName}
                  </span>
                  <span className="routine-builder-result-meta">
                    {exercise.equipmentOptions.length > 0
                      ? exercise.equipmentOptions.map(formatToken).join(", ")
                      : "No equipment"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="routine-builder-draft-card">
          <h3>Workout DSL preview</h3>
          <p className="routine-builder-helper">
            Selected exercise metadata is bound into routine draft state below.
          </p>

          {routineDraft.exercises.length === 0 ? (
            <p className="routine-builder-empty">
              Add exercises from the picker to build this routine.
            </p>
          ) : (
            <ol className="routine-builder-selected-list">
              {routineDraft.exercises.map((exercise, index) => (
                <li key={`${exercise.exerciseId}-${index}`}>
                  <p className="routine-builder-selected-name">
                    {exercise.canonicalName}
                  </p>
                  <p className="routine-builder-selected-meta">
                    Focus: {exercise.regionTags.map(formatToken).join(", ")}
                  </p>
                  <div className="routine-builder-selected-actions">
                    <label htmlFor={`equipment-choice-${index}`}>
                      Selected equipment
                    </label>
                    <select
                      id={`equipment-choice-${index}`}
                      className="routine-builder-select"
                      value={exercise.selectedEquipment ?? ""}
                      onChange={(event) =>
                        updateSelectedEquipment(index, event.target.value)
                      }
                    >
                      <option value="">No equipment</option>
                      {catalog
                        .find((item) => item.id === exercise.exerciseId)
                        ?.equipmentOptions.map((option) => (
                          <option key={option} value={option}>
                            {formatToken(option)}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      className="routine-builder-remove"
                      onClick={() => removeExercise(index)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <pre className="routine-builder-dsl" aria-label="Workout DSL preview">
            <code>{dslPreview}</code>
          </pre>
        </article>
      </div>
    </section>
  );
}
