"use client";

import React, { useEffect, useMemo, useState } from "react";

import { loadExerciseCatalog } from "../../exercise-picker/api";
import { exercisePickerSampleCatalog } from "../../exercise-picker/sample-data";
import {
  filterAndRankExercises,
  type SearchableExerciseCatalogItem,
} from "../../exercise-picker/state";
import { parseRoutineDsl, serializeRoutineDsl } from "../routine-dsl";
import {
  createInitialRoutineDraft,
  type EnduranceIntervalDraft,
  type EnduranceTargetType,
  type RoutineDraft,
  type RoutinePath,
} from "../types";

type EditorMode = "visual" | "dsl";

function nextIntervalId(intervals: EnduranceIntervalDraft[]): string {
  const nextNumericId =
    intervals
      .map((interval) => {
        const match = interval.intervalId.match(/^interval-(\d+)$/);
        return match ? Number.parseInt(match[1] ?? "0", 10) : 0;
      })
      .reduce((max, value) => Math.max(max, value), 0) + 1;

  return `interval-${nextNumericId}`;
}

function formatToken(value: string): string {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toPositiveNumber(rawValue: string): number {
  const parsed = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return parsed;
}

export function RoutineCreationFlow() {
  const [mode, setMode] = useState<EditorMode>("visual");
  const [routine, setRoutine] = useState<RoutineDraft>(
    createInitialRoutineDraft,
  );
  const [dslText, setDslText] = useState<string>(() =>
    serializeRoutineDsl(createInitialRoutineDraft()),
  );
  const [dslErrors, setDslErrors] = useState<string[]>([]);

  const [catalog, setCatalog] = useState<SearchableExerciseCatalogItem[]>(
    exercisePickerSampleCatalog,
  );
  const [searchText, setSearchText] = useState("");
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [usingFallbackCatalog, setUsingFallbackCatalog] =
    useState<boolean>(false);

  useEffect(() => {
    let active = true;

    async function hydrateCatalog() {
      setIsLoadingCatalog(true);
      const loadedCatalog = await loadExerciseCatalog({});
      if (!active) {
        return;
      }

      if (loadedCatalog.length > 0) {
        setCatalog(loadedCatalog);
        setUsingFallbackCatalog(false);
      } else {
        setCatalog(exercisePickerSampleCatalog);
        setUsingFallbackCatalog(true);
      }

      setIsLoadingCatalog(false);
    }

    hydrateCatalog().catch(() => {
      if (!active) {
        return;
      }
      setCatalog(exercisePickerSampleCatalog);
      setUsingFallbackCatalog(true);
      setIsLoadingCatalog(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setDslText(serializeRoutineDsl(routine));
  }, [routine]);

  const visibleExercises = useMemo(
    () =>
      filterAndRankExercises({
        catalog,
        searchText,
        equipmentFilter: "all",
        muscleFilter: "all",
      }).slice(0, 10),
    [catalog, searchText],
  );

  function setPath(path: RoutinePath) {
    setRoutine((previous) => ({
      ...previous,
      path,
    }));
  }

  function switchMode(nextMode: EditorMode) {
    setMode(nextMode);
    if (nextMode === "dsl") {
      setDslText(serializeRoutineDsl(routine));
      setDslErrors([]);
    }
  }

  function addStrengthExercise(exercise: SearchableExerciseCatalogItem) {
    setRoutine((previous) => {
      const alreadyIncluded = previous.strength.exercises.some(
        (entry) => entry.exerciseId === exercise.id,
      );
      if (alreadyIncluded) {
        return previous;
      }

      return {
        ...previous,
        strength: {
          exercises: [
            ...previous.strength.exercises,
            {
              exerciseId: exercise.id,
              canonicalName: exercise.canonicalName,
              selectedEquipment: exercise.equipmentOptions[0] ?? null,
              regionTags: [...exercise.regionTags],
            },
          ],
        },
      };
    });
  }

  function removeStrengthExercise(exerciseId: string) {
    setRoutine((previous) => ({
      ...previous,
      strength: {
        exercises: previous.strength.exercises.filter(
          (exercise) => exercise.exerciseId !== exerciseId,
        ),
      },
    }));
  }

  function addEnduranceInterval() {
    setRoutine((previous) => ({
      ...previous,
      endurance: {
        intervals: [
          ...previous.endurance.intervals,
          {
            intervalId: nextIntervalId(previous.endurance.intervals),
            label: `Interval ${previous.endurance.intervals.length + 1}`,
            durationSeconds: 300,
            targetType: "power_watts",
            targetValue: 250,
          },
        ],
      },
    }));
  }

  function updateEnduranceInterval(
    intervalId: string,
    update: Partial<EnduranceIntervalDraft>,
  ) {
    setRoutine((previous) => ({
      ...previous,
      endurance: {
        intervals: previous.endurance.intervals.map((interval) =>
          interval.intervalId === intervalId
            ? {
                ...interval,
                ...update,
              }
            : interval,
        ),
      },
    }));
  }

  function removeEnduranceInterval(intervalId: string) {
    setRoutine((previous) => ({
      ...previous,
      endurance: {
        intervals: previous.endurance.intervals.filter(
          (interval) => interval.intervalId !== intervalId,
        ),
      },
    }));
  }

  function onDslChange(nextValue: string) {
    setDslText(nextValue);

    const parsed = parseRoutineDsl(nextValue);
    if (parsed.ok) {
      setRoutine(parsed.value);
      setDslErrors([]);
      return;
    }

    setDslErrors(parsed.errors);
  }

  return (
    <section
      className="routine-flow-shell section"
      aria-labelledby="routine-flow-title"
    >
      <header className="routine-flow-header">
        <p className="eyebrow">Planning</p>
        <h1 id="routine-flow-title">Routine creation flow</h1>
        <p className="routine-flow-copy">
          Build routines in visual mode for speed, then fine-tune with DSL when
          you need precise control.
        </p>
      </header>

      <div
        className="routine-flow-mode-tabs"
        role="tablist"
        aria-label="Editor mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "visual"}
          className={
            mode === "visual"
              ? "routine-flow-tab routine-flow-tab-active"
              : "routine-flow-tab"
          }
          onClick={() => switchMode("visual")}
        >
          Visual
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "dsl"}
          className={
            mode === "dsl"
              ? "routine-flow-tab routine-flow-tab-active"
              : "routine-flow-tab"
          }
          onClick={() => switchMode("dsl")}
        >
          DSL
        </button>
      </div>

      <div
        className="routine-flow-path-tabs"
        role="tablist"
        aria-label="Routine path"
      >
        <button
          type="button"
          role="tab"
          aria-selected={routine.path === "strength"}
          className={
            routine.path === "strength"
              ? "routine-flow-pill routine-flow-pill-active"
              : "routine-flow-pill"
          }
          onClick={() => setPath("strength")}
        >
          Strength
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={routine.path === "endurance"}
          className={
            routine.path === "endurance"
              ? "routine-flow-pill routine-flow-pill-active"
              : "routine-flow-pill"
          }
          onClick={() => setPath("endurance")}
        >
          Endurance
        </button>
      </div>

      {mode === "visual" ? (
        <div className="routine-flow-visual-grid">
          {routine.path === "strength" ? (
            <article className="routine-flow-panel">
              <h2>Strength visual builder</h2>
              <p className="routine-flow-helper">
                Search and add exercises, then export to DSL when needed.
              </p>

              <label htmlFor="strength-exercise-search">
                Strength exercise search
              </label>
              <input
                id="strength-exercise-search"
                className="routine-flow-input"
                role="combobox"
                aria-label="Strength exercise search"
                name="strength-exercise-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Try: splt sqaut"
                autoComplete="off"
              />

              <p
                className="routine-flow-status"
                role="status"
                aria-live="polite"
              >
                {isLoadingCatalog && "Loading exercise catalog..."}
                {!isLoadingCatalog &&
                  usingFallbackCatalog &&
                  "Using fallback catalog sample while API is unavailable."}
                {!isLoadingCatalog &&
                  `Showing ${visibleExercises.length} matches.`}
              </p>

              <ul
                className="routine-flow-results"
                role="listbox"
                aria-label="Strength search results"
              >
                {visibleExercises.map((exercise) => (
                  <li key={exercise.id}>
                    <button
                      type="button"
                      className="routine-flow-result"
                      onClick={() => addStrengthExercise(exercise)}
                    >
                      <span>{exercise.canonicalName}</span>
                      <small>
                        {exercise.equipmentOptions.length > 0
                          ? exercise.equipmentOptions
                              .map(formatToken)
                              .join(", ")
                          : "No equipment"}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>

              <h3>Selected strength exercises</h3>
              {routine.strength.exercises.length === 0 ? (
                <p className="routine-flow-empty">
                  Add at least one strength exercise to start this routine.
                </p>
              ) : (
                <ul
                  className="routine-flow-selection-list"
                  aria-label="Selected strength exercises"
                >
                  {routine.strength.exercises.map((exercise) => (
                    <li key={exercise.exerciseId}>
                      <div>
                        <p>{exercise.canonicalName}</p>
                        <small>
                          {exercise.regionTags.map(formatToken).join(" • ")}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="routine-flow-link"
                        onClick={() =>
                          removeStrengthExercise(exercise.exerciseId)
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ) : (
            <article className="routine-flow-panel">
              <h2>Endurance visual builder</h2>
              <p className="routine-flow-helper">
                Add deterministic interval blocks and refine in DSL if needed.
              </p>

              <button
                type="button"
                className="routine-flow-action"
                onClick={addEnduranceInterval}
              >
                Add interval
              </button>

              {routine.endurance.intervals.length === 0 ? (
                <p className="routine-flow-empty">
                  No intervals yet. Add one to start structuring the session.
                </p>
              ) : (
                <ul
                  className="routine-flow-interval-list"
                  aria-label="Configured endurance intervals"
                >
                  {routine.endurance.intervals.map((interval) => (
                    <li key={interval.intervalId}>
                      <div className="routine-flow-interval-grid">
                        <label>
                          Label
                          <input
                            className="routine-flow-input"
                            name={`interval-label-${interval.intervalId}`}
                            autoComplete="off"
                            value={interval.label}
                            onChange={(event) =>
                              updateEnduranceInterval(interval.intervalId, {
                                label: event.target.value,
                              })
                            }
                          />
                        </label>

                        <label>
                          Duration (seconds)
                          <input
                            className="routine-flow-input"
                            name={`interval-duration-${interval.intervalId}`}
                            type="number"
                            min={1}
                            step={1}
                            inputMode="numeric"
                            value={interval.durationSeconds}
                            onChange={(event) =>
                              updateEnduranceInterval(interval.intervalId, {
                                durationSeconds: toPositiveNumber(
                                  event.target.value,
                                ),
                              })
                            }
                          />
                        </label>

                        <label>
                          Target type
                          <select
                            className="routine-flow-select"
                            name={`interval-target-type-${interval.intervalId}`}
                            value={interval.targetType}
                            onChange={(event) =>
                              updateEnduranceInterval(interval.intervalId, {
                                targetType: event.target
                                  .value as EnduranceTargetType,
                              })
                            }
                          >
                            <option value="power_watts">Power (watts)</option>
                            <option value="pace">Pace</option>
                            <option value="heart_rate">Heart rate</option>
                          </select>
                        </label>

                        <label>
                          Target value
                          <input
                            className="routine-flow-input"
                            name={`interval-target-value-${interval.intervalId}`}
                            type="number"
                            step={1}
                            min={1}
                            inputMode="numeric"
                            value={interval.targetValue}
                            onChange={(event) =>
                              updateEnduranceInterval(interval.intervalId, {
                                targetValue: toPositiveNumber(
                                  event.target.value,
                                ),
                              })
                            }
                          />
                        </label>
                      </div>

                      <button
                        type="button"
                        className="routine-flow-link"
                        onClick={() =>
                          removeEnduranceInterval(interval.intervalId)
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )}

          <article className="routine-flow-panel routine-flow-preview-panel">
            <h2>UI parity payload</h2>
            <p className="routine-flow-helper">
              Deterministic payload emitted by the visual builder.
            </p>
            <pre
              className="routine-flow-dsl"
              aria-label="Routine parity payload"
            >
              <code>{serializeRoutineDsl(routine)}</code>
            </pre>
          </article>
        </div>
      ) : (
        <article className="routine-flow-panel">
          <h2>DSL editor</h2>
          <p className="routine-flow-helper">
            Advanced mode uses deterministic JSON DSL. Invalid edits keep the
            last valid visual state intact.
          </p>

          <label htmlFor="routine-dsl-editor">Routine DSL editor</label>
          <textarea
            id="routine-dsl-editor"
            className="routine-flow-textarea"
            aria-label="Routine DSL editor"
            name="routine-dsl-editor"
            autoComplete="off"
            value={dslText}
            onChange={(event) => onDslChange(event.target.value)}
            spellCheck={false}
          />

          {dslErrors.length > 0 ? (
            <div
              className="routine-flow-error"
              role="status"
              aria-live="polite"
            >
              <h3>DSL validation</h3>
              <ul>
                {dslErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="routine-flow-status" role="status" aria-live="polite">
              DSL is valid and synchronized with visual state.
            </p>
          )}
        </article>
      )}
    </section>
  );
}
