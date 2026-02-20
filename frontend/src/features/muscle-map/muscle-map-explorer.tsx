"use client";

import React, { useMemo, useState } from "react";
import Body, { type ExtendedBodyPart } from "react-muscle-highlighter";

import type { MuscleUsageApiResponse } from "./types";
import {
  createMuscleMapViewModel,
  EMPTY_MUSCLE_USAGE_RESPONSE,
  type MuscleLegendEntry,
} from "./view-model";

const MAP_COLORS = ["#f4d8a6", "#e8aa69", "#d96c2a", "#8f3608"] as const;

interface MuscleMapCardProps {
  title: string;
  subtitle: string;
  totalUsageLabel: string;
  mapData: ExtendedBodyPart[];
  legend: MuscleLegendEntry[];
  primaryFocus?: MuscleLegendEntry | null;
  secondaryFocus?: MuscleLegendEntry | null;
}

function MuscleMapCard({
  title,
  subtitle,
  totalUsageLabel,
  mapData,
  legend,
  primaryFocus,
  secondaryFocus,
}: MuscleMapCardProps) {
  return (
    <article className="muscle-map-card">
      <header className="muscle-map-card-header">
        <p className="muscle-map-label">{title}</p>
        <h3>{subtitle}</h3>
        <p className="muscle-map-total">{totalUsageLabel}</p>
      </header>
      {primaryFocus || secondaryFocus ? (
        <dl className="muscle-map-focus" aria-label={`${title} focus summary`}>
          {primaryFocus ? (
            <div>
              <dt>Primary focus</dt>
              <dd>{primaryFocus.label}</dd>
            </div>
          ) : null}
          {secondaryFocus ? (
            <div>
              <dt>Secondary focus</dt>
              <dd>{secondaryFocus.label}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {mapData.length === 0 ? (
        <p className="muscle-map-empty">
          No mapped muscles available for this selection.
        </p>
      ) : (
        <div
          className="muscle-map-body-wrap"
          aria-label={`${title} anatomy map`}
        >
          <Body
            data={mapData}
            side="front"
            colors={MAP_COLORS}
            defaultFill="#f2ebe0"
            defaultStroke="#d6c7af"
            defaultStrokeWidth={0.6}
            border="#d6c7af"
            scale={1.05}
          />
          <Body
            data={mapData}
            side="back"
            colors={MAP_COLORS}
            defaultFill="#f2ebe0"
            defaultStroke="#d6c7af"
            defaultStrokeWidth={0.6}
            border="#d6c7af"
            scale={1.05}
          />
        </div>
      )}
      <ul
        className="muscle-map-legend"
        aria-label={`${title} top muscle usage`}
      >
        {legend.map((entry) => (
          <li key={`${entry.key}-${entry.value}`}>
            <span>{entry.label}</span>
            <strong>{entry.value.toFixed(1)}</strong>
          </li>
        ))}
      </ul>
    </article>
  );
}

interface MuscleMapExplorerProps {
  response?: MuscleUsageApiResponse;
}

export function MuscleMapExplorer({ response }: MuscleMapExplorerProps) {
  const [routineId, setRoutineId] = useState<string>();
  const [exerciseId, setExerciseId] = useState<string>();
  const responseData = response ?? EMPTY_MUSCLE_USAGE_RESPONSE;

  const model = useMemo(
    () => createMuscleMapViewModel(responseData, { routineId, exerciseId }),
    [exerciseId, responseData, routineId],
  );
  const hasRoutineOptions = model.routineOptions.length > 0;
  const hasExerciseOptions = model.exerciseOptions.length > 0;

  return (
    <section
      id="muscle-map"
      className="section anchor-target muscle-map-section"
    >
      <header className="section-header muscle-map-header">
        <h2>Muscle Map Explorer</h2>
        <p>
          Review deterministic usage at exercise, routine, and microcycle levels
          before finalizing your week.
        </p>
      </header>

      <div className="muscle-map-controls">
        <label htmlFor="routine-select">Routine</label>
        <select
          id="routine-select"
          value={model.selectedRoutineId}
          disabled={!hasRoutineOptions}
          onChange={(event) => {
            setRoutineId(event.target.value);
            setExerciseId(undefined);
          }}
        >
          {!hasRoutineOptions ? (
            <option value="">No routines available</option>
          ) : null}
          {model.routineOptions.map((routine) => (
            <option key={routine.routineId} value={routine.routineId}>
              {routine.routineName ?? routine.routineId}
            </option>
          ))}
        </select>

        <label htmlFor="exercise-select">Exercise</label>
        <select
          id="exercise-select"
          value={model.selectedExerciseId}
          disabled={!hasExerciseOptions}
          onChange={(event) => setExerciseId(event.target.value)}
        >
          {!hasExerciseOptions ? (
            <option value="">No exercises available</option>
          ) : null}
          {model.exerciseOptions.map((exercise) => (
            <option key={exercise.exerciseId} value={exercise.exerciseId}>
              {exercise.exerciseName}
            </option>
          ))}
        </select>
      </div>

      <div className="muscle-map-grid">
        <MuscleMapCard
          title="Exercise map"
          subtitle={model.exerciseDisplayName}
          totalUsageLabel={`Total usage ${model.exerciseTotalUsage.toFixed(1)}`}
          mapData={model.exerciseMap}
          legend={model.exerciseLegend}
          primaryFocus={model.exercisePrimaryFocus}
          secondaryFocus={model.exerciseSecondaryFocus}
        />
        <MuscleMapCard
          title="Routine map"
          subtitle={model.routineDisplayName}
          totalUsageLabel={`Total usage ${model.routineTotalUsage.toFixed(1)}`}
          mapData={model.routineMap}
          legend={model.routineLegend}
        />
        <MuscleMapCard
          title="Microcycle map"
          subtitle={model.microcycleDisplayName}
          totalUsageLabel={`Total usage ${model.microcycleTotalUsage.toFixed(1)}`}
          mapData={model.microcycleMap}
          legend={model.microcycleLegend}
        />
      </div>
    </section>
  );
}
