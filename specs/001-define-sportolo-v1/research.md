# Phase 0 Research: Deterministic Planning, Sync, DSL Guardrails, and IR Binding

## Research Dispatch Summary

- Find best practices for FastAPI + PostgreSQL + Alembic in contract-first systems.
- Find deterministic plan-versioning and forward-restore patterns.
- Find explicit workout session state-machine patterns.
- Find deterministic partial/abandoned fatigue attribution patterns.
- Find deterministic recomputation strategies for retroactive input edits.
- Find auditability patterns for recomputation event logging and immutable computed history.
- Find authoritative fatigue persistence model (on-demand compute vs persisted snapshots with invalidation).
- Find deterministic offline sync conflict-resolution patterns for same-workout concurrent edits.
- Find compile-time safety guardrails for DSL-to-IR pipelines (size/depth/timeout/loop bounds).
- Find canonical IR binding strategy for athlete baselines (early vs late binding).
- Find policy for LLM-assisted DSL translation safety and validation.
- Find responsive web composition patterns for Next.js + shadcn + selective Aceternity usage.
- Find deterministic progression-failure resolution strategy for autoreg top sets, AMRAP triggers, and wave progression tracks.
- Find deterministic integration import deduplication and ambiguity-resolution patterns.
- Find deterministic two-a-day time-gap handling patterns (warning-only vs intra-day decay).

## Decisions

### 1) Core API and storage stack

- **Decision**: FastAPI + SQLAlchemy + PostgreSQL with Alembic migrations.
- **Rationale**: Supports typed contracts, lineage-aware relational modeling, and explicit migration control.
- **Alternatives considered**: DRF (rejected), Flask minimal stack (rejected).

### 2) Contract-first integration

- **Decision**: OpenAPI remains the source of truth for backend/frontend interfaces.
- **Rationale**: Reduces drift and supports reliable contract testing.
- **Alternatives considered**: code-first docs later (rejected), GraphQL redesign (rejected).

### 3) Plan versioning semantics

- **Decision**: Structural edits create new versions and rebase only uncompleted future workouts from an effective date.
- **Rationale**: Preserves completed historical truth and deterministic replay.
- **Alternatives considered**: destructive overwrite replay (rejected), no versioning (rejected).

### 4) Snapshot and restore behavior

- **Decision**: User + system snapshots; restore always creates a new forward version.
- **Rationale**: Enables rollback intent without history mutation.
- **Alternatives considered**: destructive rollback (rejected), no snapshots (rejected).

### 5) Session state model

- **Decision**: `planned -> in_progress -> completed|partial|abandoned`.
- **Rationale**: Explicit lifecycle avoids ambiguity and supports deterministic fatigue behavior.
- **Alternatives considered**: no `partial` (rejected), extra `failed` state in v1 (rejected).

### 6) Session transition semantics

- **Decision**: `partial` only with explicit user end/save; `abandoned` from discard/timeout/app-exit without explicit end.
- **Rationale**: Intent-based transitions are deterministic and auditable.
- **Alternatives considered**: ratio-only transition logic (rejected), manual choice per exit (rejected).

### 7) Incomplete-session fatigue impact

- **Decision**: `partial` contributes deterministic proportional fatigue; `abandoned` contributes only when completed work >=20% (or modality-equivalent deterministic threshold).
- **Rationale**: Captures meaningful work while reducing noise from accidental starts.
- **Alternatives considered**: all-incomplete zero (rejected), fixed penalty (rejected).

### 8) Retroactive check-in recomputation scope

- **Decision**: Retroactive check-in edits trigger deterministic recomputation from edited date forward.
- **Rationale**: Corrects downstream trajectory with bounded compute scope.
- **Alternatives considered**: edited-day-only recompute (rejected), full-history recompute every time (rejected).

### 9) Historical computed snapshot handling

- **Decision**: Historical computed fatigue snapshots remain immutable; recomputation writes new versioned snapshots with lineage links.
- **Rationale**: Preserves reproducibility and auditability.
- **Alternatives considered**: in-place overwrite (rejected), partial lineage preservation (rejected).

### 10) Recalculation event logging

- **Decision**: Every retroactive recomputation emits mandatory immutable recalculation events.
- **Rationale**: Ensures traceability for athlete/coach/team workflows.
- **Alternatives considered**: optional logging (rejected), infer-only diff analysis (rejected).

### 11) Same-workout offline sync precedence

- **Decision**: Deterministic field-level policy:
  - state precedence `completed > partial > abandoned > in_progress > planned`,
  - completed execution data beats planned edits,
  - notes/comments resolve by latest server-receive write,
  - structural conflicts require explicit user resolution.
- **Rationale**: Protects training truth while minimizing conflict burden.
- **Alternatives considered**: global LWW (rejected), device-time precedence (rejected), all-manual resolution (rejected).

### 12) Equal-precedence execution tie-break

- **Decision**: Higher completed-work ratio wins; if tied, latest server-receive write wins.
- **Rationale**: Keeps the most complete deterministic execution record.
- **Alternatives considered**: timestamp-only tie-break (rejected), always manual resolve (rejected), first-write immutable (rejected).

### 13) DSL compile guardrail profile

- **Decision**: Balanced guardrails:
  - max source length: `50,000` chars,
  - max nesting depth: `16`,
  - max generated IR nodes: `20,000`,
  - max static loop iterations per compile: `10,000`,
  - compile target: `<=2s`, hard stop: `5s`.
- **Rationale**: Prevents runaway complexity and keeps deterministic compile reliability while supporting real-world hybrid programs.
- **Alternatives considered**: strict limits (rejected), permissive limits (rejected).

### 14) Guardrail violation behavior

- **Decision**: Any guardrail violation deterministically rejects compilation with machine-readable errors and no executable IR persistence.
- **Rationale**: Ensures safety and reproducibility without partial/ambiguous outputs.
- **Alternatives considered**: partial IR persistence (rejected), warnings-only behavior (rejected).

### 15) Canonical IR binding strategy

- **Decision**: Immutable canonical IR with late binding of athlete-dependent values at workout instance/execution time.
- **Rationale**: Keeps IR reusable and deterministic while allowing future unresolved workouts to reflect updated baselines (FTP/TM) without mutating historical execution truth.
- **Alternatives considered**: early binding at compile time (rejected stale prescriptions), forced auto-recompile on baseline change (rejected high churn and hidden plan mutation).

### 16) Resolved prescription persistence model

- **Decision**: Persist immutable execution-time resolved prescription snapshots containing source IR version, source baseline version, resolved intensities, and resolved progression values.
- **Rationale**: Enables deterministic replay/audit and protects historical outputs from later baseline changes.
- **Alternatives considered**: no persisted resolution (rejected weak auditability), mutable in-place resolution updates (rejected determinism risk).

### 17) LLM-assisted DSL safety policy

- **Decision**: LLM-assisted DSL outputs use the same deterministic parser, validator, IR pipeline, binding mode, and guardrails as direct user-authored DSL.
- **Rationale**: Removes privileged bypass paths and preserves determinism.
- **Alternatives considered**: privileged LLM compile path (rejected), relaxed limits for LLM outputs (rejected).

### 18) UI strategy and scope

- **Decision**: Off-the-shelf-first responsive web UI with shadcn primitives and selective Aceternity usage.
- **Rationale**: Faster delivery and lower maintenance risk with consistent UX.
- **Alternatives considered**: custom-first UI (rejected), Aceternity-only UI (rejected).

### 19) Aceternity Pro asset policy

- **Decision**: Download/import Pro assets by asking the user to download. 
- **Rationale**: Matches explicit instruction and minimizes churn.
- **Alternatives considered**: preload all assets (rejected).

### 20) Integration authority boundary

- **Decision**: External integrations remain ingest/export only; no external plan edit authority.
- **Rationale**: Preserves planning source-of-truth and deterministic behavior.
- **Alternatives considered**: bi-directional external editing (rejected).

### 21) Fatigue persistence authority model

- **Decision**: Persist immutable, versioned daily fatigue snapshots as the authoritative fatigue history/read model for Today and Calendar; recompute deterministically from the earliest invalidation date and append lineage-linked versions.
- **Rationale**: Preserves reproducibility and auditability while avoiding repeated full-history recomputation cost on every read.
- **Alternatives considered**: compute-on-demand from all sessions/check-ins for every read (rejected performance risk), mutable cache over event log with overwrite semantics (rejected weaker determinism and auditability).

### 22) Progression-failure handling model

- **Decision**: Hybrid progression-failure policy:
  - deterministic failure detection on prescribed-target miss or top-set RPE overshoot (>= +1 versus expected),
  - advisory-only by default,
  - optional template-defined auto-adjust policy (`repeat`, `regress`, `deload`) applied to the next uncompleted workout in the same progression track.
- **Rationale**: Preserves planner-first control while allowing deterministic, explicit automation when users configure it.
- **Alternatives considered**: always advisory only (rejected insufficient automation for template-driven workflows), always auto-adjust globally (rejected unexpected silent plan mutation risk).

### 23) Integration import deduplication model

- **Decision**: Deterministic hierarchical dedup for ingestion:
  - first match on exact `(provider, athlete, external_activity_id)` when available,
  - if unavailable, fallback match on `(start time +/-60s, duration +/-5%, same modality)`,
  - if fallback produces multiple candidates, mark import as `pending_dedup_resolution` and require explicit user selection before linking.
- **Rationale**: Minimizes false positives while keeping duplicate handling deterministic and auditable across provider data quality differences.
- **Alternatives considered**: external-ID only (rejected weak fallback coverage), time-based only (rejected higher false-match risk), auto-select first fallback candidate (rejected hidden data-linking errors).

### 24) Recruitment axis derivation policy

- **Decision**: Recruitment is strictly derived as `max(neural, mechanical)` and cannot be directly overridden by session classification.
- **Rationale**: Preserves a single deterministic source of truth for recruitment while still allowing classification to influence underlying contributor scores (neural/mechanical) indirectly.
- **Alternatives considered**: direct classification-to-recruitment override (rejected ambiguity and drift risk), hybrid override exceptions (rejected lower reproducibility and audit clarity).

### 25) Adherence over/undertraining flag policy

- **Decision**: Operationalize FR-063 with deterministic thresholds:
  - overtraining flag when `(rolling 7-day completed load >=115% of planned and any fatigue axis >=7.0 on >=2 days)` OR `(any fatigue axis >=7.0 for 3 consecutive days)`;
  - undertraining flag when `(rolling 14-day completed load <=75% of planned)` OR `(planned-session completion rate <70% over 14 days)`.
- **Rationale**: Makes SC-004 objectively testable, aligns training-risk flags with both workload and physiological strain signals, and avoids ambiguous subjective interpretation.
- **Alternatives considered**: load-only thresholds (rejected insufficient physiological context), adherence-only thresholds (rejected misses overload risk), coach-manual labeling (rejected non-deterministic and non-scalable).

### 26) Two-a-day time-gap fatigue policy

- **Decision**: In v1, `time-between` for two-a-days is warning-only context and does not trigger intra-day fatigue decay adjustments.
- **Rationale**: Aligns with current day-boundary/sleep-triggered decay model, keeps behavior deterministic and explainable, and avoids introducing mixed intra-day decay semantics that could destabilize reproducibility.
- **Alternatives considered**: full intra-day decay model (rejected complexity and calibration risk), bucketed intra-day decay adjustments (rejected additional ambiguity and test burden in v1).

### 27) Non-editable fatigue model surfaces

- **Decision**: Axis decay parameters and base fatigue weighting constants are system-owned, versioned policy values and are not user-editable in v1.
- **Rationale**: Prevents silent model drift, preserves reproducibility, and keeps fatigue explanations stable for athletes/coaches.
- **Alternatives considered**: user-editable advanced model controls (rejected determinism and support-risk concerns), coach-only edits (rejected cross-athlete consistency risk).

### 28) Deterministic seeding/no-randomness rule

- **Decision**: Fatigue scoring and progression resolution are pure deterministic functions of stored inputs plus fixed versioned model policies; no randomness or stochastic sampling is allowed.
- **Rationale**: Guarantees repeatable outcomes for identical inputs and directly supports SC-003 reproducibility and auditability requirements.
- **Alternatives considered**: randomized tie-breaking or stochastic progression nudges (rejected non-reproducible behavior), pseudorandom seeded behavior (rejected unnecessary complexity and interpretability cost in v1).

### 29) Hard data invariants for core records

- **Decision**:
  - completed sessions require completion timestamp, resolved prescription/IR lineage reference, and actual load data;
  - planned workouts must have an existing mesocycle parent.
- **Rationale**: Enforces minimum data integrity for deterministic replay, analytics validity, and lineage-safe planning operations.
- **Alternatives considered**: soft validation with nullable completion fields (rejected weak replay guarantees), deferred parent assignment for planned workouts (rejected orphan-record risk).

## Clarification Resolution Status

All technical context unknowns are resolved.
