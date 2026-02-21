import {
  createDefaultMesocycleStrategy,
  type MesocycleFocus,
  type PeriodizationType,
  type PlannerDraft,
  type PlannerEventDraft,
  type PlannerGoalDraft,
  type PlannerMesocycleDraft,
  type PlannerWorkoutDraft,
  type WorkoutIntensity,
  type WorkoutType,
} from "./types";

export type PlannerMacroTemplateId =
  | "powerlifting_5k"
  | "triathlon_strength"
  | "strength_cycling";

interface GoalBlueprint {
  title: string;
  metric: string;
  modality: PlannerGoalDraft["modality"];
  targetOffsetDays: number;
}

interface EventBlueprint {
  name: string;
  eventType: PlannerEventDraft["eventType"];
  eventOffsetDays: number;
}

interface MesocycleBlueprint {
  name: string;
  periodization: PeriodizationType;
  focus: MesocycleFocus;
  weight: number;
}

interface WorkoutBlueprint {
  day: PlannerWorkoutDraft["day"];
  label: string;
  type: WorkoutType;
  intensity: WorkoutIntensity;
}

export interface PlannerMacroTemplateDefinition {
  id: PlannerMacroTemplateId;
  label: string;
  shortDescription: string;
  defaultPlanName: string;
  leadWeeks: number;
  cooldownWeeks: number;
  minimumWeeks: number;
}

interface PlannerMacroTemplateConfig extends PlannerMacroTemplateDefinition {
  fallbackStartDate: string;
  goals: GoalBlueprint[];
  event: EventBlueprint;
  mesocycles: MesocycleBlueprint[];
  workouts: WorkoutBlueprint[];
}

export interface MacroTimelinePreviewOptions {
  leadWeeks?: number;
  cooldownWeeks?: number;
  fallbackStartDate?: string;
  minimumWeeks?: number;
}

export interface MacroTimelineBand {
  mesocycleId: string;
  name: string;
  startDate: string;
  endDate: string;
  durationWeeks: number;
}

export interface MacroTimelinePreview {
  suggestedStartDate: string;
  suggestedEndDate: string;
  totalWeeks: number;
  anchorSummary: {
    goalAnchors: number;
    eventAnchors: number;
    earliestAnchorDate: string | null;
    latestAnchorDate: string | null;
  };
  mesocycleBands: MacroTimelineBand[];
}

export interface ApplyMacroTemplateInput {
  draft: PlannerDraft;
  templateId: PlannerMacroTemplateId;
}

const defaultFallbackStartDate = "2026-01-05";

const macroTemplates: PlannerMacroTemplateConfig[] = [
  {
    id: "powerlifting_5k",
    label: "Powerlifting + 5k",
    shortDescription:
      "Peak deadlift/total while keeping enough run volume for a fast 5k test.",
    defaultPlanName: "Powerlifting + 5k Build",
    leadWeeks: 12,
    cooldownWeeks: 2,
    minimumWeeks: 16,
    fallbackStartDate: "2026-01-05",
    goals: [
      {
        title: "Deadlift peak",
        metric: "1RM deadlift",
        modality: "strength",
        targetOffsetDays: 112,
      },
      {
        title: "5k benchmark",
        metric: "Sub-22:00 5k",
        modality: "endurance",
        targetOffsetDays: 126,
      },
    ],
    event: {
      name: "Benchmark 5k",
      eventType: "race",
      eventOffsetDays: 126,
    },
    mesocycles: [
      {
        name: "Strength base + aerobic bridge",
        periodization: "block",
        focus: "hybrid",
        weight: 0.42,
      },
      {
        name: "Intensity and threshold",
        periodization: "dup",
        focus: "hybrid",
        weight: 0.33,
      },
      {
        name: "Taper and test",
        periodization: "linear",
        focus: "hybrid",
        weight: 0.25,
      },
    ],
    workouts: [
      {
        day: "monday",
        label: "Primary squat + posterior chain",
        type: "strength",
        intensity: "hard",
      },
      {
        day: "wednesday",
        label: "Threshold run intervals",
        type: "endurance",
        intensity: "hard",
      },
      {
        day: "friday",
        label: "Deadlift top set + volume backoff",
        type: "strength",
        intensity: "hard",
      },
      {
        day: "sunday",
        label: "Easy aerobic flush",
        type: "recovery",
        intensity: "easy",
      },
    ],
  },
  {
    id: "triathlon_strength",
    label: "Triathlon + Strength",
    shortDescription:
      "Sustain swim-bike-run specificity while preserving two meaningful strength touchpoints.",
    defaultPlanName: "Triathlon + Strength Build",
    leadWeeks: 14,
    cooldownWeeks: 2,
    minimumWeeks: 18,
    fallbackStartDate: "2026-02-02",
    goals: [
      {
        title: "Triathlon A race",
        metric: "Olympic-distance finish time",
        modality: "endurance",
        targetOffsetDays: 126,
      },
      {
        title: "Maintain lower-body strength",
        metric: "Back squat 3RM",
        modality: "strength",
        targetOffsetDays: 112,
      },
    ],
    event: {
      name: "A-priority triathlon",
      eventType: "race",
      eventOffsetDays: 126,
    },
    mesocycles: [
      {
        name: "Aerobic accumulation + strength base",
        periodization: "block",
        focus: "hybrid",
        weight: 0.4,
      },
      {
        name: "Specific race prep",
        periodization: "dup",
        focus: "endurance",
        weight: 0.35,
      },
      {
        name: "Race taper and maintain strength",
        periodization: "linear",
        focus: "hybrid",
        weight: 0.25,
      },
    ],
    workouts: [
      {
        day: "monday",
        label: "Upper-body strength maintenance",
        type: "strength",
        intensity: "moderate",
      },
      {
        day: "tuesday",
        label: "Bike threshold sets",
        type: "endurance",
        intensity: "hard",
      },
      {
        day: "thursday",
        label: "Swim technique + pace work",
        type: "endurance",
        intensity: "moderate",
      },
      {
        day: "saturday",
        label: "Long brick session",
        type: "endurance",
        intensity: "hard",
      },
    ],
  },
  {
    id: "strength_cycling",
    label: "Strength + Cycling",
    shortDescription:
      "Blend progressive barbell strength with structured cycling intervals and one recovery anchor.",
    defaultPlanName: "Strength + Cycling Build",
    leadWeeks: 12,
    cooldownWeeks: 2,
    minimumWeeks: 16,
    fallbackStartDate: "2026-01-12",
    goals: [
      {
        title: "Strength progression",
        metric: "Powerlifting total",
        modality: "strength",
        targetOffsetDays: 112,
      },
      {
        title: "Cycling threshold",
        metric: "20-minute power benchmark",
        modality: "endurance",
        targetOffsetDays: 119,
      },
    ],
    event: {
      name: "Cycling threshold test",
      eventType: "assessment",
      eventOffsetDays: 119,
    },
    mesocycles: [
      {
        name: "General strength and aerobic base",
        periodization: "block",
        focus: "hybrid",
        weight: 0.45,
      },
      {
        name: "Threshold build and force production",
        periodization: "dup",
        focus: "hybrid",
        weight: 0.35,
      },
      {
        name: "Consolidation and test",
        periodization: "linear",
        focus: "hybrid",
        weight: 0.2,
      },
    ],
    workouts: [
      {
        day: "monday",
        label: "Squat emphasis + accessories",
        type: "strength",
        intensity: "hard",
      },
      {
        day: "wednesday",
        label: "VO2 cycling intervals",
        type: "endurance",
        intensity: "hard",
      },
      {
        day: "friday",
        label: "Press + deadlift assistance",
        type: "strength",
        intensity: "moderate",
      },
      {
        day: "sunday",
        label: "Recovery spin",
        type: "recovery",
        intensity: "easy",
      },
    ],
  },
];

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseIsoDate(value: string): Date | null {
  if (!isIsoDate(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatIsoDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number): string {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return value;
  }

  parsed.setUTCDate(parsed.getUTCDate() + days);
  return formatIsoDate(parsed);
}

function diffDaysInclusive(left: string, right: string): number {
  const leftDate = parseIsoDate(left);
  const rightDate = parseIsoDate(right);
  if (!leftDate || !rightDate) {
    return 0;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(
    1,
    Math.floor((rightDate.getTime() - leftDate.getTime()) / msPerDay) + 1,
  );
}

function sortIsoDates(dates: string[]): string[] {
  return [...dates].sort((left, right) => left.localeCompare(right));
}

function isMeaningfulGoal(goal: PlannerGoalDraft): boolean {
  return (
    goal.title.trim().length > 0 ||
    goal.metric.trim().length > 0 ||
    isIsoDate(goal.targetDate)
  );
}

function isMeaningfulEvent(event: PlannerEventDraft): boolean {
  return event.name.trim().length > 0 || isIsoDate(event.eventDate);
}

function normalizeGoalPriorities(
  goals: PlannerGoalDraft[],
): PlannerGoalDraft[] {
  const byPriority = [...goals].sort(
    (left, right) => left.priority - right.priority,
  );

  return byPriority.map((goal, index) => ({
    ...goal,
    priority: index + 1,
  }));
}

function toGoalAnchorDates(goals: PlannerGoalDraft[]): string[] {
  return goals
    .map((goal) => goal.targetDate)
    .filter((candidate): candidate is string => isIsoDate(candidate));
}

function toEventAnchorDates(events: PlannerEventDraft[]): string[] {
  return events
    .map((event) => event.eventDate)
    .filter((candidate): candidate is string => isIsoDate(candidate));
}

function allocateDurations(totalWeeks: number, weights: number[]): number[] {
  const safeTotalWeeks = Math.max(1, Math.floor(totalWeeks));
  if (weights.length === 0) {
    return [safeTotalWeeks];
  }

  const safeWeights = weights.map((weight) =>
    Number.isFinite(weight) && weight > 0 ? weight : 1,
  );
  const weightSum = safeWeights.reduce((sum, weight) => sum + weight, 0);

  const base = safeWeights.map((weight) =>
    Math.max(1, Math.floor((safeTotalWeeks * weight) / weightSum)),
  );
  const fractions = safeWeights.map((weight, index) => ({
    index,
    fraction: (safeTotalWeeks * weight) / weightSum - base[index],
  }));

  let allocated = base.reduce((sum, weeks) => sum + weeks, 0);
  while (allocated < safeTotalWeeks) {
    const candidate = [...fractions].sort((left, right) => {
      if (right.fraction !== left.fraction) {
        return right.fraction - left.fraction;
      }

      return left.index - right.index;
    })[0];
    base[candidate.index] += 1;
    allocated += 1;
  }

  while (allocated > safeTotalWeeks) {
    const candidate = base
      .map((value, index) => ({ value, index }))
      .filter((entry) => entry.value > 1)
      .sort((left, right) => right.value - left.value)[0];

    if (!candidate) {
      break;
    }

    base[candidate.index] -= 1;
    allocated -= 1;
  }

  return base;
}

function focusBias(focus: MesocycleFocus): {
  strength: number;
  endurance: number;
} {
  if (focus === "strength") {
    return { strength: 70, endurance: 20 };
  }

  if (focus === "endurance") {
    return { strength: 25, endurance: 65 };
  }

  return { strength: 50, endurance: 40 };
}

function buildMesocycleDrafts(
  template: PlannerMacroTemplateConfig,
  totalWeeks: number,
): PlannerMesocycleDraft[] {
  const durations = allocateDurations(
    totalWeeks,
    template.mesocycles.map((mesocycle) => mesocycle.weight),
  );

  return template.mesocycles.map((mesocycle, index) => {
    const durationWeeks = durations[index] ?? 1;
    const strategy = createDefaultMesocycleStrategy(durationWeeks);
    const bias = focusBias(mesocycle.focus);

    return {
      mesocycleId: `mesocycle-${index + 1}`,
      name: mesocycle.name,
      periodization: mesocycle.periodization,
      focus: mesocycle.focus,
      durationWeeks,
      strategy: {
        ...strategy,
        block: {
          ...strategy.block,
          strengthBias: bias.strength,
          enduranceBias: bias.endurance,
        },
      },
    };
  });
}

function buildWorkoutDrafts(
  template: PlannerMacroTemplateConfig,
): PlannerWorkoutDraft[] {
  return template.workouts.map((workout, index) => ({
    workoutId: `workout-${index + 1}`,
    day: workout.day,
    label: workout.label,
    type: workout.type,
    intensity: workout.intensity,
  }));
}

function resolveTemplateById(
  templateId: PlannerMacroTemplateId,
): PlannerMacroTemplateConfig {
  const resolved = macroTemplates.find(
    (template) => template.id === templateId,
  );
  if (!resolved) {
    return macroTemplates[0];
  }

  return resolved;
}

function buildTemplateSeedGoals(
  template: PlannerMacroTemplateConfig,
): PlannerGoalDraft[] {
  return template.goals.map((goal, index) => ({
    goalId: `goal-${index + 1}`,
    title: goal.title,
    metric: goal.metric,
    targetDate: addDays(template.fallbackStartDate, goal.targetOffsetDays),
    modality: goal.modality,
    priority: index + 1,
  }));
}

function buildTemplateSeedEvents(
  template: PlannerMacroTemplateConfig,
): PlannerEventDraft[] {
  return [
    {
      eventId: "event-1",
      name: template.event.name,
      eventDate: addDays(
        template.fallbackStartDate,
        template.event.eventOffsetDays,
      ),
      eventType: template.event.eventType,
    },
  ];
}

export function getMacroTemplates(): PlannerMacroTemplateDefinition[] {
  return macroTemplates.map((template) => ({
    id: template.id,
    label: template.label,
    shortDescription: template.shortDescription,
    defaultPlanName: template.defaultPlanName,
    leadWeeks: template.leadWeeks,
    cooldownWeeks: template.cooldownWeeks,
    minimumWeeks: template.minimumWeeks,
  }));
}

export function buildMacroTimelinePreview(
  draft: PlannerDraft,
  options: MacroTimelinePreviewOptions = {},
): MacroTimelinePreview {
  const leadWeeks = Math.max(1, options.leadWeeks ?? 12);
  const cooldownWeeks = Math.max(0, options.cooldownWeeks ?? 2);
  const fallbackStartDate = isIsoDate(options.fallbackStartDate ?? "")
    ? (options.fallbackStartDate as string)
    : defaultFallbackStartDate;
  const minimumWeeks = Math.max(1, options.minimumWeeks ?? 16);

  const goalAnchorDates = toGoalAnchorDates(draft.goals);
  const eventAnchorDates = toEventAnchorDates(draft.events);
  const allAnchorDates = sortIsoDates([
    ...goalAnchorDates,
    ...eventAnchorDates,
  ]);

  const earliestAnchorDate = allAnchorDates[0] ?? null;
  const latestAnchorDate = allAnchorDates[allAnchorDates.length - 1] ?? null;

  const suggestedStartDate = earliestAnchorDate
    ? addDays(earliestAnchorDate, -(leadWeeks * 7))
    : fallbackStartDate;

  const seededSuggestedEndDate = latestAnchorDate
    ? addDays(latestAnchorDate, cooldownWeeks * 7)
    : addDays(suggestedStartDate, minimumWeeks * 7 - 1);

  const rawTotalWeeks = Math.ceil(
    diffDaysInclusive(suggestedStartDate, seededSuggestedEndDate) / 7,
  );
  const totalWeeks = Math.max(minimumWeeks, rawTotalWeeks);
  const suggestedEndDate =
    totalWeeks === rawTotalWeeks
      ? seededSuggestedEndDate
      : addDays(suggestedStartDate, totalWeeks * 7 - 1);

  let cursor = suggestedStartDate;
  const mesocycleBands: MacroTimelineBand[] = draft.mesocycles.map(
    (mesocycle) => {
      const durationWeeks = Math.max(1, mesocycle.durationWeeks);
      const endDate = addDays(cursor, durationWeeks * 7 - 1);
      const band = {
        mesocycleId: mesocycle.mesocycleId,
        name: mesocycle.name || "Unnamed mesocycle",
        startDate: cursor,
        endDate,
        durationWeeks,
      };
      cursor = addDays(endDate, 1);
      return band;
    },
  );

  return {
    suggestedStartDate,
    suggestedEndDate,
    totalWeeks,
    anchorSummary: {
      goalAnchors: goalAnchorDates.length,
      eventAnchors: eventAnchorDates.length,
      earliestAnchorDate,
      latestAnchorDate,
    },
    mesocycleBands,
  };
}

export function applyMacroTemplate(
  input: ApplyMacroTemplateInput,
): PlannerDraft {
  const template = resolveTemplateById(input.templateId);

  const existingGoals = input.draft.goals.filter(isMeaningfulGoal);
  const existingEvents = input.draft.events.filter(isMeaningfulEvent);

  const seededGoals =
    existingGoals.length > 0 ? existingGoals : buildTemplateSeedGoals(template);
  const seededEvents =
    existingEvents.length > 0
      ? existingEvents
      : buildTemplateSeedEvents(template);

  const normalizedGoals = normalizeGoalPriorities(
    seededGoals.map((goal, index) => ({
      ...goal,
      goalId: `goal-${index + 1}`,
    })),
  );
  const normalizedEvents = seededEvents.map((event, index) => ({
    ...event,
    eventId: `event-${index + 1}`,
  }));

  const provisionalDraft: PlannerDraft = {
    ...input.draft,
    planName: template.defaultPlanName,
    goals: normalizedGoals,
    events: normalizedEvents,
  };

  const timeline = buildMacroTimelinePreview(provisionalDraft, {
    leadWeeks: template.leadWeeks,
    cooldownWeeks: template.cooldownWeeks,
    fallbackStartDate: template.fallbackStartDate,
    minimumWeeks: template.minimumWeeks,
  });

  const mesocycles = buildMesocycleDrafts(template, timeline.totalWeeks);

  return {
    ...input.draft,
    planName: template.defaultPlanName,
    startDate: timeline.suggestedStartDate,
    endDate: timeline.suggestedEndDate,
    goals: normalizedGoals,
    events: normalizedEvents,
    mesocycles,
    microcycle: {
      workouts: buildWorkoutDrafts(template),
    },
  };
}
