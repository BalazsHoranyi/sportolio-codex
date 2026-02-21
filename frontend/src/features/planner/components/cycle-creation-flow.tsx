"use client";

import React, { useEffect, useMemo, useState } from "react";
import Body from "react-muscle-highlighter";

import { evaluatePlannerAdvisories } from "../advisory";
import {
  buildMicrocycleReflowProjection,
  deriveMesocycleStrategySet,
  type MesocycleStrategyResult,
  type MicrocycleReflowProjection,
} from "../mesocycle-strategy";
import { buildPlannerReviewMuscleSummary } from "../review-muscle-summary";
import {
  clearPlannerDraft,
  loadPlannerDraft,
  savePlannerDraft,
} from "../draft-storage";
import {
  createDefaultMesocycleStrategy,
  createInitialPlannerDraft,
  type MesocycleFocus,
  type PlannerEventDraft,
  type PlannerEventType,
  type PlannerMesocycleStrategyConfig,
  type PeriodizationType,
  type PlannerDraft,
  type PlannerGoalDraft,
  type PlannerMesocycleDraft,
  type PlannerWorkoutDraft,
  type WorkoutDay,
  type WorkoutIntensity,
  type WorkoutType,
  weekDays,
} from "../types";

type PlannerStep = "macro" | "mesocycle" | "microcycle" | "review";

interface StepMeta {
  key: PlannerStep;
  title: string;
}

const stepSequence: StepMeta[] = [
  { key: "macro", title: "Macro goals and events" },
  { key: "mesocycle", title: "Mesocycle strategy" },
  { key: "microcycle", title: "Microcycle details" },
  { key: "review", title: "Review and publish" },
];

const plannerReviewMapColors = [
  "#f4d8a6",
  "#e8aa69",
  "#d96c2a",
  "#8f3608",
] as const;

function formatToken(value: string): string {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function nextNumericId(prefix: string, existingIds: string[]): string {
  const nextValue =
    existingIds
      .map((id) => {
        const match = id.match(new RegExp(`^${prefix}-(\\d+)$`));
        return match ? Number.parseInt(match[1] ?? "0", 10) : 0;
      })
      .reduce((max, value) => Math.max(max, value), 0) + 1;

  return `${prefix}-${nextValue}`;
}

function asPositiveInteger(value: string, fallback = 1): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function normalizeMesocycleStrategyForDuration(
  strategy: PlannerMesocycleStrategyConfig,
  durationWeeks: number,
): PlannerMesocycleStrategyConfig {
  const safeDurationWeeks = Math.max(1, durationWeeks);

  return {
    ...strategy,
    linear: {
      ...strategy.linear,
      peakWeek: Math.min(
        safeDurationWeeks,
        Math.max(1, strategy.linear.peakWeek),
      ),
    },
  };
}

function validateMacroStep(draft: PlannerDraft): string[] {
  const errors: string[] = [];

  if (draft.planName.trim().length === 0) {
    errors.push("Plan name is required.");
  }

  if (!draft.startDate) {
    errors.push("Start date is required.");
  }

  if (!draft.endDate) {
    errors.push("Target end date is required.");
  }

  if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) {
    errors.push("Start date must be before or equal to target end date.");
  }

  if (draft.goals.length === 0) {
    errors.push("At least one goal is required.");
  }

  const priorities = draft.goals.map((goal) => goal.priority);
  if (new Set(priorities).size !== priorities.length) {
    errors.push("Each goal must have a unique priority rank.");
  }

  draft.goals.forEach((goal, index) => {
    const goalPosition = index + 1;

    if (goal.title.trim().length === 0) {
      errors.push(`Goal ${goalPosition}: title is required.`);
    }

    if (goal.metric.trim().length === 0) {
      errors.push(`Goal ${goalPosition}: target metric is required.`);
    }

    if (!goal.targetDate) {
      errors.push(`Goal ${goalPosition}: target date is required.`);
    }
  });

  draft.events.forEach((event, index) => {
    const eventPosition = index + 1;

    if (event.name.trim().length === 0) {
      errors.push(`Event ${eventPosition}: name is required.`);
    }

    if (!event.eventDate) {
      errors.push(`Event ${eventPosition}: date is required.`);
    }

    if (
      event.eventDate &&
      draft.startDate &&
      draft.endDate &&
      (event.eventDate < draft.startDate || event.eventDate > draft.endDate)
    ) {
      errors.push(
        `Event ${eventPosition}: date must be inside the plan start/end window.`,
      );
    }
  });

  return errors;
}

function validateMesocycleStep(
  draft: PlannerDraft,
  strategyResults: MesocycleStrategyResult[],
): string[] {
  const errors: string[] = [];

  if (draft.mesocycles.length === 0) {
    errors.push("At least one mesocycle is required.");
  }

  draft.mesocycles.forEach((mesocycle, index) => {
    const mesocyclePosition = index + 1;

    if (mesocycle.name.trim().length === 0) {
      errors.push(`Mesocycle ${mesocyclePosition}: name is required.`);
    }

    if (mesocycle.durationWeeks <= 0) {
      errors.push(
        `Mesocycle ${mesocyclePosition}: duration must be at least one week.`,
      );
    }

    const strategyResult = strategyResults.find(
      (candidate) => candidate.mesocycleId === mesocycle.mesocycleId,
    );
    if (!strategyResult) {
      return;
    }

    strategyResult.validationErrors.forEach((error) => {
      errors.push(`Mesocycle ${mesocyclePosition}: ${error}`);
    });
  });

  return errors;
}

function validateMicrocycleStep(draft: PlannerDraft): string[] {
  const errors: string[] = [];

  if (draft.microcycle.workouts.length === 0) {
    errors.push("At least one workout is required.");
  }

  draft.microcycle.workouts.forEach((workout, index) => {
    const workoutPosition = index + 1;

    if (workout.label.trim().length === 0) {
      errors.push(`Workout ${workoutPosition}: label is required.`);
    }
  });

  return errors;
}

function validateStep(
  step: PlannerStep,
  draft: PlannerDraft,
  strategyResults: MesocycleStrategyResult[],
): string[] {
  if (step === "macro") {
    return validateMacroStep(draft);
  }

  if (step === "mesocycle") {
    return validateMesocycleStep(draft, strategyResults);
  }

  if (step === "microcycle") {
    return validateMicrocycleStep(draft);
  }

  return [];
}

function nextStepButtonLabel(step: PlannerStep): string | null {
  if (step === "macro") {
    return "Next: Mesocycle strategy";
  }

  if (step === "mesocycle") {
    return "Next: Microcycle details";
  }

  if (step === "microcycle") {
    return "Next: Review";
  }

  return null;
}

export function CycleCreationFlow() {
  const [draft, setDraft] = useState<PlannerDraft>(createInitialPlannerDraft);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const currentStep = stepSequence[currentStepIndex]?.key ?? "macro";

  const advisories = useMemo(() => evaluatePlannerAdvisories(draft), [draft]);
  const strategyResults = useMemo(
    () => deriveMesocycleStrategySet(draft.mesocycles),
    [draft.mesocycles],
  );
  const strategyResultByMesocycleId = useMemo(
    () =>
      new Map(
        strategyResults.map((result) => [result.mesocycleId, result] as const),
      ),
    [strategyResults],
  );
  const reflowProjection = useMemo<MicrocycleReflowProjection>(
    () => buildMicrocycleReflowProjection(draft),
    [draft],
  );
  const reviewMuscleSummary = useMemo(
    () => buildPlannerReviewMuscleSummary(draft),
    [draft],
  );

  useEffect(() => {
    const restored = loadPlannerDraft();
    if (!restored) {
      return;
    }

    setDraft(restored);
    setStatusMessage("Restored saved draft.");
  }, []);

  function updateDraft(update: (previous: PlannerDraft) => PlannerDraft) {
    setDraft((previous) => update(previous));
  }

  function onSaveDraft() {
    savePlannerDraft(draft);
    setStatusMessage("Draft saved.");
  }

  function onClearDraft() {
    clearPlannerDraft();
    setDraft(createInitialPlannerDraft());
    setCurrentStepIndex(0);
    setValidationErrors([]);
    setStatusMessage("Draft cleared.");
  }

  function goBack() {
    setValidationErrors([]);
    setCurrentStepIndex((previous) => Math.max(previous - 1, 0));
  }

  function goNext() {
    const errors = validateStep(currentStep, draft, strategyResults);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setStatusMessage(null);
      return;
    }

    setValidationErrors([]);
    setCurrentStepIndex((previous) =>
      Math.min(previous + 1, stepSequence.length - 1),
    );
  }

  function publishCycle() {
    savePlannerDraft(draft);
    setStatusMessage(
      "Cycle published to review queue. Warnings remain advisory-only.",
    );
  }

  function updateGoal(goalId: string, update: Partial<PlannerGoalDraft>) {
    updateDraft((previous) => ({
      ...previous,
      goals: previous.goals.map((goal) =>
        goal.goalId === goalId
          ? {
              ...goal,
              ...update,
            }
          : goal,
      ),
    }));
  }

  function addGoal() {
    updateDraft((previous) => ({
      ...previous,
      goals: [
        ...previous.goals,
        {
          goalId: nextNumericId(
            "goal",
            previous.goals.map((goal) => goal.goalId),
          ),
          title: "",
          metric: "",
          targetDate: "",
          modality: "strength",
          priority: previous.goals.length + 1,
        },
      ],
    }));
  }

  function removeGoal(goalId: string) {
    updateDraft((previous) => {
      if (previous.goals.length === 1) {
        return previous;
      }

      return {
        ...previous,
        goals: previous.goals.filter((goal) => goal.goalId !== goalId),
      };
    });
  }

  function updateEvent(eventId: string, update: Partial<PlannerEventDraft>) {
    updateDraft((previous) => ({
      ...previous,
      events: previous.events.map((event) =>
        event.eventId === eventId
          ? {
              ...event,
              ...update,
            }
          : event,
      ),
    }));
  }

  function addEvent() {
    updateDraft((previous) => ({
      ...previous,
      events: [
        ...previous.events,
        {
          eventId: nextNumericId(
            "event",
            previous.events.map((event) => event.eventId),
          ),
          name: "",
          eventDate: "",
          eventType: "race",
        },
      ],
    }));
  }

  function removeEvent(eventId: string) {
    updateDraft((previous) => ({
      ...previous,
      events: previous.events.filter((event) => event.eventId !== eventId),
    }));
  }

  function updateMesocycle(
    mesocycleId: string,
    update: Partial<PlannerMesocycleDraft>,
  ) {
    updateDraft((previous) => ({
      ...previous,
      mesocycles: previous.mesocycles.map((mesocycle) =>
        mesocycle.mesocycleId !== mesocycleId
          ? mesocycle
          : (() => {
              const nextDurationWeeks =
                typeof update.durationWeeks === "number"
                  ? Math.max(1, update.durationWeeks)
                  : mesocycle.durationWeeks;
              const mergedStrategy = update.strategy ?? mesocycle.strategy;

              return {
                ...mesocycle,
                ...update,
                durationWeeks: nextDurationWeeks,
                strategy: normalizeMesocycleStrategyForDuration(
                  mergedStrategy,
                  nextDurationWeeks,
                ),
              };
            })(),
      ),
    }));
  }

  function updateMesocycleStrategy<K extends PeriodizationType>(
    mesocycleId: string,
    periodization: K,
    update: Partial<PlannerMesocycleDraft["strategy"][K]>,
  ) {
    updateDraft((previous) => ({
      ...previous,
      mesocycles: previous.mesocycles.map((mesocycle) =>
        mesocycle.mesocycleId !== mesocycleId
          ? mesocycle
          : {
              ...mesocycle,
              strategy: normalizeMesocycleStrategyForDuration(
                {
                  ...mesocycle.strategy,
                  [periodization]: {
                    ...mesocycle.strategy[periodization],
                    ...update,
                  },
                },
                mesocycle.durationWeeks,
              ),
            },
      ),
    }));
  }

  function addMesocycle() {
    updateDraft((previous) => ({
      ...previous,
      mesocycles: [
        ...previous.mesocycles,
        {
          mesocycleId: nextNumericId(
            "mesocycle",
            previous.mesocycles.map((mesocycle) => mesocycle.mesocycleId),
          ),
          name: "",
          periodization: "block",
          focus: "hybrid",
          durationWeeks: 4,
          strategy: createDefaultMesocycleStrategy(4),
        },
      ],
    }));
  }

  function removeMesocycle(mesocycleId: string) {
    updateDraft((previous) => {
      if (previous.mesocycles.length === 1) {
        return previous;
      }

      return {
        ...previous,
        mesocycles: previous.mesocycles.filter(
          (mesocycle) => mesocycle.mesocycleId !== mesocycleId,
        ),
      };
    });
  }

  function updateWorkout(
    workoutId: string,
    update: Partial<PlannerWorkoutDraft>,
  ) {
    updateDraft((previous) => ({
      ...previous,
      microcycle: {
        workouts: previous.microcycle.workouts.map((workout) =>
          workout.workoutId === workoutId
            ? {
                ...workout,
                ...update,
              }
            : workout,
        ),
      },
    }));
  }

  function addWorkout() {
    updateDraft((previous) => ({
      ...previous,
      microcycle: {
        workouts: [
          ...previous.microcycle.workouts,
          {
            workoutId: nextNumericId(
              "workout",
              previous.microcycle.workouts.map((workout) => workout.workoutId),
            ),
            day: "monday",
            label: "",
            type: "strength",
            intensity: "moderate",
          },
        ],
      },
    }));
  }

  function removeWorkout(workoutId: string) {
    updateDraft((previous) => {
      if (previous.microcycle.workouts.length === 1) {
        return previous;
      }

      return {
        ...previous,
        microcycle: {
          workouts: previous.microcycle.workouts.filter(
            (workout) => workout.workoutId !== workoutId,
          ),
        },
      };
    });
  }

  return (
    <section
      className="planner-flow-shell section"
      aria-labelledby="planner-flow-title"
    >
      <header className="planner-flow-header">
        <p className="eyebrow">Planning</p>
        <h1 id="planner-flow-title">Cycle creation flow</h1>
        <p className="planner-flow-copy">
          Move from macro goals to executable microcycle details with explicit
          priorities, advisory warnings, and deterministic draft persistence.
        </p>
      </header>

      <ol className="planner-step-indicator" aria-label="Planner steps">
        {stepSequence.map((step, index) => (
          <li
            className={
              index === currentStepIndex
                ? "planner-step-chip planner-step-chip-active"
                : "planner-step-chip"
            }
            key={step.key}
          >
            <span>{index + 1}</span>
            <p>{step.title}</p>
          </li>
        ))}
      </ol>

      {statusMessage ? (
        <p className="planner-flow-status" role="status" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}

      {validationErrors.length > 0 ? (
        <div className="planner-flow-error" role="status" aria-live="polite">
          <h3>Validation errors</h3>
          <ul>
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {currentStep === "macro" ? (
        <article
          className="planner-flow-panel"
          aria-label="Macro goals and events"
        >
          <h2>Macro goals and events</h2>
          <p className="planner-flow-helper">
            Define your cycle timeline and rank goals explicitly so trade-offs
            stay predictable.
          </p>

          <div className="planner-flow-grid planner-flow-grid-two">
            <label htmlFor="plan-name">
              Plan name
              <input
                id="plan-name"
                className="planner-flow-input"
                name="planName"
                value={draft.planName}
                onChange={(event) =>
                  updateDraft((previous) => ({
                    ...previous,
                    planName: event.target.value,
                  }))
                }
              />
            </label>

            <label htmlFor="plan-start-date">
              Start date
              <input
                id="plan-start-date"
                className="planner-flow-input"
                name="startDate"
                type="date"
                value={draft.startDate}
                onChange={(event) =>
                  updateDraft((previous) => ({
                    ...previous,
                    startDate: event.target.value,
                  }))
                }
              />
            </label>

            <label htmlFor="plan-end-date">
              Target end date
              <input
                id="plan-end-date"
                className="planner-flow-input"
                name="endDate"
                type="date"
                value={draft.endDate}
                onChange={(event) =>
                  updateDraft((previous) => ({
                    ...previous,
                    endDate: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="planner-flow-subheader">
            <h3>Goals</h3>
            <button
              className="planner-flow-action"
              type="button"
              onClick={addGoal}
            >
              Add goal
            </button>
          </div>

          <ul className="planner-flow-card-list" aria-label="Configured goals">
            {draft.goals.map((goal) => {
              const goalTitleId = `goal-title-${goal.goalId}`;
              const goalMetricId = `goal-metric-${goal.goalId}`;
              const goalTargetDateId = `goal-target-date-${goal.goalId}`;
              const goalModalityId = `goal-modality-${goal.goalId}`;
              const goalPriorityId = `goal-priority-${goal.goalId}`;

              return (
                <li key={goal.goalId}>
                  <div className="planner-flow-grid planner-flow-grid-two">
                    <label htmlFor={goalTitleId}>
                      Goal title
                      <input
                        id={goalTitleId}
                        className="planner-flow-input"
                        name={goalTitleId}
                        value={goal.title}
                        onChange={(event) =>
                          updateGoal(goal.goalId, {
                            title: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label htmlFor={goalMetricId}>
                      Target metric
                      <input
                        id={goalMetricId}
                        className="planner-flow-input"
                        name={goalMetricId}
                        value={goal.metric}
                        onChange={(event) =>
                          updateGoal(goal.goalId, {
                            metric: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label htmlFor={goalTargetDateId}>
                      Goal target date
                      <input
                        id={goalTargetDateId}
                        className="planner-flow-input"
                        name={goalTargetDateId}
                        type="date"
                        value={goal.targetDate}
                        onChange={(event) =>
                          updateGoal(goal.goalId, {
                            targetDate: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label htmlFor={goalModalityId}>
                      Modality
                      <select
                        id={goalModalityId}
                        className="planner-flow-select"
                        name={goalModalityId}
                        value={goal.modality}
                        onChange={(event) =>
                          updateGoal(goal.goalId, {
                            modality: event.target
                              .value as PlannerGoalDraft["modality"],
                          })
                        }
                      >
                        <option value="strength">Strength</option>
                        <option value="endurance">Endurance</option>
                      </select>
                    </label>

                    <label htmlFor={goalPriorityId}>
                      Priority rank
                      <select
                        id={goalPriorityId}
                        className="planner-flow-select"
                        name={goalPriorityId}
                        value={goal.priority}
                        onChange={(event) =>
                          updateGoal(goal.goalId, {
                            priority: asPositiveInteger(event.target.value, 1),
                          })
                        }
                      >
                        {Array.from({
                          length: Math.max(8, draft.goals.length + 2),
                        }).map((_, index) => (
                          <option
                            key={`priority-${index + 1}`}
                            value={index + 1}
                          >
                            {index + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <button
                    className="planner-flow-link"
                    type="button"
                    onClick={() => removeGoal(goal.goalId)}
                  >
                    Remove goal
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="planner-flow-subheader">
            <h3>Events</h3>
            <button
              className="planner-flow-action"
              type="button"
              onClick={addEvent}
            >
              Add event
            </button>
          </div>

          {draft.events.length === 0 ? (
            <p className="planner-flow-empty">
              No events configured. Add races, meets, or assessments if your
              cycle has fixed dates.
            </p>
          ) : (
            <ul
              className="planner-flow-card-list"
              aria-label="Configured events"
            >
              {draft.events.map((event) => {
                const eventNameId = `event-name-${event.eventId}`;
                const eventDateId = `event-date-${event.eventId}`;
                const eventTypeId = `event-type-${event.eventId}`;

                return (
                  <li key={event.eventId}>
                    <div className="planner-flow-grid planner-flow-grid-two">
                      <label htmlFor={eventNameId}>
                        Event name
                        <input
                          id={eventNameId}
                          className="planner-flow-input"
                          name={eventNameId}
                          value={event.name}
                          onChange={(inputEvent) =>
                            updateEvent(event.eventId, {
                              name: inputEvent.target.value,
                            })
                          }
                        />
                      </label>

                      <label htmlFor={eventDateId}>
                        Event date
                        <input
                          id={eventDateId}
                          className="planner-flow-input"
                          name={eventDateId}
                          type="date"
                          value={event.eventDate}
                          onChange={(inputEvent) =>
                            updateEvent(event.eventId, {
                              eventDate: inputEvent.target.value,
                            })
                          }
                        />
                      </label>

                      <label htmlFor={eventTypeId}>
                        Event type
                        <select
                          id={eventTypeId}
                          className="planner-flow-select"
                          name={eventTypeId}
                          value={event.eventType}
                          onChange={(inputEvent) =>
                            updateEvent(event.eventId, {
                              eventType: inputEvent.target
                                .value as PlannerEventType,
                            })
                          }
                        >
                          <option value="race">Race</option>
                          <option value="meet">Meet</option>
                          <option value="assessment">Assessment</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                    </div>

                    <button
                      className="planner-flow-link"
                      type="button"
                      onClick={() => removeEvent(event.eventId)}
                    >
                      Remove event
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      ) : null}

      {currentStep === "mesocycle" ? (
        <article className="planner-flow-panel" aria-label="Mesocycle strategy">
          <h2>Mesocycle strategy</h2>
          <p className="planner-flow-helper">
            Configure periodization strategy per mesocycle to shape modality
            emphasis before weekly execution.
          </p>

          <div className="planner-flow-subheader">
            <h3>Mesocycles</h3>
            <button
              className="planner-flow-action"
              type="button"
              onClick={addMesocycle}
            >
              Add mesocycle
            </button>
          </div>

          <ul
            className="planner-flow-card-list"
            aria-label="Configured mesocycles"
          >
            {draft.mesocycles.map((mesocycle) => {
              const strategyResult = strategyResultByMesocycleId.get(
                mesocycle.mesocycleId,
              );
              const mesocycleNameId = `mesocycle-name-${mesocycle.mesocycleId}`;
              const mesocyclePeriodizationId = `mesocycle-periodization-${mesocycle.mesocycleId}`;
              const mesocycleFocusId = `mesocycle-focus-${mesocycle.mesocycleId}`;
              const mesocycleDurationId = `mesocycle-duration-${mesocycle.mesocycleId}`;
              const blockAccumulationId = `mesocycle-block-accumulation-${mesocycle.mesocycleId}`;
              const blockIntensificationId = `mesocycle-block-intensification-${mesocycle.mesocycleId}`;
              const blockIncludeDeloadId = `mesocycle-block-deload-${mesocycle.mesocycleId}`;
              const blockStrengthBiasId = `mesocycle-block-strength-bias-${mesocycle.mesocycleId}`;
              const blockEnduranceBiasId = `mesocycle-block-endurance-bias-${mesocycle.mesocycleId}`;
              const dupStrengthSessionsId = `mesocycle-dup-strength-${mesocycle.mesocycleId}`;
              const dupEnduranceSessionsId = `mesocycle-dup-endurance-${mesocycle.mesocycleId}`;
              const dupRecoverySessionsId = `mesocycle-dup-recovery-${mesocycle.mesocycleId}`;
              const dupRotationId = `mesocycle-dup-rotation-${mesocycle.mesocycleId}`;
              const linearStartIntensityId = `mesocycle-linear-start-${mesocycle.mesocycleId}`;
              const linearProgressionId = `mesocycle-linear-progression-${mesocycle.mesocycleId}`;
              const linearPeakWeekId = `mesocycle-linear-peak-${mesocycle.mesocycleId}`;

              return (
                <li key={mesocycle.mesocycleId}>
                  <div className="planner-flow-grid planner-flow-grid-two">
                    <label htmlFor={mesocycleNameId}>
                      Mesocycle name
                      <input
                        id={mesocycleNameId}
                        className="planner-flow-input"
                        name={mesocycleNameId}
                        value={mesocycle.name}
                        onChange={(event) =>
                          updateMesocycle(mesocycle.mesocycleId, {
                            name: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label htmlFor={mesocyclePeriodizationId}>
                      Periodization type
                      <select
                        id={mesocyclePeriodizationId}
                        className="planner-flow-select"
                        name={mesocyclePeriodizationId}
                        value={mesocycle.periodization}
                        onChange={(event) =>
                          updateMesocycle(mesocycle.mesocycleId, {
                            periodization: event.target
                              .value as PeriodizationType,
                          })
                        }
                      >
                        <option value="block">Block</option>
                        <option value="dup">DUP</option>
                        <option value="linear">Linear</option>
                      </select>
                    </label>

                    <label htmlFor={mesocycleFocusId}>
                      Focus modality
                      <select
                        id={mesocycleFocusId}
                        className="planner-flow-select"
                        name={mesocycleFocusId}
                        value={mesocycle.focus}
                        onChange={(event) =>
                          updateMesocycle(mesocycle.mesocycleId, {
                            focus: event.target.value as MesocycleFocus,
                          })
                        }
                      >
                        <option value="hybrid">Hybrid</option>
                        <option value="strength">Strength</option>
                        <option value="endurance">Endurance</option>
                      </select>
                    </label>

                    <label htmlFor={mesocycleDurationId}>
                      Duration (weeks)
                      <input
                        id={mesocycleDurationId}
                        className="planner-flow-input"
                        name={mesocycleDurationId}
                        type="number"
                        min={1}
                        step={1}
                        value={mesocycle.durationWeeks}
                        onChange={(event) =>
                          updateMesocycle(mesocycle.mesocycleId, {
                            durationWeeks: asPositiveInteger(
                              event.target.value,
                              1,
                            ),
                          })
                        }
                      />
                    </label>
                  </div>

                  {mesocycle.periodization === "block" ? (
                    <div className="planner-flow-grid planner-flow-grid-two">
                      <label htmlFor={blockAccumulationId}>
                        Block accumulation weeks
                        <input
                          id={blockAccumulationId}
                          className="planner-flow-input"
                          name={blockAccumulationId}
                          min={1}
                          step={1}
                          type="number"
                          value={mesocycle.strategy.block.accumulationWeeks}
                          onChange={(event) =>
                            updateMesocycleStrategy(
                              mesocycle.mesocycleId,
                              "block",
                              {
                                accumulationWeeks: asPositiveInteger(
                                  event.target.value,
                                  1,
                                ),
                              },
                            )
                          }
                        />
                      </label>

                      <label htmlFor={blockIntensificationId}>
                        Block intensification weeks
                        <input
                          id={blockIntensificationId}
                          className="planner-flow-input"
                          name={blockIntensificationId}
                          min={1}
                          step={1}
                          type="number"
                          value={mesocycle.strategy.block.intensificationWeeks}
                          onChange={(event) =>
                            updateMesocycleStrategy(
                              mesocycle.mesocycleId,
                              "block",
                              {
                                intensificationWeeks: asPositiveInteger(
                                  event.target.value,
                                  1,
                                ),
                              },
                            )
                          }
                        />
                      </label>

                      <label htmlFor={blockStrengthBiasId}>
                        Block strength bias (%)
                        <input
                          id={blockStrengthBiasId}
                          className="planner-flow-input"
                          name={blockStrengthBiasId}
                          max={100}
                          min={0}
                          step={1}
                          type="number"
                          value={mesocycle.strategy.block.strengthBias}
                          onChange={(event) =>
                            updateMesocycleStrategy(
                              mesocycle.mesocycleId,
                              "block",
                              {
                                strengthBias: Math.max(
                                  0,
                                  asPositiveInteger(event.target.value, 0),
                                ),
                              },
                            )
                          }
                        />
                      </label>

                      <label htmlFor={blockEnduranceBiasId}>
                        Block endurance bias (%)
                        <input
                          id={blockEnduranceBiasId}
                          className="planner-flow-input"
                          name={blockEnduranceBiasId}
                          max={100}
                          min={0}
                          step={1}
                          type="number"
                          value={mesocycle.strategy.block.enduranceBias}
                          onChange={(event) =>
                            updateMesocycleStrategy(
                              mesocycle.mesocycleId,
                              "block",
                              {
                                enduranceBias: Math.max(
                                  0,
                                  asPositiveInteger(event.target.value, 0),
                                ),
                              },
                            )
                          }
                        />
                      </label>

                      <label
                        className="planner-flow-toggle"
                        htmlFor={blockIncludeDeloadId}
                      >
                        <input
                          checked={mesocycle.strategy.block.includeDeloadWeek}
                          id={blockIncludeDeloadId}
                          name={blockIncludeDeloadId}
                          type="checkbox"
                          onChange={(event) =>
                            updateMesocycleStrategy(
                              mesocycle.mesocycleId,
                              "block",
                              {
                                includeDeloadWeek: event.target.checked,
                              },
                            )
                          }
                        />
                        Include deload week
                      </label>
                    </div>
                  ) : null}

                  {mesocycle.periodization === "dup" ? (
                    <div className="planner-flow-grid planner-flow-grid-two">
                      <label htmlFor={dupStrengthSessionsId}>
                        DUP strength sessions per week
                        <input
                          id={dupStrengthSessionsId}
                          className="planner-flow-input"
                          name={dupStrengthSessionsId}
                          min={0}
                          step={1}
                          type="number"
                          value={mesocycle.strategy.dup.strengthSessionsPerWeek}
                          onChange={(event) =>
                            updateMesocycleStrategy(
                              mesocycle.mesocycleId,
                              "dup",
                              {
                                strengthSessionsPerWeek: Math.max(
                                  0,
                                  asPositiveInteger(event.target.value, 0),
                                ),
                              },
                            )
                          }
                        />
                      </label>

                      <label htmlFor={dupEnduranceSessionsId}>
                        DUP endurance sessions per week
                        <input
                          id={dupEnduranceSessionsId}
                          className="planner-flow-input"
                          name={dupEnduranceSessionsId}
                          min={0}
                          step={1}
                          type="number"
                          value={
                            mesocycle.strategy.dup.enduranceSessionsPerWeek
                          }
                          onChange={(event) =>
                            updateMesocycleStrategy(
                              mesocycle.mesocycleId,
                              "dup",
                              {
                                enduranceSessionsPerWeek: Math.max(
                                  0,
                                  asPositiveInteger(event.target.value, 0),
                                ),
                              },
                            )
                          }
                        />
                      </label>

                      <label htmlFor={dupRecoverySessionsId}>
                        DUP recovery sessions per week
                        <input
                          id={dupRecoverySessionsId}
                          className="planner-flow-input"
                          name={dupRecoverySessionsId}
                          min={0}
                          step={1}
                          type="number"
                          value={mesocycle.strategy.dup.recoverySessionsPerWeek}
                          onChange={(event) =>
                            updateMesocycleStrategy(
                              mesocycle.mesocycleId,
                              "dup",
                              {
                                recoverySessionsPerWeek: Math.max(
                                  0,
                                  asPositiveInteger(event.target.value, 0),
                                ),
                              },
                            )
                          }
                        />
                      </label>

                      <label htmlFor={dupRotationId}>
                        DUP intensity rotation
                        <select
                          id={dupRotationId}
                          className="planner-flow-select"
                          name={dupRotationId}
                          value={mesocycle.strategy.dup.intensityRotation}
                          onChange={(event) =>
                            updateMesocycleStrategy(
                              mesocycle.mesocycleId,
                              "dup",
                              {
                                intensityRotation: event.target
                                  .value as PlannerMesocycleDraft["strategy"]["dup"]["intensityRotation"],
                              },
                            )
                          }
                        >
                          <option value="alternating">Alternating</option>
                          <option value="ascending">Ascending</option>
                          <option value="descending">Descending</option>
                        </select>
                      </label>
                    </div>
                  ) : null}

                  {mesocycle.periodization === "linear" ? (
                    <div className="planner-flow-grid planner-flow-grid-two">
                      <label htmlFor={linearStartIntensityId}>
                        Linear start intensity
                        <select
                          id={linearStartIntensityId}
                          className="planner-flow-select"
                          name={linearStartIntensityId}
                          value={mesocycle.strategy.linear.startIntensity}
                          onChange={(event) =>
                            updateMesocycleStrategy(
                              mesocycle.mesocycleId,
                              "linear",
                              {
                                startIntensity: event.target
                                  .value as PlannerMesocycleDraft["strategy"]["linear"]["startIntensity"],
                              },
                            )
                          }
                        >
                          <option value="easy">Easy</option>
                          <option value="moderate">Moderate</option>
                          <option value="hard">Hard</option>
                        </select>
                      </label>

                      <label htmlFor={linearProgressionId}>
                        Weekly progression %
                        <input
                          id={linearProgressionId}
                          className="planner-flow-input"
                          name={linearProgressionId}
                          min={1}
                          step={1}
                          type="number"
                          value={
                            mesocycle.strategy.linear.weeklyProgressionPercent
                          }
                          onChange={(event) =>
                            updateMesocycleStrategy(
                              mesocycle.mesocycleId,
                              "linear",
                              {
                                weeklyProgressionPercent: asPositiveInteger(
                                  event.target.value,
                                  1,
                                ),
                              },
                            )
                          }
                        />
                      </label>

                      <label htmlFor={linearPeakWeekId}>
                        Linear peak week
                        <input
                          id={linearPeakWeekId}
                          className="planner-flow-input"
                          name={linearPeakWeekId}
                          min={1}
                          step={1}
                          type="number"
                          value={mesocycle.strategy.linear.peakWeek}
                          onChange={(event) =>
                            updateMesocycleStrategy(
                              mesocycle.mesocycleId,
                              "linear",
                              {
                                peakWeek: asPositiveInteger(
                                  event.target.value,
                                  1,
                                ),
                              },
                            )
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  {strategyResult ? (
                    <section className="planner-mesocycle-output">
                      <p className="planner-mesocycle-output-title">
                        Expected modality emphasis
                      </p>
                      <p className="planner-flow-empty">
                        Strength {strategyResult.emphasis.strengthPercent}% ·
                        Endurance {strategyResult.emphasis.endurancePercent}% ·
                        Recovery {strategyResult.emphasis.recoveryPercent}%
                      </p>
                      <p className="planner-flow-empty">
                        {strategyResult.emphasis.label}
                      </p>

                      <p className="planner-mesocycle-output-title">
                        Upcoming microcycle reflow
                      </p>
                      <ol className="planner-mesocycle-preview">
                        {strategyResult.projectedWeeks.map((week) => (
                          <li key={`${mesocycle.mesocycleId}-${week.week}`}>
                            Week {week.week}: {formatToken(week.phase)} ·{" "}
                            {formatToken(week.primaryFocus)} focus ·{" "}
                            {week.targetLoadPercent}% load ·{" "}
                            {formatToken(week.intensityWave)} wave
                          </li>
                        ))}
                      </ol>

                      {strategyResult.validationErrors.length > 0 ? (
                        <ul className="planner-flow-inline-error">
                          {strategyResult.validationErrors.map((error) => (
                            <li key={`${mesocycle.mesocycleId}-${error}`}>
                              {error}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </section>
                  ) : null}

                  <button
                    className="planner-flow-link"
                    type="button"
                    onClick={() => removeMesocycle(mesocycle.mesocycleId)}
                  >
                    Remove mesocycle
                  </button>
                </li>
              );
            })}
          </ul>
        </article>
      ) : null}

      {currentStep === "microcycle" ? (
        <article className="planner-flow-panel" aria-label="Microcycle details">
          <h2>Microcycle details</h2>
          <p className="planner-flow-helper">
            Build week-level execution details. Warnings are advisory and
            refined in review.
          </p>

          <div className="planner-flow-subheader">
            <h3>Workouts</h3>
            <button
              className="planner-flow-action"
              type="button"
              onClick={addWorkout}
            >
              Add workout
            </button>
          </div>

          <ul
            className="planner-flow-card-list"
            aria-label="Configured workouts"
          >
            {draft.microcycle.workouts.map((workout) => {
              const workoutLabelId = `workout-label-${workout.workoutId}`;
              const workoutDayId = `workout-day-${workout.workoutId}`;
              const workoutTypeId = `workout-type-${workout.workoutId}`;
              const workoutIntensityId = `workout-intensity-${workout.workoutId}`;

              return (
                <li key={workout.workoutId}>
                  <div className="planner-flow-grid planner-flow-grid-two">
                    <label htmlFor={workoutLabelId}>
                      Workout label
                      <input
                        id={workoutLabelId}
                        className="planner-flow-input"
                        name={workoutLabelId}
                        value={workout.label}
                        onChange={(event) =>
                          updateWorkout(workout.workoutId, {
                            label: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label htmlFor={workoutDayId}>
                      Day
                      <select
                        id={workoutDayId}
                        className="planner-flow-select"
                        name={workoutDayId}
                        value={workout.day}
                        onChange={(event) =>
                          updateWorkout(workout.workoutId, {
                            day: event.target.value as WorkoutDay,
                          })
                        }
                      >
                        {weekDays.map((day) => (
                          <option key={day} value={day}>
                            {formatToken(day)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label htmlFor={workoutTypeId}>
                      Workout type
                      <select
                        id={workoutTypeId}
                        className="planner-flow-select"
                        name={workoutTypeId}
                        value={workout.type}
                        onChange={(event) =>
                          updateWorkout(workout.workoutId, {
                            type: event.target.value as WorkoutType,
                          })
                        }
                      >
                        <option value="strength">Strength</option>
                        <option value="endurance">Endurance</option>
                        <option value="recovery">Recovery</option>
                      </select>
                    </label>

                    <label htmlFor={workoutIntensityId}>
                      Intensity
                      <select
                        id={workoutIntensityId}
                        className="planner-flow-select"
                        name={workoutIntensityId}
                        value={workout.intensity}
                        onChange={(event) =>
                          updateWorkout(workout.workoutId, {
                            intensity: event.target.value as WorkoutIntensity,
                          })
                        }
                      >
                        <option value="easy">Easy</option>
                        <option value="moderate">Moderate</option>
                        <option value="hard">Hard</option>
                      </select>
                    </label>
                  </div>

                  <button
                    className="planner-flow-link"
                    type="button"
                    onClick={() => removeWorkout(workout.workoutId)}
                  >
                    Remove workout
                  </button>
                </li>
              );
            })}
          </ul>
        </article>
      ) : null}

      {currentStep === "review" ? (
        <article className="planner-flow-panel" aria-label="Review and publish">
          <h2>Review and publish</h2>
          <p className="planner-flow-helper">
            Advisory review highlights potential trade-offs. You can still
            continue and publish.
          </p>

          <div className="planner-review-grid">
            <section className="planner-review-card planner-review-muscle-card">
              <h3>Microcycle muscle map summary</h3>
              <p className="planner-review-muscle-total">
                Microcycle total usage:{" "}
                {reviewMuscleSummary.microcycleTotalUsage.toFixed(1)}
              </p>

              {reviewMuscleSummary.microcycleMap.length === 0 ? (
                <p className="planner-flow-empty">
                  No mapped muscles available for this microcycle yet.
                </p>
              ) : (
                <div
                  className="planner-review-muscle-map"
                  aria-label="Microcycle muscle map"
                >
                  <Body
                    data={reviewMuscleSummary.microcycleMap}
                    side="front"
                    colors={plannerReviewMapColors}
                    defaultFill="#f2ebe0"
                    defaultStroke="#d6c7af"
                    defaultStrokeWidth={0.6}
                    border="#d6c7af"
                    scale={1.02}
                  />
                  <Body
                    data={reviewMuscleSummary.microcycleMap}
                    side="back"
                    colors={plannerReviewMapColors}
                    defaultFill="#f2ebe0"
                    defaultStroke="#d6c7af"
                    defaultStrokeWidth={0.6}
                    border="#d6c7af"
                    scale={1.02}
                  />
                </div>
              )}

              {reviewMuscleSummary.microcycleLegend.length === 0 ? (
                <p className="planner-flow-empty">
                  Add workouts to generate top muscle emphasis.
                </p>
              ) : (
                <ul
                  className="planner-review-muscle-legend"
                  aria-label="Microcycle top muscles"
                >
                  {reviewMuscleSummary.microcycleLegend.map((entry) => (
                    <li key={`${entry.key}-${entry.value}`}>
                      <span>{entry.label}</span>
                      <strong>{entry.value.toFixed(1)}</strong>
                    </li>
                  ))}
                </ul>
              )}

              {reviewMuscleSummary.overlapWarnings.length > 0 ? (
                <section className="planner-review-overlap">
                  <p className="planner-review-overlap-title">
                    High-overlap days
                  </p>
                  <ul
                    className="planner-review-list"
                    aria-label="High-overlap day warnings"
                  >
                    {reviewMuscleSummary.overlapWarnings.map((warning) => (
                      <li key={warning.id}>
                        <p>{warning.title}</p>
                        <small>{warning.detail}</small>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <p className="planner-flow-empty">
                  No high-overlap days detected.
                </p>
              )}

              <nav
                className="planner-review-drilldown-links"
                aria-label="Microcycle drill-down links"
              >
                <a href="#planner-review-routines">Jump to routines</a>
                <a href="#planner-review-exercises">Jump to exercises</a>
              </nav>
            </section>

            <section className="planner-review-card">
              <h3>Advisory warnings</h3>
              {advisories.warnings.length === 0 ? (
                <p className="planner-flow-empty">No warnings detected.</p>
              ) : (
                <ul
                  className="planner-review-list"
                  aria-label="Advisory warnings"
                >
                  {advisories.warnings.map((warning) => (
                    <li key={warning.title}>
                      <p>{warning.title}</p>
                      <small>{warning.detail}</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="planner-review-card">
              <h3>Alternative suggestions</h3>
              {advisories.suggestions.length === 0 ? (
                <p className="planner-flow-empty">
                  No alternative suggestions generated.
                </p>
              ) : (
                <ul
                  className="planner-review-list"
                  aria-label="Alternative suggestions"
                >
                  {advisories.suggestions.map((suggestion) => (
                    <li key={suggestion.id}>
                      <p>{suggestion.title}</p>
                      <small>{suggestion.detail}</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="planner-review-card">
              <h3>Key events</h3>
              {draft.events.length === 0 ? (
                <p className="planner-flow-empty">No events configured.</p>
              ) : (
                <ul
                  className="planner-review-list"
                  aria-label="Configured events"
                >
                  {draft.events.map((event) => (
                    <li key={event.eventId}>
                      <p>{event.name}</p>
                      <small>
                        {event.eventDate || "No date"} ·{" "}
                        {formatToken(event.eventType)}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="planner-review-card">
              <h3>Mesocycle emphasis</h3>
              {strategyResults.length === 0 ? (
                <p className="planner-flow-empty">No mesocycles configured.</p>
              ) : (
                <ul
                  className="planner-review-list"
                  aria-label="Mesocycle emphasis"
                >
                  {strategyResults.map((result) => {
                    const mesocycle = draft.mesocycles.find(
                      (candidate) =>
                        candidate.mesocycleId === result.mesocycleId,
                    );
                    return (
                      <li key={result.mesocycleId}>
                        <p>{mesocycle?.name || "Unnamed mesocycle"}</p>
                        <small>
                          {result.emphasis.label} · Strength{" "}
                          {result.emphasis.strengthPercent}% · Endurance{" "}
                          {result.emphasis.endurancePercent}% · Recovery{" "}
                          {result.emphasis.recoveryPercent}%
                        </small>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="planner-review-card">
              <h3>Microcycle reflow preview</h3>
              {reflowProjection.rows.length === 0 ? (
                <p className="planner-flow-empty">
                  No reflow projection generated.
                </p>
              ) : (
                <ul
                  className="planner-review-list"
                  aria-label="Microcycle reflow preview"
                >
                  {reflowProjection.rows.slice(0, 12).map((row) => (
                    <li key={`${row.mesocycleId}-${row.globalWeek}`}>
                      <p>
                        Week {row.globalWeek}: {row.mesocycleName}
                      </p>
                      <small>
                        {formatToken(row.phase)} ·{" "}
                        {formatToken(row.primaryFocus)} focus ·{" "}
                        {row.targetLoadPercent}% load ·{" "}
                        {formatToken(row.intensityWave)} wave
                      </small>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              className="planner-review-card"
              id="planner-review-routines"
            >
              <h3>Routine contributions</h3>
              {reviewMuscleSummary.routineContributions.length === 0 ? (
                <p className="planner-flow-empty">
                  No routine contributions available.
                </p>
              ) : (
                <ul
                  className="planner-review-list"
                  aria-label="Routine contribution details"
                >
                  {reviewMuscleSummary.routineContributions.map((routine) => (
                    <li key={routine.routineId} id={routine.drilldownId}>
                      <p>{routine.routineName}</p>
                      <small>
                        {routine.dayLabel} · Total usage{" "}
                        {routine.totalUsage.toFixed(1)}
                      </small>
                      <small>
                        Top muscles:{" "}
                        {Object.entries(routine.muscleUsage)
                          .filter(([, value]) => value > 0)
                          .sort(
                            (left, right) =>
                              right[1] - left[1] ||
                              left[0].localeCompare(right[0]),
                          )
                          .slice(0, 2)
                          .map(([key]) => formatToken(key))
                          .join(", ")}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              className="planner-review-card"
              id="planner-review-exercises"
            >
              <h3>Exercise contributions</h3>
              {reviewMuscleSummary.exerciseContributions.length === 0 ? (
                <p className="planner-flow-empty">
                  No exercise contributions available.
                </p>
              ) : (
                <ul
                  className="planner-review-list"
                  aria-label="Exercise contribution details"
                >
                  {reviewMuscleSummary.exerciseContributions.map((exercise) => (
                    <li key={exercise.exerciseId} id={exercise.drilldownId}>
                      <p>{exercise.exerciseName}</p>
                      <small>
                        {exercise.dayLabel} · {exercise.routineName} · Total
                        usage {exercise.totalUsage.toFixed(1)}
                      </small>
                      <small>
                        <a href={exercise.routineDrilldownHref}>
                          Open routine context
                        </a>
                      </small>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="planner-review-summary">
            <h3>Draft summary</h3>
            <dl>
              <div>
                <dt>Plan</dt>
                <dd>{draft.planName || "Unnamed plan"}</dd>
              </div>
              <div>
                <dt>Goals</dt>
                <dd>{draft.goals.length}</dd>
              </div>
              <div>
                <dt>Mesocycles</dt>
                <dd>{draft.mesocycles.length}</dd>
              </div>
              <div>
                <dt>Events</dt>
                <dd>{draft.events.length}</dd>
              </div>
              <div>
                <dt>Workouts</dt>
                <dd>{draft.microcycle.workouts.length}</dd>
              </div>
              <div>
                <dt>Reflow rows</dt>
                <dd>{reflowProjection.rows.length}</dd>
              </div>
            </dl>
          </section>
        </article>
      ) : null}

      <footer className="planner-flow-actions">
        <div>
          {currentStepIndex > 0 ? (
            <button
              className="button button-secondary"
              type="button"
              onClick={goBack}
            >
              Back
            </button>
          ) : null}
        </div>

        <div className="planner-flow-actions-right">
          <button
            className="button button-secondary"
            type="button"
            onClick={onSaveDraft}
          >
            Save draft
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={onClearDraft}
          >
            Reset
          </button>

          {nextStepButtonLabel(currentStep) ? (
            <button
              className="button button-primary"
              type="button"
              onClick={goNext}
            >
              {nextStepButtonLabel(currentStep)}
            </button>
          ) : (
            <button
              className="button button-primary"
              type="button"
              onClick={publishCycle}
            >
              Publish cycle
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}
