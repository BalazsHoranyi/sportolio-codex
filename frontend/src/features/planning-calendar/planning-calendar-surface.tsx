"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
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
  applyPlanningMutation,
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

export function PlanningCalendarSurface({
  initialState,
  onMutation,
}: PlanningCalendarSurfaceProps) {
  const [planningState, setPlanningState] = useState<PlanningCalendarState>(
    initialState ?? createInitialPlanningCalendarState(),
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

  const removeDropZoneRef = useRef<HTMLDivElement | null>(null);
  const mutationCounterRef = useRef(0);
  const addedWorkoutCounterRef = useRef(0);
  const draggingWorkoutIdRef = useRef<string | null>(null);

  useEffect(() => {
    setKeyboardMoveTargets((previous) => {
      const next = { ...previous };
      let changed = false;

      for (const workout of planningState.workouts) {
        if (!next[workout.workoutId]) {
          next[workout.workoutId] = workout.date;
          changed = true;
        }
      }

      for (const workoutId of Object.keys(next)) {
        if (
          !planningState.workouts.some(
            (workout) => workout.workoutId === workoutId,
          )
        ) {
          delete next[workoutId];
          changed = true;
        }
      }

      return changed ? next : previous;
    });
  }, [planningState.workouts]);

  const workoutsById = useMemo(() => {
    const map = new Map<string, PlannedWorkout>();
    for (const workout of planningState.workouts) {
      map.set(workout.workoutId, workout);
    }

    return map;
  }, [planningState.workouts]);

  const calendarEvents = useMemo(
    () =>
      planningState.workouts.map((workout) => ({
        id: workout.workoutId,
        title: workout.title,
        start: workout.date,
        allDay: true,
        classNames: [
          `planning-event-${workout.workoutType}`,
          `planning-event-${workout.intensity}`,
        ],
      })),
    [planningState.workouts],
  );

  const commitMutation = useCallback(
    (mutation: Omit<PlanningMutationEvent, "mutationId">) => {
      mutationCounterRef.current += 1;
      const withId: PlanningMutationEvent = {
        ...mutation,
        mutationId: `mutation-${mutationCounterRef.current}`,
      };

      setPlanningState((previous) => applyPlanningMutation(previous, withId));
      onMutation?.(withId);
    },
    [onMutation],
  );

  const handleExternalDrop = useCallback(
    (args: {
      dateStr: string;
      draggedEl: { getAttribute: (attribute: string) => string | null };
    }) => {
      const templateId = args.draggedEl.getAttribute("data-template-id");
      if (!templateId) {
        return;
      }

      addedWorkoutCounterRef.current += 1;
      const mutation = createMutationFromTemplate({
        mutationId: "temporary",
        templateId,
        workoutId: `workout-added-${addedWorkoutCounterRef.current}`,
        toDate: args.dateStr,
        source: "drag_drop",
        occurredAt: nowIsoTimestamp(),
      });
      if (!mutation) {
        return;
      }

      const mutationWithoutId = {
        ...mutation,
      } as Omit<PlanningMutationEvent, "mutationId"> & {
        mutationId?: string;
      };
      delete mutationWithoutId.mutationId;
      commitMutation(mutationWithoutId);
    },
    [commitMutation],
  );

  const handleEventDrop = useCallback(
    (args: {
      event: { id: string; title: string; startStr: string };
      oldEvent: { startStr: string };
    }) => {
      const currentWorkout = workoutsById.get(args.event.id);
      if (!currentWorkout) {
        return;
      }

      commitMutation({
        type: "workout_moved",
        workoutId: currentWorkout.workoutId,
        title: currentWorkout.title,
        fromDate: args.oldEvent.startStr || currentWorkout.date,
        toDate: args.event.startStr || currentWorkout.date,
        source: "drag_drop",
        occurredAt: nowIsoTimestamp(),
      });
    },
    [commitMutation, workoutsById],
  );

  const handleEventDragStart = useCallback(
    (args: { event: { id: string } }) => {
      draggingWorkoutIdRef.current = args.event.id;
    },
    [],
  );

  const handleEventDragStop = useCallback(
    (args: { jsEvent: { clientX: number; clientY: number } }) => {
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

    const mutationWithoutId = {
      ...mutation,
    } as Omit<PlanningMutationEvent, "mutationId"> & {
      mutationId?: string;
    };
    delete mutationWithoutId.mutationId;
    commitMutation(mutationWithoutId);
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
      source: "keyboard",
      occurredAt: nowIsoTimestamp(),
    });
  }

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
          <ul className="planning-template-list">
            {workoutTemplateCatalog.map((template) => (
              <li key={template.templateId}>
                <button
                  className="planning-template-chip"
                  data-template-id={template.templateId}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer?.setData(
                      "text/plain",
                      template.templateId,
                    );
                  }}
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
                  planningWeekDateOptions[4],
                )
              }
            >
              Add recovery ride to{" "}
              {formatLongDateLabel(planningWeekDateOptions[4])}
            </button>
          </div>
        </aside>

        <div className="planning-calendar-main">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "timeGridWeek,dayGridMonth",
            }}
            editable
            eventStartEditable
            eventDurationEditable={false}
            droppable
            height="auto"
            events={calendarEvents}
            drop={handleExternalDrop}
            eventDrop={handleEventDrop}
            eventDragStart={handleEventDragStart}
            eventDragStop={handleEventDragStop}
          />

          <div
            ref={removeDropZoneRef}
            className="planning-remove-zone"
            aria-label="Workout remove zone"
          >
            Drop here to remove workout
          </div>
        </div>
      </div>

      <section
        className="planning-keyboard-schedule"
        aria-label="Scheduled workouts"
      >
        <h3>Keyboard controls for scheduled workouts</h3>
        <ul className="planning-scheduled-list">
          {planningState.workouts.map((workout) => (
            <li key={workout.workoutId}>
              <p>
                <strong>{workout.title}</strong> on{" "}
                {formatLongDateLabel(workout.date)}
              </p>
              <label>
                Move target day
                <select
                  value={keyboardMoveTargets[workout.workoutId] ?? workout.date}
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
                  onClick={() => removeWorkoutWithKeyboard(workout)}
                >
                  Remove {workout.title} from schedule
                </button>
              </div>
            </li>
          ))}
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
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
