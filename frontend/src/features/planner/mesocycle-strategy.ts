import type {
  MesocycleFocus,
  PlannerDraft,
  PlannerMesocycleDraft,
} from "./types";

export interface MesocycleEmphasis {
  strengthPercent: number;
  endurancePercent: number;
  recoveryPercent: number;
  label: string;
}

export interface MesocycleWeekProjection {
  week: number;
  phase: string;
  primaryFocus: MesocycleFocus;
  intensityWave: "low" | "moderate" | "high";
  targetLoadPercent: number;
}

export interface MesocycleStrategyResult {
  mesocycleId: string;
  periodization: PlannerMesocycleDraft["periodization"];
  validationErrors: string[];
  emphasis: MesocycleEmphasis;
  projectedWeeks: MesocycleWeekProjection[];
}

export interface MicrocycleReflowProjectionRow {
  globalWeek: number;
  mesocycleId: string;
  mesocycleName: string;
  mesocycleWeek: number;
  phase: string;
  primaryFocus: MesocycleFocus;
  intensityWave: "low" | "moderate" | "high";
  targetLoadPercent: number;
}

export interface MicrocycleReflowProjection {
  rows: MicrocycleReflowProjectionRow[];
}

function asPositiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.floor(value);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

function baseEmphasis(
  focus: MesocycleFocus,
): Pick<MesocycleEmphasis, "strengthPercent" | "endurancePercent"> {
  if (focus === "strength") {
    return {
      strengthPercent: 65,
      endurancePercent: 25,
    };
  }

  if (focus === "endurance") {
    return {
      strengthPercent: 25,
      endurancePercent: 65,
    };
  }

  return {
    strengthPercent: 45,
    endurancePercent: 45,
  };
}

function formatEmphasisLabel(
  focus: MesocycleFocus,
  periodization: PlannerMesocycleDraft["periodization"],
): string {
  const focusLabel =
    focus === "hybrid"
      ? "Balanced hybrid"
      : `${focus.charAt(0).toUpperCase()}${focus.slice(1)}-led`;
  const periodizationLabel =
    periodization === "dup" ? "DUP" : periodization.toUpperCase();
  return `${focusLabel} ${periodizationLabel} mesocycle`;
}

function resolveBlockResult(
  mesocycle: PlannerMesocycleDraft,
  validationErrors: string[],
): Pick<MesocycleStrategyResult, "emphasis" | "projectedWeeks"> {
  const durationWeeks = asPositiveInteger(mesocycle.durationWeeks, 1);
  const accumulationWeeks = asPositiveInteger(
    mesocycle.strategy.block.accumulationWeeks,
    1,
  );
  const intensificationWeeks = asPositiveInteger(
    mesocycle.strategy.block.intensificationWeeks,
    1,
  );
  const deloadWeeks = mesocycle.strategy.block.includeDeloadWeek ? 1 : 0;
  const allocatedWeeks = accumulationWeeks + intensificationWeeks + deloadWeeks;

  if (allocatedWeeks > durationWeeks) {
    validationErrors.push("Block phase allocation exceeds mesocycle duration.");
  }

  const strengthPercent = clampPercent(mesocycle.strategy.block.strengthBias);
  const endurancePercent = clampPercent(mesocycle.strategy.block.enduranceBias);
  const recoveryPercent = 100 - strengthPercent - endurancePercent;

  if (recoveryPercent < 0) {
    validationErrors.push(
      "Block strength and endurance bias cannot exceed 100% combined.",
    );
  }

  const phases: string[] = [];
  for (let index = 0; index < accumulationWeeks; index += 1) {
    phases.push("accumulation");
  }
  for (let index = 0; index < intensificationWeeks; index += 1) {
    phases.push("intensification");
  }
  if (mesocycle.strategy.block.includeDeloadWeek) {
    phases.push("deload");
  }
  while (phases.length < durationWeeks) {
    phases.push("specificity");
  }

  const projectedWeeks: MesocycleWeekProjection[] = phases
    .slice(0, durationWeeks)
    .map((phase, index) => ({
      week: index + 1,
      phase,
      primaryFocus: mesocycle.focus,
      intensityWave:
        phase === "deload"
          ? "low"
          : phase === "intensification"
            ? "high"
            : "moderate",
      targetLoadPercent:
        phase === "deload" ? 90 : phase === "intensification" ? 112 : 100,
    }));

  return {
    emphasis: {
      strengthPercent,
      endurancePercent,
      recoveryPercent: clampPercent(recoveryPercent),
      label: formatEmphasisLabel(mesocycle.focus, mesocycle.periodization),
    },
    projectedWeeks,
  };
}

function resolveDupIntensityWave(
  index: number,
  rotation: PlannerMesocycleDraft["strategy"]["dup"]["intensityRotation"],
): "low" | "moderate" | "high" {
  if (rotation === "alternating") {
    return index % 2 === 0 ? "high" : "moderate";
  }

  const sequence =
    rotation === "ascending"
      ? (["low", "moderate", "high"] as const)
      : (["high", "moderate", "low"] as const);

  return sequence[index % sequence.length];
}

function resolveDupResult(
  mesocycle: PlannerMesocycleDraft,
  validationErrors: string[],
): Pick<MesocycleStrategyResult, "emphasis" | "projectedWeeks"> {
  const durationWeeks = asPositiveInteger(mesocycle.durationWeeks, 1);
  const strengthSessions = Math.max(
    0,
    Math.floor(mesocycle.strategy.dup.strengthSessionsPerWeek),
  );
  const enduranceSessions = Math.max(
    0,
    Math.floor(mesocycle.strategy.dup.enduranceSessionsPerWeek),
  );
  const recoverySessions = Math.max(
    0,
    Math.floor(mesocycle.strategy.dup.recoverySessionsPerWeek),
  );

  const totalSessions = strengthSessions + enduranceSessions + recoverySessions;
  if (totalSessions === 0) {
    validationErrors.push(
      "DUP session allocation must include at least one weekly session.",
    );
  }

  const safeTotal = totalSessions === 0 ? 1 : totalSessions;

  const projectedWeeks: MesocycleWeekProjection[] = Array.from(
    { length: durationWeeks },
    (_, index) => ({
      week: index + 1,
      phase: "distribution",
      primaryFocus:
        mesocycle.focus === "hybrid"
          ? index % 2 === 0
            ? "strength"
            : "endurance"
          : mesocycle.focus,
      intensityWave: resolveDupIntensityWave(
        index,
        mesocycle.strategy.dup.intensityRotation,
      ),
      targetLoadPercent: 100 + index * 2,
    }),
  );

  return {
    emphasis: {
      strengthPercent: Math.round((strengthSessions / safeTotal) * 100),
      endurancePercent: Math.round((enduranceSessions / safeTotal) * 100),
      recoveryPercent: Math.round((recoverySessions / safeTotal) * 100),
      label: formatEmphasisLabel(mesocycle.focus, mesocycle.periodization),
    },
    projectedWeeks,
  };
}

function resolveLinearIntensityWave(
  week: number,
  startIntensity: PlannerMesocycleDraft["strategy"]["linear"]["startIntensity"],
): "low" | "moderate" | "high" {
  if (week === 1) {
    if (startIntensity === "easy") {
      return "low";
    }

    if (startIntensity === "hard") {
      return "high";
    }

    return "moderate";
  }

  if (week >= 5) {
    return "high";
  }

  return "moderate";
}

function resolveLinearResult(
  mesocycle: PlannerMesocycleDraft,
  validationErrors: string[],
): Pick<MesocycleStrategyResult, "emphasis" | "projectedWeeks"> {
  const durationWeeks = asPositiveInteger(mesocycle.durationWeeks, 1);
  const progressionPercent = Math.max(
    1,
    Math.floor(mesocycle.strategy.linear.weeklyProgressionPercent),
  );
  const peakWeek = Math.max(1, Math.floor(mesocycle.strategy.linear.peakWeek));

  if (peakWeek > durationWeeks) {
    validationErrors.push("Linear peak week cannot exceed mesocycle duration.");
  }

  const emphasisBase = baseEmphasis(mesocycle.focus);

  const projectedWeeks: MesocycleWeekProjection[] = Array.from(
    { length: durationWeeks },
    (_, index) => {
      const week = index + 1;
      return {
        week,
        phase:
          week === peakWeek ? "peak" : week < peakWeek ? "build" : "stabilize",
        primaryFocus: mesocycle.focus,
        intensityWave: resolveLinearIntensityWave(
          week,
          mesocycle.strategy.linear.startIntensity,
        ),
        targetLoadPercent: 100 + progressionPercent * index,
      };
    },
  );

  return {
    emphasis: {
      strengthPercent: emphasisBase.strengthPercent,
      endurancePercent: emphasisBase.endurancePercent,
      recoveryPercent:
        100 - emphasisBase.strengthPercent - emphasisBase.endurancePercent,
      label: formatEmphasisLabel(mesocycle.focus, mesocycle.periodization),
    },
    projectedWeeks,
  };
}

export function deriveMesocycleStrategy(
  mesocycle: PlannerMesocycleDraft,
): MesocycleStrategyResult {
  const validationErrors: string[] = [];

  if (!mesocycle.name.trim()) {
    validationErrors.push("Mesocycle name is required.");
  }

  if (
    !Number.isFinite(mesocycle.durationWeeks) ||
    mesocycle.durationWeeks <= 0
  ) {
    validationErrors.push("Duration must be at least one week.");
  }

  if (mesocycle.periodization === "block") {
    const blockResult = resolveBlockResult(mesocycle, validationErrors);
    return {
      mesocycleId: mesocycle.mesocycleId,
      periodization: mesocycle.periodization,
      validationErrors,
      emphasis: blockResult.emphasis,
      projectedWeeks: blockResult.projectedWeeks,
    };
  }

  if (mesocycle.periodization === "dup") {
    const dupResult = resolveDupResult(mesocycle, validationErrors);
    return {
      mesocycleId: mesocycle.mesocycleId,
      periodization: mesocycle.periodization,
      validationErrors,
      emphasis: dupResult.emphasis,
      projectedWeeks: dupResult.projectedWeeks,
    };
  }

  const linearResult = resolveLinearResult(mesocycle, validationErrors);
  return {
    mesocycleId: mesocycle.mesocycleId,
    periodization: mesocycle.periodization,
    validationErrors,
    emphasis: linearResult.emphasis,
    projectedWeeks: linearResult.projectedWeeks,
  };
}

export function deriveMesocycleStrategySet(
  mesocycles: PlannerMesocycleDraft[],
): MesocycleStrategyResult[] {
  return mesocycles.map((mesocycle) => deriveMesocycleStrategy(mesocycle));
}

export function buildMicrocycleReflowProjection(
  draft: PlannerDraft,
): MicrocycleReflowProjection {
  const rows: MicrocycleReflowProjectionRow[] = [];
  let globalWeek = 1;

  for (const mesocycle of draft.mesocycles) {
    const strategyResult = deriveMesocycleStrategy(mesocycle);
    for (const week of strategyResult.projectedWeeks) {
      rows.push({
        globalWeek,
        mesocycleId: mesocycle.mesocycleId,
        mesocycleName: mesocycle.name || "Unnamed mesocycle",
        mesocycleWeek: week.week,
        phase: week.phase,
        primaryFocus: week.primaryFocus,
        intensityWave: week.intensityWave,
        targetLoadPercent: week.targetLoadPercent,
      });
      globalWeek += 1;
    }
  }

  return { rows };
}
