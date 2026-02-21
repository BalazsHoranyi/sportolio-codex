# Domain Contexts and Event Contracts

This document is the backend authority for:

- bounded context boundaries,
- canonical entity ownership and lifecycle,
- versioned domain event contracts,
- compatibility rules for event evolution.

It is implemented by `backend/src/sportolo/domain/events/contracts.py` and validated by `backend/tests/contract/test_domain_event_contracts.py`.

## Bounded Context Map

### Planning

Planning owns long-horizon intent and calendar structure.

Canonical entities:

- `GoalPriorityPlan`: ranked goals with active-goal selection and deterministic conflict metadata.
- `Macrocycle`: top-level training block bounded by planning horizon dates.
- `Mesocycle`: modality-focused sub-block in a macrocycle.
- `PlannedWorkout`: scheduled workout intent before execution.

Lifecycle focus:

- `GoalPriorityPlan`: created -> reprioritized -> active-goal switched.
- `Macrocycle`: drafted -> active -> superseded.
- `Mesocycle`: drafted -> active -> edited-forward.
- `PlannedWorkout`: scheduled -> moved -> completed or canceled.

### Routines

Routines owns workout structure authoring and reusable templates.

Canonical entities:

- `StrengthRoutineDefinition`: set/rep schemes and progression intent.
- `EnduranceRoutineDefinition`: interval/timeline intent.
- `RoutineTemplate`: reusable routine blueprint.

Lifecycle focus:

- `RoutineDefinition`: drafted -> validated -> published -> superseded.
- `RoutineTemplate`: created -> reused -> revised.

### Tracking

Tracking owns ground-truth session execution records.

Canonical entities:

- `SessionExecution`: runtime session state and completion outcome.
- `ExerciseSetLog`: per-set strength execution record.
- `IntervalLog`: endurance interval execution record.

Lifecycle focus:

- `SessionExecution`: started -> paused/resumed -> completed/partial/abandoned.
- `ExerciseSetLog` and `IntervalLog`: appended deterministically after execution steps.

### Fatigue

Fatigue owns deterministic 4-axis recomputation outputs.

Canonical entities:

- `DailyCheckIn`: system-capacity input (`sleep`, `fuel`, `stress`).
- `FatigueSnapshot`: per-date axis and combined-score output.
- `FatigueRecomputeAudit`: lineage record for recomputation trigger windows.

Lifecycle focus:

- `DailyCheckIn`: submitted -> corrected (retroactive) -> archived by lineage.
- `FatigueSnapshot`: computed -> superseded by recompute while preserving history.
- `FatigueRecomputeAudit`: emitted per recompute job and retained immutably.

### Analytics

Analytics owns derived, read-optimized aggregates.

Canonical entities:

- `AdherenceSummary`: on-track/over/undertraining metrics.
- `AxisTrendPoint`: chart-ready fatigue timeline points.

Lifecycle focus:

- Aggregates are regenerated deterministically from source-of-truth contexts and never treated as write-authoritative.

### Integrations

Integrations owns external account linkage and import normalization.

Canonical entities:

- `IntegrationAccountLink`: provider auth linkage metadata.
- `ExternalActivityImport`: normalized imported activity.
- `DedupResolution`: deterministic duplicate-merge record.

Lifecycle focus:

- `IntegrationAccountLink`: connected -> refreshed -> disconnected.
- `ExternalActivityImport`: received -> normalized -> deduplicated -> dispatched.
- `DedupResolution`: emitted once per conflict group and retained for audit.

### Coach-Collab

Coach-collab owns role-scoped collaboration artifacts.

Canonical entities:

- `CoachAthleteAssignment`: access control relationship.
- `PlanNote`: contextual collaboration note on plan/workout entities.
- `PrivacyPolicySelection`: athlete visibility rules.

Lifecycle focus:

- `CoachAthleteAssignment`: invited -> active -> revoked.
- `PlanNote`: created -> edited -> soft-deleted (history retained).
- `PrivacyPolicySelection`: set -> updated -> audited.

## Event Contract Catalog

Current versioned domain events:

- `workout.completed@1.0.0`
- `plan.workout.moved@1.0.0`
- `fatigue.recomputed@1.0.0`

Each event contract is an envelope with:

- `metadata`: identity, type, version, producer, timestamps, and correlation/causation links.
- `payload`: context-specific business data.

## Backward-Compatible Evolution Rules

These rules apply to all `1.x.y` versions:

- Never remove or rename required fields in metadata or payload.
- Never change field meaning for an existing field name.
- Never narrow an existing type (for example, `string` to enum subset) within the same major version.
- Additive optional fields are allowed.
- If a breaking change is required, publish a new major version and keep prior major contracts available for consumers during migration.

Compatibility is enforced by contract tests that compare the current generated JSON schema with baseline fixtures in `backend/tests/contract/fixtures/domain_events/`.

## Key Event Examples

### workout.completed@1.0.0

```json
{
  "metadata": {
    "event_id": "evt-workout-completed-0001",
    "event_type": "workout.completed",
    "event_version": "1.0.0",
    "occurred_at": "2026-02-21T12:10:00+00:00",
    "athlete_id": "athlete-1",
    "correlation_id": "corr-session-sync-1001",
    "causation_id": "cmd-session-finalize-1001",
    "producer": "tracking.session-state-machine"
  },
  "payload": {
    "session_id": "session-20260221-0001",
    "workout_id": "workout-20260221-0001",
    "completed_at": "2026-02-21T12:09:57+00:00",
    "modality": "hybrid",
    "completion_state": "completed",
    "source": "manual",
    "duration_seconds": 4310,
    "axis_load": {
      "neural": 6.7,
      "metabolic": 5.3,
      "mechanical": 7.2,
      "recruitment": 7.2
    },
    "idempotency_key": "idem-session-finalize-1001"
  }
}
```

### plan.workout.moved@1.0.0

```json
{
  "metadata": {
    "event_id": "evt-plan-workout-moved-0001",
    "event_type": "plan.workout.moved",
    "event_version": "1.0.0",
    "occurred_at": "2026-02-21T12:15:00+00:00",
    "athlete_id": "athlete-1",
    "correlation_id": "corr-plan-edit-1001",
    "causation_id": "cmd-calendar-drop-1001",
    "producer": "planning.calendar-service"
  },
  "payload": {
    "workout_id": "workout-20260223-threshold-bike",
    "from_date": "2026-02-23",
    "to_date": "2026-02-24",
    "reason": "user_drag_drop",
    "initiated_by_role": "athlete",
    "initiated_by_id": "athlete-1",
    "preserves_session_assignments": true
  }
}
```

### fatigue.recomputed@1.0.0

```json
{
  "metadata": {
    "event_id": "evt-fatigue-recomputed-0001",
    "event_type": "fatigue.recomputed",
    "event_version": "1.0.0",
    "occurred_at": "2026-02-21T12:20:00+00:00",
    "athlete_id": "athlete-1",
    "correlation_id": "corr-recompute-1001",
    "causation_id": "evt-workout-completed-0001",
    "producer": "fatigue.recompute-service"
  },
  "payload": {
    "recompute_id": "recompute-20260221-0001",
    "trigger": "session_completed",
    "as_of": "2026-02-21T12:20:00+00:00",
    "window_start": "2026-02-15",
    "window_end": "2026-02-21",
    "affected_dates": [
      "2026-02-20",
      "2026-02-21"
    ],
    "source_session_ids": [
      "session-20260221-0001"
    ],
    "model_policy_version": "v1-axis-decay",
    "deterministic_signature": "sig-1f92f10f936f"
  }
}
```
