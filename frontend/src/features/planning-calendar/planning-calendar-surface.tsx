"use client";

import FullCalendar from "@fullcalendar/react";
import type { EventDropArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { Draggable } from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { planningWeekDateOptions, workoutTemplateCatalog } from "./sample-data";
import {
  applyPlanningMutationWithOutcome,
  createInitialPlanningCalendarState,
  createMutationFromTemplate,
} from "./mutations";
import type {
  PlannedWorkout,
  PlanningCalendarState,
  PlanningMutationEvent,
} from "./types";

interface PlanningCalendarSurfaceProps {
  initialState?: PlanningCalendarState;
  onMutation?: (mutation: PlanningMutationEvent) => void;
}

interface ExternalEventReceiveArg {
  event: {
    startStr: string;
    extendedProps: Record<string, unknown>;
    remove: () => void;
  };
}

interface CalendarEventDragStartArg {
  event: {
    id: string;
  };
}

interface CalendarEventDragStopArg {
  jsEvent: {
    clientX: number;
    clientY: number;
  };
}

function formatLongDateLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function isPointInRect(
  rect: DOMRect,
  clientX: number,
  clientY: number,
): boolean {
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

function nowIsoTimestamp(): string {
  return new Date().toISOString();
}

function isCompactCalendarViewport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.innerWidth <= 768;
}

function normalizeCalendarDate(value: string): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const asDate = new Date(value);
  if (Number.isNaN(asDate.valueOf())) {
    return undefined;
  }

  return asDate.toISOString().slice(0, 10);
}

function sortForDisplay(workouts: PlannedWorkout[]): PlannedWorkout[] {
  return [...workouts].sort((left, right) => {
    if (left.date !== right.date) {
      return left.date.localeCompare(right.date);
    }

    if (left.sessionOrder !== right.sessionOrder) {
      return left.sessionOrder - right.sessionOrder;
    }

    return left.title.localeCompare(right.title);
  });
}

type PendingMutation = Omit<PlanningMutationEvent, "mutationId">;

function toPendingMutation(mutation: PlanningMutationEvent): PendingMutation {
  const next: Partial<PlanningMutationEvent> = { ...mutation };
  delete next.mutationId;
  return next as PendingMutation;
}

export function PlanningCalendarSurface({
  initialState,
  onMutation,
}: PlanningCalendarSurfaceProps) {
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(() =>
    isCompactCalendarViewport(),
  );
  const [planningState, setPlanningState] = useState<PlanningCalendarState>(
    initialState ?? createInitialPlanningCalendarState(),
  );
  const [pendingOverrideMutation, setPendingOverrideMutation] =
    useState<PendingMutation | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const [keyboardMoveTargets, setKeyboardMoveTargets] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      (initialState ?? createInitialPlanningCalendarState()).workouts.map(
        (workout) => [workout.workoutId, workout.date],
      ),
    ),
  );

  const planningStateRef = useRef(planningState);
  const removeDropZoneRef = useRef<HTMLDivElement | null>(null);
  const templatePaletteRef = useRef<HTMLUListElement | null>(null);
  const mutationCounterRef = useRef(0);
  const addedWorkoutCounterRef = useRef(0);
  const draggingWorkoutIdRef = useRef<string | null>(null);

  useEffect(() => {
    planningStateRef.current = planningState;
  }, [planningState]);

  useEffect(() => {
    const onResize = () => {
      setIsCompactViewport(isCompactCalendarViewport());
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    setKeyboardMoveTargets((previous) => {
      const next = Object.fromEntries(
        planningState.workouts.map((workout) => [
          workout.workoutId,
          workout.date,
        ]),
      );

      const hasDifferentSize =
        Object.keys(previous).length !== planningState.workouts.length;
      if (hasDifferentSize) {
        return next;
      }

      const hasAnyDiff = planningState.workouts.some(
        (workout) => previous[workout.workoutId] !== workout.date,
      );
      return hasAnyDiff ? next : previous;
    });
  }, [planningState.workouts]);

  useEffect(() => {
    const templatePalette = templatePaletteRef.current;
    if (!templatePalette) {
      return;
    }

    const draggable = new Draggable(templatePalette, {
      itemSelector: ".planning-template-chip",
      eventData: (eventEl) => {
        const templateId = eventEl.getAttribute("data-template-id");
        const template = workoutTemplateCatalog.find(
          (entry) => entry.templateId === templateId,
        );
        if (!templateId || !template) {
          return {
            title: "",
            create: false,
          };
        }

        return {
          title: template.title,
          allDay: true,
          duration: { days: 1 },
          extendedProps: {
            templateId,
          },
        };
      },
    });

    return () => {
      draggable.destroy();
    };
  }, []);

  const workoutsById = useMemo(() => {
    const map = new Map<string, PlannedWorkout>();
    for (const workout of planningState.workouts) {
      map.set(workout.workoutId, workout);
    }

    return map;
  }, [planningState.workouts]);

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, PlannedWorkout[]>();
    for (const workout of planningState.workouts) {
      const existing = map.get(workout.date) ?? [];
      map.set(workout.date, [...existing, workout]);
    }

    for (const [date, workouts] of map.entries()) {
      map.set(date, sortForDisplay(workouts));
    }

    return map;
  }, [planningState.workouts]);

  const calendarEvents = useMemo(
    () =>
      sortForDisplay(planningState.workouts).map((workout) => {
        const sameDayCount = workoutsByDate.get(workout.date)?.length ?? 1;
        const titlePrefix = sameDayCount > 1 ? `${workout.sessionOrder}. ` : "";
        return {
          id: workout.workoutId,
          title: `${titlePrefix}${workout.title}`,
          start: workout.date,
          allDay: true,
          classNames: [
            `planning-event-${workout.workoutType}`,
            `planning-event-${workout.intensity}`,
          ],
        };
      }),
    [planningState.workouts, workoutsByDate],
  );

  const commitMutation = useCallback(
    (mutation: PendingMutation) => {
      mutationCounterRef.current += 1;
      const withId: PlanningMutationEvent = {
        ...mutation,
        mutationId: `mutation-${mutationCounterRef.current}`,
      };

      const outcome = applyPlanningMutationWithOutcome(
        planningStateRef.current,
        withId,
      );
      planningStateRef.current = outcome.state;
      setPlanningState(outcome.state);

      if (outcome.applied && outcome.appliedMutation) {
        setValidationMessage(null);
        setPendingOverrideMutation(null);
        onMutation?.(outcome.appliedMutation);
      } else if (outcome.requiresOverride && outcome.pendingMutation) {
        setPendingOverrideMutation(toPendingMutation(outcome.pendingMutation));
        setValidationMessage(outcome.rejectionReason ?? "Change blocked.");
      } else if (outcome.rejectionReason) {
        setValidationMessage(outcome.rejectionReason);
      }

      return outcome;
    },
    [onMutation],
  );

  const handleExternalEventReceive = useCallback(
    (args: ExternalEventReceiveArg) => {
      const templateId =
        typeof args.event.extendedProps.templateId === "string"
          ? args.event.extendedProps.templateId
          : undefined;
      const toDate = normalizeCalendarDate(args.event.startStr);
      if (!templateId || !toDate) {
        args.event.remove();
        return;
      }

      addedWorkoutCounterRef.current += 1;
      const mutation = createMutationFromTemplate({
        mutationId: "temporary",
        templateId,
        workoutId: `workout-added-${addedWorkoutCounterRef.current}`,
        toDate,
        source: "drag_drop",
        occurredAt: nowIsoTimestamp(),
      });
      if (!mutation) {
        args.event.remove();
        return;
      }

      commitMutation(toPendingMutation(mutation));
      args.event.remove();
    },
    [commitMutation],
  );

  const handleEventDrop = useCallback(
    (args: EventDropArg) => {
      const currentWorkout = workoutsById.get(args.event.id);
      if (!currentWorkout) {
        return;
      }

      const outcome = commitMutation({
        type: "workout_moved",
        workoutId: currentWorkout.workoutId,
        title: currentWorkout.title,
        fromDate: args.oldEvent.startStr || currentWorkout.date,
        toDate: args.event.startStr || currentWorkout.date,
        fromOrder: currentWorkout.sessionOrder,
        workoutType: currentWorkout.workoutType,
        intensity: currentWorkout.intensity,
        source: "drag_drop",
        occurredAt: nowIsoTimestamp(),
      });

      if (!outcome.applied) {
        if (typeof args.revert === "function") {
          args.revert();
        }
      }
    },
    [commitMutation, workoutsById],
  );

  const handleEventDragStart = useCallback(
    (args: CalendarEventDragStartArg) => {
      draggingWorkoutIdRef.current = args.event.id;
    },
    [],
  );

  const handleEventDragStop = useCallback(
    (args: CalendarEventDragStopArg) => {
      const dragWorkoutId = draggingWorkoutIdRef.current;
      draggingWorkoutIdRef.current = null;
      if (!dragWorkoutId) {
        return;
      }

      const removeDropZone = removeDropZoneRef.current;
      if (!removeDropZone) {
        return;
      }

      const { clientX, clientY } = args.jsEvent;
      const rect = removeDropZone.getBoundingClientRect();
      if (!isPointInRect(rect, clientX, clientY)) {
        return;
      }

      const workout = workoutsById.get(dragWorkoutId);
      if (!workout) {
        return;
      }

      commitMutation({
        type: "workout_removed",
        workoutId: workout.workoutId,
        title: workout.title,
        fromDate: workout.date,
        fromOrder: workout.sessionOrder,
        workoutType: workout.workoutType,
        intensity: workout.intensity,
        source: "drag_drop",
        occurredAt: nowIsoTimestamp(),
      });
    },
    [commitMutation, workoutsById],
  );

  function addWorkoutWithKeyboard(templateId: string, toDate: string) {
    addedWorkoutCounterRef.current += 1;
    const mutation = createMutationFromTemplate({
      mutationId: "temporary",
      templateId,
      workoutId: `workout-added-${addedWorkoutCounterRef.current}`,
      toDate,
      source: "keyboard",
      occurredAt: nowIsoTimestamp(),
    });
    if (!mutation) {
      return;
    }

    commitMutation(toPendingMutation(mutation));
  }

  function moveWorkoutWithKeyboard(workout: PlannedWorkout) {
    const toDate = keyboardMoveTargets[workout.workoutId];
    if (!toDate || toDate === workout.date) {
      return;
    }

    commitMutation({
      type: "workout_moved",
      workoutId: workout.workoutId,
      title: workout.title,
      fromDate: workout.date,
      toDate,
      fromOrder: workout.sessionOrder,
      workoutType: workout.workoutType,
      intensity: workout.intensity,
      source: "keyboard",
      occurredAt: nowIsoTimestamp(),
    });
  }

  function reorderWorkoutWithKeyboard(workout: PlannedWorkout, offset: -1 | 1) {
    const sameDayWorkouts = workoutsByDate.get(workout.date) ?? [];
    const currentIndex = sameDayWorkouts.findIndex(
      (candidate) => candidate.workoutId === workout.workoutId,
    );
    if (currentIndex < 0) {
      return;
    }

    const targetWorkout = sameDayWorkouts[currentIndex + offset];
    if (!targetWorkout) {
      return;
    }

    commitMutation({
      type: "workout_reordered",
      workoutId: workout.workoutId,
      title: workout.title,
      fromDate: workout.date,
      toDate: workout.date,
      fromOrder: workout.sessionOrder,
      toOrder: targetWorkout.sessionOrder,
      workoutType: workout.workoutType,
      intensity: workout.intensity,
      source: "keyboard",
      occurredAt: nowIsoTimestamp(),
    });
  }

  function removeWorkoutWithKeyboard(workout: PlannedWorkout) {
    commitMutation({
      type: "workout_removed",
      workoutId: workout.workoutId,
      title: workout.title,
      fromDate: workout.date,
      fromOrder: workout.sessionOrder,
      workoutType: workout.workoutType,
      intensity: workout.intensity,
      source: "keyboard",
      occurredAt: nowIsoTimestamp(),
    });
  }

  function applyPendingOverride() {
    if (!pendingOverrideMutation) {
      return;
    }

    commitMutation({
      ...pendingOverrideMutation,
      allowOverlap: true,
      occurredAt: nowIsoTimestamp(),
    });
  }

  const keyboardAddTargetDate = planningWeekDateOptions[4];
  const keyboardAddLabel = `Add recovery ride to ${formatLongDateLabel(
    keyboardAddTargetDate,
  )}`;
  const defaultCalendarView = isCompactViewport
    ? "dayGridMonth"
    : "timeGridWeek";
  const sortedWorkouts = sortForDisplay(planningState.workouts);

  return (
    <section
      className="planning-calendar-shell"
      aria-labelledby="planning-calendar-title"
    >
      <header className="planning-calendar-head">
        <p className="eyebrow">Planner</p>
        <h2 id="planning-calendar-title">Planning calendar</h2>
        <p>
          Drag workouts to reschedule, drop templates to add sessions, and drag
          to remove when plans change.
        </p>
      </header>

      <div className="planning-calendar-grid">
        <aside
          className="planning-calendar-sidebar"
          aria-label="Workout palette"
        >
          <h3>Workout palette</h3>
          <p>Drag a template into the calendar to add a workout.</p>
          <ul ref={templatePaletteRef} className="planning-template-list">
            {workoutTemplateCatalog.map((template) => (
              <li key={template.templateId}>
                <button
                  className="planning-template-chip"
                  data-template-id={template.templateId}
                  type="button"
                >
                  {template.title}
                </button>
              </li>
            ))}
          </ul>

          <div className="planning-keyboard-actions">
            <h4>Keyboard add</h4>
            <button
              className="button button-secondary"
              type="button"
              onClick={() =>
                addWorkoutWithKeyboard(
                  "template-recovery-ride",
                  keyboardAddTargetDate,
                )
              }
            >
              {keyboardAddLabel}
            </button>
          </div>
        </aside>

        <div className="planning-calendar-main">
          <div
            ref={removeDropZoneRef}
            className="planning-remove-zone"
            aria-label="Workout remove zone"
          >
            Drop here to remove workout
          </div>

          <FullCalendar
            key={defaultCalendarView}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={defaultCalendarView}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: isCompactViewport
                ? "dayGridMonth,timeGridWeek"
                : "timeGridWeek,dayGridMonth",
            }}
            editable
            eventStartEditable
            eventDurationEditable={false}
            droppable
            height="auto"
            events={calendarEvents}
            eventReceive={handleExternalEventReceive}
            eventDrop={handleEventDrop}
            eventDragStart={handleEventDragStart}
            eventDragStop={handleEventDragStop}
          />
        </div>
      </div>

      {validationMessage ? (
        <section
          className="planning-validation-banner"
          role="status"
          aria-live="polite"
        >
          <p>{validationMessage}</p>
          <div className="planning-validation-actions">
            {pendingOverrideMutation ? (
              <button
                className="button button-secondary"
                type="button"
                onClick={applyPendingOverride}
              >
                Proceed anyway
              </button>
            ) : null}
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                setPendingOverrideMutation(null);
                setValidationMessage(null);
              }}
            >
              Dismiss
            </button>
          </div>
        </section>
      ) : null}

      <section
        className="planning-keyboard-schedule"
        aria-label="Scheduled workouts"
      >
        <h3>Keyboard controls for scheduled workouts</h3>
        <ul className="planning-scheduled-list">
          {sortedWorkouts.map((workout) => {
            const sameDayWorkouts = workoutsByDate.get(workout.date) ?? [];
            const currentIndex = sameDayWorkouts.findIndex(
              (candidate) => candidate.workoutId === workout.workoutId,
            );
            const hasEarlier = currentIndex > 0;
            const hasLater =
              currentIndex >= 0 && currentIndex < sameDayWorkouts.length - 1;

            return (
              <li key={workout.workoutId}>
                <p>
                  <strong>{workout.title}</strong> on{" "}
                  {formatLongDateLabel(workout.date)} (slot{" "}
                  {workout.sessionOrder})
                </p>
                <p className="planning-history-meta">
                  History entries:{" "}
                  {planningState.workoutHistory[workout.workoutId]?.length ?? 0}
                </p>
                <label>
                  Move target day
                  <select
                    value={
                      keyboardMoveTargets[workout.workoutId] ?? workout.date
                    }
                    onChange={(event) =>
                      setKeyboardMoveTargets((previous) => ({
                        ...previous,
                        [workout.workoutId]: event.target.value,
                      }))
                    }
                  >
                    {planningWeekDateOptions.map((date) => (
                      <option key={`${workout.workoutId}-${date}`} value={date}>
                        {formatLongDateLabel(date)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="planning-keyboard-row-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => moveWorkoutWithKeyboard(workout)}
                  >
                    Move {workout.title} to selected day
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={!hasEarlier}
                    onClick={() => reorderWorkoutWithKeyboard(workout, -1)}
                  >
                    Move {workout.title} earlier in day
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={!hasLater}
                    onClick={() => reorderWorkoutWithKeyboard(workout, 1)}
                  >
                    Move {workout.title} later in day
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => removeWorkoutWithKeyboard(workout)}
                  >
                    Remove {workout.title} from schedule
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        className="planning-mutation-log"
        aria-label="Calendar recompute events"
      >
        <h3>Calendar recompute events</h3>
        {planningState.mutationLog.length === 0 ? (
          <p>No recompute events emitted yet.</p>
        ) : (
          <ol>
            {planningState.mutationLog.map((mutation) => (
              <li key={mutation.mutationId}>
                <p>
                  <strong>{mutation.type}</strong> - {mutation.title}
                </p>
                <p>
                  Source: {mutation.source} | from {mutation.fromDate ?? "n/a"}{" "}
                  to {mutation.toDate ?? "n/a"}
                </p>
                <p>
                  Order: {mutation.fromOrder ?? "n/a"} to{" "}
                  {mutation.toOrder ?? "n/a"} | Override applied:{" "}
                  {mutation.overrideApplied ? "yes" : "no"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
