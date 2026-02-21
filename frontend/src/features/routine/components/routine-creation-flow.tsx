"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { loadExerciseCatalog } from "../../exercise-picker/api";
import { exercisePickerSampleCatalog } from "../../exercise-picker/sample-data";
import {
  filterAndRankExercises,
  type SearchableExerciseCatalogItem,
} from "../../exercise-picker/state";
import { MuscleMapExplorer } from "../../muscle-map/muscle-map-explorer";
import type {
  MuscleUsageApiResponse,
  MuscleUsageMap,
} from "../../muscle-map/types";
import { parseRoutineDsl, serializeRoutineDsl } from "../routine-dsl";
import {
  createDefaultStrengthSet,
  createInitialRoutineDraft,
  type EnduranceIntervalDraft,
  type EnduranceTargetType,
  type RoutineDraft,
  type RoutinePath,
  type StrengthBlockDraft,
  type StrengthProgressionStrategy,
} from "../types";

type EditorMode = "visual" | "dsl";

const editorModeOrder: EditorMode[] = ["visual", "dsl"];
const routinePathOrder: RoutinePath[] = ["strength", "endurance"];

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

function nextSequentialId(values: string[], prefix: string): string {
  const nextNumericId =
    values
      .map((value) => {
        const match = value.match(new RegExp(`^${prefix}-(\\d+)$`));
        return match ? Number.parseInt(match[1] ?? "0", 10) : 0;
      })
      .reduce((max, value) => Math.max(max, value), 0) + 1;

  return `${prefix}-${nextNumericId}`;
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

function toNonNegativeNumber(rawValue: string): number {
  const parsed = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function reorderItems<T>(
  items: T[],
  sourceIndex: number,
  targetIndex: number,
): T[] {
  if (
    sourceIndex < 0 ||
    targetIndex < 0 ||
    sourceIndex >= items.length ||
    targetIndex >= items.length ||
    sourceIndex === targetIndex
  ) {
    return items;
  }

  const nextItems = [...items];
  const [moved] = nextItems.splice(sourceIndex, 1);
  if (!moved) {
    return items;
  }
  nextItems.splice(targetIndex, 0, moved);
  return nextItems;
}

function findExerciseEquipmentOptions(
  catalog: SearchableExerciseCatalogItem[],
  exerciseId: string,
): string[] {
  return catalog.find((item) => item.id === exerciseId)?.equipmentOptions ?? [];
}

function createExerciseDraft(
  exercise: SearchableExerciseCatalogItem,
  setId = "set-1",
) {
  return {
    exerciseId: exercise.id,
    canonicalName: exercise.canonicalName,
    selectedEquipment: exercise.equipmentOptions[0] ?? null,
    regionTags: [...exercise.regionTags],
    condition: null,
    sets: [createDefaultStrengthSet(setId)],
  };
}

function buildExerciseUsage(
  regionTags: string[],
  totalUsage: number,
): MuscleUsageMap {
  if (regionTags.length === 0 || totalUsage <= 0) {
    return {};
  }

  const perMuscleUsage = totalUsage / regionTags.length;
  return regionTags.reduce<MuscleUsageMap>((usage, regionTag) => {
    usage[regionTag] = (usage[regionTag] ?? 0) + perMuscleUsage;
    return usage;
  }, {});
}

function mergeMuscleUsage(
  current: MuscleUsageMap,
  next: MuscleUsageMap,
): MuscleUsageMap {
  const merged = { ...current };
  for (const [key, value] of Object.entries(next)) {
    merged[key] = (merged[key] ?? 0) + value;
  }
  return merged;
}

function buildRoutineMuscleUsageResponse(
  routine: RoutineDraft,
): MuscleUsageApiResponse {
  const exerciseSummaries: MuscleUsageApiResponse["exerciseSummaries"] = [];
  let routineMuscleUsage: MuscleUsageMap = {};
  let routineTotalUsage = 0;

  for (const block of routine.strength.blocks) {
    const repeatCount = Math.max(block.repeatCount, 1);

    for (const exercise of block.exercises) {
      const setUsage = exercise.sets.reduce(
        (running, setDraft) => running + Math.max(setDraft.reps, 1),
        0,
      );
      const totalUsage = Math.max(setUsage * repeatCount, 1);
      const muscleUsage = buildExerciseUsage(exercise.regionTags, totalUsage);

      exerciseSummaries.push({
        routineId: routine.routineId,
        exerciseId: `${block.blockId}:${exercise.exerciseId}`,
        exerciseName: `${exercise.canonicalName} (${block.label})`,
        workload: totalUsage,
        totalUsage,
        muscleUsage,
      });

      routineTotalUsage += totalUsage;
      routineMuscleUsage = mergeMuscleUsage(routineMuscleUsage, muscleUsage);
    }
  }

  const hasExerciseSummaries = exerciseSummaries.length > 0;

  return {
    exerciseSummaries,
    routineSummaries: hasExerciseSummaries
      ? [
          {
            routineId: routine.routineId,
            routineName: routine.routineName,
            totalUsage: routineTotalUsage,
            muscleUsage: routineMuscleUsage,
          },
        ]
      : [],
    microcycleSummary: {
      microcycleId: `${routine.routineId}-draft-microcycle`,
      microcycleName: "Draft microcycle",
      routineCount: hasExerciseSummaries ? 1 : 0,
      totalUsage: routineTotalUsage,
      muscleUsage: routineMuscleUsage,
    },
  };
}

function resolveNextTabIndex(
  currentIndex: number,
  key: string,
  totalItems: number,
): number | null {
  if (totalItems === 0) {
    return null;
  }

  if (key === "ArrowRight") {
    return (currentIndex + 1) % totalItems;
  }

  if (key === "ArrowLeft") {
    return (currentIndex - 1 + totalItems) % totalItems;
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return totalItems - 1;
  }

  return null;
}

function focusById(id: string) {
  if (typeof document === "undefined") {
    return;
  }

  const element = document.getElementById(id);
  if (element instanceof HTMLElement) {
    element.focus();
  }
}

function confirmDestructiveAction(message: string): boolean {
  if (typeof window === "undefined" || typeof window.confirm !== "function") {
    return true;
  }
  return window.confirm(message);
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
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [usingFallbackCatalog, setUsingFallbackCatalog] =
    useState<boolean>(false);
  const [reorderAnnouncement, setReorderAnnouncement] = useState("");

  const [activeBlockId, setActiveBlockId] = useState<string>("block-1");
  const draggingExerciseRef = useRef<{
    blockId: string;
    exerciseId: string;
    exerciseName: string;
    blockLabel: string;
  } | null>(null);

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

  useEffect(() => {
    if (routine.strength.blocks.length === 0) {
      return;
    }

    const blockExists = routine.strength.blocks.some(
      (block) => block.blockId === activeBlockId,
    );

    if (!blockExists) {
      setActiveBlockId(routine.strength.blocks[0]?.blockId ?? "block-1");
    }
  }, [activeBlockId, routine.strength.blocks]);

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
      for (const regionTag of exercise.regionTags) {
        unique.add(regionTag);
      }
    }
    return ["all", ...Array.from(unique).sort()];
  }, [catalog]);

  const visibleExercises = useMemo(
    () =>
      filterAndRankExercises({
        catalog,
        searchText,
        equipmentFilter,
        muscleFilter,
      }).slice(0, 10),
    [catalog, equipmentFilter, muscleFilter, searchText],
  );

  const routineMuscleUsageResponse = useMemo(
    () => buildRoutineMuscleUsageResponse(routine),
    [routine],
  );

  const activeBlock =
    routine.strength.blocks.find((block) => block.blockId === activeBlockId) ??
    routine.strength.blocks[0];

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

  function modeTabId(modeValue: EditorMode): string {
    return `routine-mode-tab-${modeValue}`;
  }

  function modePanelId(modeValue: EditorMode): string {
    return `routine-mode-panel-${modeValue}`;
  }

  function pathTabId(pathValue: RoutinePath): string {
    return `routine-path-tab-${pathValue}`;
  }

  function pathPanelId(pathValue: RoutinePath): string {
    return `routine-path-panel-${pathValue}`;
  }

  function onModeTabKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentMode: EditorMode,
  ) {
    const currentIndex = editorModeOrder.indexOf(currentMode);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = resolveNextTabIndex(
      currentIndex,
      event.key,
      editorModeOrder.length,
    );
    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextMode = editorModeOrder[nextIndex] ?? currentMode;
    switchMode(nextMode);
    focusById(modeTabId(nextMode));
  }

  function onPathTabKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentPath: RoutinePath,
  ) {
    const currentIndex = routinePathOrder.indexOf(currentPath);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = resolveNextTabIndex(
      currentIndex,
      event.key,
      routinePathOrder.length,
    );
    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextPath = routinePathOrder[nextIndex] ?? currentPath;
    setPath(nextPath);
    focusById(pathTabId(nextPath));
  }

  function addVariable() {
    setRoutine((previous) => ({
      ...previous,
      strength: {
        ...previous.strength,
        variables: [
          ...previous.strength.variables,
          {
            variableId: nextSequentialId(
              previous.strength.variables.map(
                (variable) => variable.variableId,
              ),
              "variable",
            ),
            name: `Variable ${previous.strength.variables.length + 1}`,
            expression: "1",
          },
        ],
      },
    }));
  }

  function updateVariable(
    variableId: string,
    update: Partial<{ name: string; expression: string }>,
  ) {
    setRoutine((previous) => ({
      ...previous,
      strength: {
        ...previous.strength,
        variables: previous.strength.variables.map((variable) =>
          variable.variableId === variableId
            ? {
                ...variable,
                ...update,
              }
            : variable,
        ),
      },
    }));
  }

  function removeVariable(variableId: string) {
    setRoutine((previous) => ({
      ...previous,
      strength: {
        ...previous.strength,
        variables: previous.strength.variables.filter(
          (variable) => variable.variableId !== variableId,
        ),
      },
    }));
  }

  function addBlock() {
    const nextBlockId = nextSequentialId(
      routine.strength.blocks.map((block) => block.blockId),
      "block",
    );

    setRoutine((previous) => ({
      ...previous,
      strength: {
        ...previous.strength,
        blocks: [
          ...previous.strength.blocks,
          {
            blockId: nextBlockId,
            label: `Block ${previous.strength.blocks.length + 1}`,
            repeatCount: 1,
            condition: null,
            exercises: [],
          },
        ],
      },
    }));

    setActiveBlockId(nextBlockId);
  }

  function updateBlock(
    blockId: string,
    update: Partial<
      Pick<StrengthBlockDraft, "label" | "repeatCount" | "condition">
    >,
  ) {
    setRoutine((previous) => ({
      ...previous,
      strength: {
        ...previous.strength,
        blocks: previous.strength.blocks.map((block) =>
          block.blockId === blockId
            ? {
                ...block,
                ...update,
              }
            : block,
        ),
      },
    }));
  }

  function removeBlock(blockId: string) {
    setRoutine((previous) => {
      const remainingBlocks = previous.strength.blocks.filter(
        (block) => block.blockId !== blockId,
      );

      const normalizedBlocks =
        remainingBlocks.length > 0
          ? remainingBlocks
          : [
              {
                blockId: "block-1",
                label: "Main block",
                repeatCount: 1,
                condition: null,
                exercises: [],
              },
            ];

      return {
        ...previous,
        strength: {
          ...previous.strength,
          blocks: normalizedBlocks,
        },
      };
    });
  }

  function addStrengthExercise(exercise: SearchableExerciseCatalogItem) {
    setRoutine((previous) => {
      const targetBlockId =
        activeBlock?.blockId ?? previous.strength.blocks[0]?.blockId;
      if (!targetBlockId) {
        return previous;
      }

      return {
        ...previous,
        strength: {
          ...previous.strength,
          blocks: previous.strength.blocks.map((block) => {
            if (block.blockId !== targetBlockId) {
              return block;
            }

            const alreadyIncluded = block.exercises.some(
              (entry) => entry.exerciseId === exercise.id,
            );
            if (alreadyIncluded) {
              return block;
            }

            const firstSetId = "set-1";

            return {
              ...block,
              exercises: [
                ...block.exercises,
                createExerciseDraft(exercise, firstSetId),
              ],
            };
          }),
        },
      };
    });
  }

  function updateExercise(
    blockId: string,
    exerciseId: string,
    update: Partial<
      Pick<
        RoutineDraft["strength"]["blocks"][number]["exercises"][number],
        "condition" | "selectedEquipment"
      >
    >,
  ) {
    setRoutine((previous) => ({
      ...previous,
      strength: {
        ...previous.strength,
        blocks: previous.strength.blocks.map((block) =>
          block.blockId === blockId
            ? {
                ...block,
                exercises: block.exercises.map((exercise) =>
                  exercise.exerciseId === exerciseId
                    ? {
                        ...exercise,
                        ...update,
                      }
                    : exercise,
                ),
              }
            : block,
        ),
      },
    }));
  }

  function removeStrengthExercise(blockId: string, exerciseId: string) {
    setRoutine((previous) => ({
      ...previous,
      strength: {
        ...previous.strength,
        blocks: previous.strength.blocks.map((block) =>
          block.blockId === blockId
            ? {
                ...block,
                exercises: block.exercises.filter(
                  (exercise) => exercise.exerciseId !== exerciseId,
                ),
              }
            : block,
        ),
      },
    }));
  }

  function addStrengthSet(blockId: string, exerciseId: string) {
    setRoutine((previous) => ({
      ...previous,
      strength: {
        ...previous.strength,
        blocks: previous.strength.blocks.map((block) =>
          block.blockId === blockId
            ? {
                ...block,
                exercises: block.exercises.map((exercise) => {
                  if (exercise.exerciseId !== exerciseId) {
                    return exercise;
                  }

                  const nextSetId = nextSequentialId(
                    exercise.sets.map((setDraft) => setDraft.setId),
                    "set",
                  );

                  return {
                    ...exercise,
                    sets: [
                      ...exercise.sets,
                      createDefaultStrengthSet(nextSetId),
                    ],
                  };
                }),
              }
            : block,
        ),
      },
    }));
  }

  function updateStrengthSet(
    blockId: string,
    exerciseId: string,
    setId: string,
    update: Partial<
      RoutineDraft["strength"]["blocks"][number]["exercises"][number]["sets"][number]
    >,
  ) {
    setRoutine((previous) => ({
      ...previous,
      strength: {
        ...previous.strength,
        blocks: previous.strength.blocks.map((block) =>
          block.blockId === blockId
            ? {
                ...block,
                exercises: block.exercises.map((exercise) =>
                  exercise.exerciseId === exerciseId
                    ? {
                        ...exercise,
                        sets: exercise.sets.map((setDraft) =>
                          setDraft.setId === setId
                            ? {
                                ...setDraft,
                                ...update,
                              }
                            : setDraft,
                        ),
                      }
                    : exercise,
                ),
              }
            : block,
        ),
      },
    }));
  }

  function removeStrengthSet(
    blockId: string,
    exerciseId: string,
    setId: string,
  ) {
    setRoutine((previous) => ({
      ...previous,
      strength: {
        ...previous.strength,
        blocks: previous.strength.blocks.map((block) =>
          block.blockId === blockId
            ? {
                ...block,
                exercises: block.exercises.map((exercise) => {
                  if (exercise.exerciseId !== exerciseId) {
                    return exercise;
                  }

                  const remainingSets = exercise.sets.filter(
                    (setDraft) => setDraft.setId !== setId,
                  );
                  if (remainingSets.length === 0) {
                    return exercise;
                  }

                  return {
                    ...exercise,
                    sets: remainingSets,
                  };
                }),
              }
            : block,
        ),
      },
    }));
  }

  function moveExerciseByStep(
    blockId: string,
    exerciseId: string,
    direction: -1 | 1,
    exerciseName: string,
    blockLabel: string,
  ) {
    setRoutine((previous) => ({
      ...previous,
      strength: {
        ...previous.strength,
        blocks: previous.strength.blocks.map((block) => {
          if (block.blockId !== blockId) {
            return block;
          }

          const sourceIndex = block.exercises.findIndex(
            (exercise) => exercise.exerciseId === exerciseId,
          );
          const targetIndex = sourceIndex + direction;

          if (
            sourceIndex < 0 ||
            targetIndex < 0 ||
            targetIndex >= block.exercises.length
          ) {
            return block;
          }

          return {
            ...block,
            exercises: reorderItems(block.exercises, sourceIndex, targetIndex),
          };
        }),
      },
    }));
    setReorderAnnouncement(
      `Moved ${exerciseName} ${direction === -1 ? "up" : "down"} in ${blockLabel}.`,
    );
  }

  function onExerciseDragStart(
    blockId: string,
    exerciseId: string,
    exerciseName: string,
    blockLabel: string,
  ) {
    draggingExerciseRef.current = {
      blockId,
      exerciseId,
      exerciseName,
      blockLabel,
    };
  }

  function onExerciseDragEnd() {
    draggingExerciseRef.current = null;
  }

  function onExerciseDrop(
    blockId: string,
    targetExerciseId: string,
    targetExerciseName: string,
  ) {
    const draggingExercise = draggingExerciseRef.current;
    draggingExerciseRef.current = null;

    if (!draggingExercise || draggingExercise.blockId !== blockId) {
      return;
    }

    let reordered = false;
    setRoutine((previous) => ({
      ...previous,
      strength: {
        ...previous.strength,
        blocks: previous.strength.blocks.map((block) => {
          if (block.blockId !== blockId) {
            return block;
          }

          const sourceIndex = block.exercises.findIndex(
            (exercise) => exercise.exerciseId === draggingExercise.exerciseId,
          );
          const targetIndex = block.exercises.findIndex(
            (exercise) => exercise.exerciseId === targetExerciseId,
          );
          if (sourceIndex !== targetIndex) {
            reordered = true;
          }

          return {
            ...block,
            exercises: reorderItems(block.exercises, sourceIndex, targetIndex),
          };
        }),
      },
    }));

    if (reordered) {
      setReorderAnnouncement(
        `Moved ${draggingExercise.exerciseName} before ${targetExerciseName} in ${draggingExercise.blockLabel}.`,
      );
    }
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
          id={modeTabId("visual")}
          type="button"
          role="tab"
          tabIndex={mode === "visual" ? 0 : -1}
          aria-selected={mode === "visual"}
          aria-controls={modePanelId("visual")}
          className={
            mode === "visual"
              ? "routine-flow-tab routine-flow-tab-active"
              : "routine-flow-tab"
          }
          onClick={() => switchMode("visual")}
          onKeyDown={(event) => onModeTabKeyDown(event, "visual")}
        >
          Visual
        </button>
        <button
          id={modeTabId("dsl")}
          type="button"
          role="tab"
          tabIndex={mode === "dsl" ? 0 : -1}
          aria-selected={mode === "dsl"}
          aria-controls={modePanelId("dsl")}
          className={
            mode === "dsl"
              ? "routine-flow-tab routine-flow-tab-active"
              : "routine-flow-tab"
          }
          onClick={() => switchMode("dsl")}
          onKeyDown={(event) => onModeTabKeyDown(event, "dsl")}
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
          id={pathTabId("strength")}
          type="button"
          role="tab"
          tabIndex={routine.path === "strength" ? 0 : -1}
          aria-selected={routine.path === "strength"}
          aria-controls={pathPanelId("strength")}
          className={
            routine.path === "strength"
              ? "routine-flow-pill routine-flow-pill-active"
              : "routine-flow-pill"
          }
          onClick={() => setPath("strength")}
          onKeyDown={(event) => onPathTabKeyDown(event, "strength")}
        >
          Strength
        </button>
        <button
          id={pathTabId("endurance")}
          type="button"
          role="tab"
          tabIndex={routine.path === "endurance" ? 0 : -1}
          aria-selected={routine.path === "endurance"}
          aria-controls={pathPanelId("endurance")}
          className={
            routine.path === "endurance"
              ? "routine-flow-pill routine-flow-pill-active"
              : "routine-flow-pill"
          }
          onClick={() => setPath("endurance")}
          onKeyDown={(event) => onPathTabKeyDown(event, "endurance")}
        >
          Endurance
        </button>
      </div>

      {mode === "visual" ? (
        <div
          className="routine-flow-visual-grid"
          id={modePanelId("visual")}
          role="tabpanel"
          aria-labelledby={modeTabId("visual")}
        >
          {routine.path === "strength" ? (
            <article
              className="routine-flow-panel"
              id={pathPanelId("strength")}
              role="tabpanel"
              aria-labelledby={pathTabId("strength")}
            >
              <h2>Strength visual builder</h2>
              <p className="routine-flow-helper">
                Search and add exercises, then configure loops, conditions, and
                progression controls before exporting to DSL.
              </p>

              <div className="routine-flow-subheader">
                <h3>Custom variables</h3>
                <button
                  type="button"
                  className="routine-flow-action"
                  onClick={addVariable}
                >
                  Add variable
                </button>
              </div>

              {routine.strength.variables.length === 0 ? (
                <p className="routine-flow-empty">
                  No custom variables yet. Add one for reusable progression
                  logic.
                </p>
              ) : (
                <ul
                  className="routine-flow-variable-list"
                  aria-label="Custom variables"
                >
                  {routine.strength.variables.map((variable) => (
                    <li key={variable.variableId}>
                      <label>
                        Variable name
                        <input
                          className="routine-flow-input"
                          value={variable.name}
                          onChange={(event) =>
                            updateVariable(variable.variableId, {
                              name: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Variable expression
                        <input
                          className="routine-flow-input"
                          value={variable.expression}
                          onChange={(event) =>
                            updateVariable(variable.variableId, {
                              expression: event.target.value,
                            })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="routine-flow-link"
                        onClick={() => {
                          if (
                            !confirmDestructiveAction(
                              "Remove this custom variable?",
                            )
                          ) {
                            return;
                          }
                          removeVariable(variable.variableId);
                        }}
                      >
                        Remove variable
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <label htmlFor="target-strength-block">Target block</label>
              <select
                id="target-strength-block"
                className="routine-flow-select"
                value={activeBlock?.blockId ?? ""}
                onChange={(event) => setActiveBlockId(event.target.value)}
              >
                {routine.strength.blocks.map((block) => (
                  <option key={block.blockId} value={block.blockId}>
                    {block.label}
                  </option>
                ))}
              </select>

              <div className="routine-flow-filter-grid">
                <label htmlFor="strength-equipment-filter">
                  Equipment filter
                  <select
                    id="strength-equipment-filter"
                    className="routine-flow-select"
                    name="strength-equipment-filter"
                    value={equipmentFilter}
                    onChange={(event) => setEquipmentFilter(event.target.value)}
                  >
                    {equipmentFacetOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "all"
                          ? "All equipment"
                          : formatToken(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label htmlFor="strength-muscle-filter">
                  Muscle filter
                  <select
                    id="strength-muscle-filter"
                    className="routine-flow-select"
                    name="strength-muscle-filter"
                    value={muscleFilter}
                    onChange={(event) => setMuscleFilter(event.target.value)}
                  >
                    {muscleFacetOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "all" ? "All muscles" : formatToken(option)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

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
                placeholder="Try: splt sqaut…"
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
                {visibleExercises.length === 0 ? (
                  <li className="routine-flow-empty">
                    No exercises match this search and filter combination.
                  </li>
                ) : (
                  visibleExercises.map((exercise) => (
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
                  ))
                )}
              </ul>

              <div className="routine-flow-subheader">
                <h3>Strength blocks</h3>
                <button
                  type="button"
                  className="routine-flow-action"
                  onClick={addBlock}
                >
                  Add block
                </button>
              </div>

              <div className="routine-flow-block-list">
                {routine.strength.blocks.map((block) => (
                  <article className="routine-flow-block" key={block.blockId}>
                    <div className="routine-flow-block-grid">
                      <label>
                        Block label
                        <input
                          className="routine-flow-input"
                          value={block.label}
                          onChange={(event) =>
                            updateBlock(block.blockId, {
                              label: event.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        Repeat count
                        <input
                          className="routine-flow-input"
                          type="number"
                          min={1}
                          step={1}
                          value={block.repeatCount}
                          onChange={(event) =>
                            updateBlock(block.blockId, {
                              repeatCount: toPositiveNumber(event.target.value),
                            })
                          }
                        />
                      </label>

                      <label>
                        Block condition
                        <input
                          className="routine-flow-input"
                          value={block.condition ?? ""}
                          onChange={(event) =>
                            updateBlock(block.blockId, {
                              condition:
                                event.target.value.trim().length > 0
                                  ? event.target.value
                                  : null,
                            })
                          }
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      className="routine-flow-link"
                      onClick={() => {
                        if (
                          !confirmDestructiveAction(
                            "Remove this block and all nested exercises?",
                          )
                        ) {
                          return;
                        }
                        removeBlock(block.blockId);
                      }}
                    >
                      Remove block
                    </button>

                    {block.exercises.length === 0 ? (
                      <p className="routine-flow-empty">
                        Add exercises from search to populate this block.
                      </p>
                    ) : (
                      <ul
                        className="routine-flow-selection-list"
                        aria-label="Selected strength exercises"
                      >
                        {block.exercises.map((exercise, exerciseIndex) => {
                          const availableEquipment =
                            findExerciseEquipmentOptions(
                              catalog,
                              exercise.exerciseId,
                            );

                          return (
                            <li
                              key={exercise.exerciseId}
                              draggable
                              aria-label={`Drag to reorder ${exercise.canonicalName}`}
                              onDragStart={() =>
                                onExerciseDragStart(
                                  block.blockId,
                                  exercise.exerciseId,
                                  exercise.canonicalName,
                                  block.label,
                                )
                              }
                              onDragEnd={onExerciseDragEnd}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() =>
                                onExerciseDrop(
                                  block.blockId,
                                  exercise.exerciseId,
                                  exercise.canonicalName,
                                )
                              }
                            >
                              <div className="routine-flow-exercise-header">
                                <div>
                                  <p>{exercise.canonicalName}</p>
                                  <small>
                                    {exercise.regionTags
                                      .map(formatToken)
                                      .join(" • ")}
                                  </small>
                                </div>
                                <div className="routine-flow-exercise-actions">
                                  <button
                                    type="button"
                                    className="routine-flow-link"
                                    aria-label={`Move ${exercise.canonicalName} up`}
                                    onClick={() =>
                                      moveExerciseByStep(
                                        block.blockId,
                                        exercise.exerciseId,
                                        -1,
                                        exercise.canonicalName,
                                        block.label,
                                      )
                                    }
                                  >
                                    Move up
                                  </button>
                                  <button
                                    type="button"
                                    className="routine-flow-link"
                                    aria-label={`Move ${exercise.canonicalName} down`}
                                    onClick={() =>
                                      moveExerciseByStep(
                                        block.blockId,
                                        exercise.exerciseId,
                                        1,
                                        exercise.canonicalName,
                                        block.label,
                                      )
                                    }
                                  >
                                    Move down
                                  </button>
                                  <button
                                    type="button"
                                    className="routine-flow-link"
                                    onClick={() => {
                                      if (
                                        !confirmDestructiveAction(
                                          `Remove ${exercise.canonicalName} from this block?`,
                                        )
                                      ) {
                                        return;
                                      }
                                      removeStrengthExercise(
                                        block.blockId,
                                        exercise.exerciseId,
                                      );
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>

                              <div className="routine-flow-advanced-grid">
                                <label>
                                  Selected equipment
                                  <select
                                    className="routine-flow-select"
                                    value={exercise.selectedEquipment ?? ""}
                                    onChange={(event) =>
                                      updateExercise(
                                        block.blockId,
                                        exercise.exerciseId,
                                        {
                                          selectedEquipment:
                                            event.target.value.length > 0
                                              ? event.target.value
                                              : null,
                                        },
                                      )
                                    }
                                  >
                                    <option value="">None</option>
                                    {availableEquipment.map((equipment) => (
                                      <option key={equipment} value={equipment}>
                                        {formatToken(equipment)}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label>
                                  Exercise condition
                                  <input
                                    className="routine-flow-input"
                                    value={exercise.condition ?? ""}
                                    onChange={(event) =>
                                      updateExercise(
                                        block.blockId,
                                        exercise.exerciseId,
                                        {
                                          condition:
                                            event.target.value.trim().length > 0
                                              ? event.target.value
                                              : null,
                                        },
                                      )
                                    }
                                  />
                                </label>
                              </div>

                              <ul
                                className="routine-flow-set-list"
                                aria-label={`${exercise.canonicalName} sets`}
                              >
                                {exercise.sets.map((setDraft) => (
                                  <li key={setDraft.setId}>
                                    <div className="routine-flow-set-grid">
                                      <label>
                                        Reps
                                        <input
                                          className="routine-flow-input"
                                          type="number"
                                          min={1}
                                          step={1}
                                          value={setDraft.reps}
                                          onChange={(event) =>
                                            updateStrengthSet(
                                              block.blockId,
                                              exercise.exerciseId,
                                              setDraft.setId,
                                              {
                                                reps: toPositiveNumber(
                                                  event.target.value,
                                                ),
                                              },
                                            )
                                          }
                                        />
                                      </label>

                                      <label>
                                        Rest seconds
                                        <input
                                          className="routine-flow-input"
                                          type="number"
                                          min={0}
                                          step={1}
                                          value={setDraft.restSeconds}
                                          onChange={(event) =>
                                            updateStrengthSet(
                                              block.blockId,
                                              exercise.exerciseId,
                                              setDraft.setId,
                                              {
                                                restSeconds:
                                                  toNonNegativeNumber(
                                                    event.target.value,
                                                  ),
                                              },
                                            )
                                          }
                                        />
                                      </label>

                                      <label>
                                        Timer seconds
                                        <input
                                          className="routine-flow-input"
                                          type="number"
                                          min={1}
                                          step={1}
                                          value={setDraft.timerSeconds ?? ""}
                                          onChange={(event) =>
                                            updateStrengthSet(
                                              block.blockId,
                                              exercise.exerciseId,
                                              setDraft.setId,
                                              {
                                                timerSeconds:
                                                  event.target.value.trim()
                                                    .length > 0
                                                    ? toPositiveNumber(
                                                        event.target.value,
                                                      )
                                                    : null,
                                              },
                                            )
                                          }
                                        />
                                      </label>

                                      <label>
                                        Progression strategy
                                        <select
                                          className="routine-flow-select"
                                          value={
                                            setDraft.progression?.strategy ?? ""
                                          }
                                          onChange={(event) => {
                                            const strategy = event.target
                                              .value as StrengthProgressionStrategy;
                                            updateStrengthSet(
                                              block.blockId,
                                              exercise.exerciseId,
                                              setDraft.setId,
                                              {
                                                progression:
                                                  strategy.length > 0
                                                    ? {
                                                        strategy,
                                                        value:
                                                          setDraft.progression
                                                            ?.value ?? 1,
                                                      }
                                                    : null,
                                              },
                                            );
                                          }}
                                        >
                                          <option value="">None</option>
                                          <option value="linear_add_load">
                                            Linear add load
                                          </option>
                                          <option value="linear_add_reps">
                                            Linear add reps
                                          </option>
                                          <option value="percentage_wave">
                                            Percentage wave
                                          </option>
                                        </select>
                                      </label>

                                      <label>
                                        Progression value
                                        <input
                                          className="routine-flow-input"
                                          type="number"
                                          min={1}
                                          step={0.5}
                                          value={
                                            setDraft.progression?.value ?? 1
                                          }
                                          disabled={!setDraft.progression}
                                          onChange={(event) => {
                                            if (!setDraft.progression) {
                                              return;
                                            }
                                            updateStrengthSet(
                                              block.blockId,
                                              exercise.exerciseId,
                                              setDraft.setId,
                                              {
                                                progression: {
                                                  ...setDraft.progression,
                                                  value: toPositiveNumber(
                                                    event.target.value,
                                                  ),
                                                },
                                              },
                                            );
                                          }}
                                        />
                                      </label>
                                    </div>

                                    <button
                                      type="button"
                                      className="routine-flow-link"
                                      disabled={exercise.sets.length <= 1}
                                      title={
                                        exercise.sets.length <= 1
                                          ? "At least one set is required."
                                          : undefined
                                      }
                                      onClick={() => {
                                        if (exercise.sets.length <= 1) {
                                          return;
                                        }
                                        if (
                                          !confirmDestructiveAction(
                                            "Remove this set?",
                                          )
                                        ) {
                                          return;
                                        }
                                        removeStrengthSet(
                                          block.blockId,
                                          exercise.exerciseId,
                                          setDraft.setId,
                                        );
                                      }}
                                    >
                                      Remove set
                                    </button>
                                    {exercise.sets.length <= 1 ? (
                                      <p className="routine-flow-note">
                                        At least one set is required.
                                      </p>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>

                              <button
                                type="button"
                                className="routine-flow-action"
                                onClick={() =>
                                  addStrengthSet(
                                    block.blockId,
                                    exercise.exerciseId,
                                  )
                                }
                              >
                                Add set
                              </button>

                              {exerciseIndex < block.exercises.length - 1 ? (
                                <hr className="routine-flow-divider" />
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
              {reorderAnnouncement.length > 0 ? (
                <p
                  className="routine-flow-visually-hidden"
                  role="status"
                  aria-live="polite"
                >
                  {reorderAnnouncement}
                </p>
              ) : null}
              <MuscleMapExplorer response={routineMuscleUsageResponse} />
            </article>
          ) : (
            <article
              className="routine-flow-panel"
              id={pathPanelId("endurance")}
              role="tabpanel"
              aria-labelledby={pathTabId("endurance")}
            >
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
                        onClick={() => {
                          if (
                            !confirmDestructiveAction(
                              "Remove this endurance interval?",
                            )
                          ) {
                            return;
                          }
                          removeEnduranceInterval(interval.intervalId);
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )}

          <details className="routine-flow-panel routine-flow-preview-panel">
            <summary className="routine-flow-preview-toggle">
              Advanced preview: UI parity payload
            </summary>
            <p className="routine-flow-helper">
              Deterministic payload emitted by the visual builder.
            </p>
            <pre
              className="routine-flow-dsl"
              aria-label="Routine parity payload"
            >
              <code>{serializeRoutineDsl(routine)}</code>
            </pre>
          </details>
        </div>
      ) : (
        <article
          className="routine-flow-panel"
          id={modePanelId("dsl")}
          role="tabpanel"
          aria-labelledby={modeTabId("dsl")}
        >
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
