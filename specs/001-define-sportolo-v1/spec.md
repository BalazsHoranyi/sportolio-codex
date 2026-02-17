# Feature Specification: Sportolo v1 Core Platform

**Feature Branch**: `[001-define-sportolo-v1]`  
**Created**: 2026-02-16  
**Status**: Draft  
**Input**: User description: "Complete v1 product and system specification for Sportoló, a hybrid strength and endurance planning and tracking platform built on a deterministic 4-axis fatigue model."

## Clarifications

### Session 2026-02-16

- Q: When structural edits are made after weeks are generated, should future workouts be rebased? -> A: Structural edits create a new version and regenerate only uncompleted future workouts from an effective date; completed workouts remain immutable.
- Q: What should happen when the macro goal changes mid-cycle? -> A: The system creates a new macrocycle version and reprioritizes/regenerates uncompleted future mesocycles/workouts from an effective date while preserving completed workouts and prior versions.
- Q: What snapshot capability should users have? -> A: Users can create snapshots at macrocycle and mesocycle levels; structural edits also create automatic snapshots.
- Q: What should revert/restore do? -> A: Restoring a snapshot creates a new forward version from that snapshot; completed sessions stay unchanged, and only uncompleted future plans regenerate from an effective date.
- Q: What should the explicit session lifecycle states be? -> A: Sessions use `planned -> in_progress -> completed|partial|abandoned` with deterministic transition rules.
- Q: How should partial-session fatigue be handled? -> A: `partial` sessions contribute deterministic proportional fatigue from completed work; `abandoned` contributes zero unless a deterministic minimum-work threshold is met.
- Q: What minimum-work threshold should qualify `abandoned` sessions for fatigue impact? -> A: `abandoned` sessions qualify only when completed work is at least 20% of prescribed work (or deterministic modality-equivalent threshold).
- Q: How should `partial` versus `abandoned` be decided? -> A: `partial` requires explicit user end/save before completion; `abandoned` is set by discard, timeout, or app-exit without explicit end.
- Q: How should retroactive daily check-in edits affect fatigue recomputation? -> A: Recompute deterministically from edited date forward, creating new computed records linked to prior versions.
- Q: How should historical computed fatigue snapshots be handled after recomputation? -> A: Preserve prior computed snapshots as immutable records and write new versioned snapshots with lineage links.
- Q: Should retroactive recomputation always produce an explicit log event? -> A: Yes. Every retroactive recomputation MUST create a recalc audit event with actor, reason, date range, and affected computed snapshot versions.
- Q: What conflict precedence should apply when the same workout is edited offline on multiple clients? -> A: Use deterministic field-level conflict policy: session state precedence (`completed` > `partial` > `abandoned` > `in_progress` > `planned`), completed execution data cannot be overwritten by planned edits, notes use latest server-receive write, and structural conflicts require user resolution.
- Q: How should execution-data conflicts be resolved when both records have equal lifecycle precedence? -> A: Use deterministic tie-break: higher completed-work proportion wins; if still tied, latest server-receive write wins.
- Q: What DSL/IR guardrail profile should v1 enforce for compilation safety? -> A: Balanced guardrails: max DSL source 50,000 chars, max nesting depth 16, max generated IR nodes 20,000, compile target <=2s with 5s hard stop, and only statically bounded loops with max 10,000 iterations total.
- Q: How should canonical IR bind athlete baselines (FTP/TM/etc.) and resolved intensities/progression values? -> A: Use late binding with immutable IR: compile IR as structural/symbolic intent, then resolve intensities/progression at workout instance/execution time using effective baseline version, and persist immutable resolved prescription snapshots for deterministic replay.

### Session 2026-02-17

- Q: What is the authoritative fatigue persistence model? -> A: Store immutable, versioned daily fatigue snapshots as authoritative history; serve reads from snapshots and trigger deterministic recomputation from the earliest invalidation date forward, appending lineage-linked versions.
- Q: How should progression failure handling work for autoreg top sets, AMRAP triggers, and waves? -> A: Hybrid policy: default advisory-only behavior on progression failure, with optional deterministic template-defined auto-adjust policies (`repeat`, `regress`, or `deload`) applied to the next uncompleted workout in the same progression track when enabled.
- Q: How should integration import deduplication be matched? -> A: Use hierarchical deterministic dedup: first exact `(provider, athlete, external_activity_id)`; if unavailable, fallback to `(start time within +/-60s, duration within +/-5%, same modality)`; if multiple candidates remain, mark ambiguous and require explicit user resolution.
- Q: How should recruitment axis definition handle classification interactions? -> A: Recruitment remains strictly derived as `max(neural, mechanical)`; session classification may only influence recruitment indirectly through neural/mechanical contributor scoring and must never directly override recruitment.
- Q: How are overtraining and undertraining flags operationally defined for adherence scoring? -> A: Overtraining is flagged when `(rolling 7-day completed load >=115% of planned and any fatigue axis >=7.0 on >=2 days)` or `(any fatigue axis >=7.0 for 3 consecutive days)`; undertraining is flagged when `(rolling 14-day completed load <=75% of planned)` or `(planned-session completion <70% over 14 days)`.
- Q: How is two-a-day time-between metadata applied to fatigue behavior in v1? -> A: No intra-day decay is applied in v1; time-between is used for warning heuristics and audit/explanation context only, while fatigue decay behavior remains governed by existing day-boundary/sleep-triggered rules.
- Q: What deterministic guardrails and data invariants apply to fatigue/progression configuration and core records? -> A: Users cannot override axis decay parameters or base fatigue weights; fatigue math and progression outcomes are pure deterministic functions of stored inputs with no randomness; completed sessions require completion timestamp, resolved prescription/IR lineage reference, and actual load data; planned workouts must always reference a mesocycle parent.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build a Hybrid Plan (Priority: P1)

As an athlete, I can create and manage a structured hybrid training plan from profile setup through macrocycle, mesocycle, and weekly workouts so I can train with confidence.

**Why this priority**: Plan creation is the core product value. Without it, logging and analytics have no baseline to evaluate.

**Independent Test**: Can be fully tested by creating an athlete profile, building a macrocycle with mesocycles and workouts, and confirming plan rules and warnings are enforced.

**UX State Acceptance**:

- Success: Athlete sees saved plan structure, generated workouts, and version/snapshot metadata reflecting the submitted change.
- Loading: Planner actions show deterministic loading state and block duplicate submissions until completion.
- Empty: If no macrocycle/mesocycle/workout exists, planner shows an explicit empty state with a primary call to create the first plan element.
- Error: Validation or compile errors show actionable messages with deterministic error codes and preserve unsaved input for correction.

**Acceptance Scenarios**:

1. **Given** an athlete with baseline strength and endurance data, **When** the athlete creates a macrocycle with goal, target date, and priority, **Then** the plan is saved with those anchors.
2. **Given** a mesocycle template with progression, deload, and test week rules, **When** it is applied to a timeline, **Then** weekly workouts are generated according to the intended structure philosophy.
3. **Given** a completed workout, **When** the athlete attempts to move it, **Then** the system blocks the move and keeps historical completion intact.
4. **Given** a planned workout, **When** the athlete moves it within the calendar, **Then** it remains planned and the weekly audit updates immediately.
5. **Given** a workout authored with unified DSL constructs for both strength and intervals, **When** the workout is compiled, **Then** it produces one deterministic canonical representation equivalent to the builder-defined intent.
6. **Given** a macro goal change mid-cycle with an effective date, **When** the athlete saves the change, **Then** a new plan version is created and only uncompleted future mesocycles/workouts are reprioritized/regenerated.
7. **Given** a user-created macrocycle or mesocycle snapshot, **When** the user confirms snapshot creation, **Then** the system stores a restorable immutable snapshot with audit metadata.
8. **Given** a selected snapshot restore action, **When** the user confirms restore with an effective date, **Then** the system creates a new forward version and regenerates only uncompleted future workouts while preserving completed history.
9. **Given** a DSL program that exceeds guardrails (source size, nesting depth, IR node count, loop bounds, or compile hard timeout), **When** compile is requested, **Then** compile fails deterministically with explicit validation errors and no executable IR output.
10. **Given** an LLM-assisted DSL translation output, **When** it is compiled, **Then** it is subject to the same deterministic parser, IR validation, and guardrail limits as direct user-authored DSL.
11. **Given** an athlete baseline change (for example FTP or training max) after IR compilation but before session execution, **When** an unresolved future workout is executed, **Then** intensity/progression values are resolved from the effective baseline version at execution and stored as an immutable resolved prescription snapshot.
12. **Given** a planned workout creation request without a mesocycle parent, **When** the request is validated, **Then** the system rejects it deterministically and no orphan planned workout is created.

---

### User Story 2 - Execute and Log Sessions Reliably (Priority: P1)

As an athlete, I can execute strength and endurance sessions, including mixed sessions and offline conditions, without losing data even when I modify a workout mid-session.

**Why this priority**: Logging friction is the primary churn risk. Reliable execution is required for users to continue using the platform.

**Independent Test**: Can be fully tested by running sample strength and endurance sessions (online and offline), editing session contents mid-workout, and confirming successful sync and valid results.

**UX State Acceptance**:

- Success: Athlete sees each logged event acknowledged and final session state (`completed`, `partial`, or `abandoned`) with resulting sync status.
- Loading: Session start/finalize/sync actions display a clear in-progress state and prevent conflicting duplicate actions.
- Empty: If no active session exists, execution surface shows an explicit empty state with actions to start or resume a workout.
- Error: Sync/conflict/finalize failures show clear recovery guidance (retry, resolve conflict, or edit invalid fields) without data loss.

**Acceptance Scenarios**:

1. **Given** a strength workout, **When** the athlete logs each set, **Then** each set can be recorded in at most two taps.
2. **Given** an endurance interval workout, **When** the athlete skips or extends an interval, **Then** the workout continues and the completed session remains valid.
3. **Given** no network connection, **When** the athlete logs a full session, **Then** all records are stored locally and synchronize later without data loss.
4. **Given** sensor dropout or autopause events, **When** the athlete continues the workout, **Then** session tracking recovers and the session can still be completed.
5. **Given** an in-progress session, **When** the athlete exits before planned completion, **Then** the session is saved as `partial` or `abandoned` according to deterministic state rules.
6. **Given** a `partial` session, **When** fatigue is recalculated, **Then** deterministic proportional fatigue is applied from completed work only.
7. **Given** an `abandoned` session, **When** completed work is below 20% of prescribed work, **Then** fatigue contribution is zero.
8. **Given** an in-progress session, **When** the athlete explicitly ends/saves before completion, **Then** state is `partial`; **when** the session is discarded, times out, or exits without explicit end, **Then** state is `abandoned`.
9. **Given** the same workout was edited offline on web and mobile, **When** both edits sync, **Then** deterministic field-level conflict resolution is applied (session state precedence, notes latest-write-by-server-receive-time, and user prompt for structural conflicts).
10. **Given** two conflicting execution edits with the same lifecycle precedence for one workout, **When** sync resolves them, **Then** the record with higher completed-work proportion wins; if proportions tie, latest server-receive write wins.
11. **Given** a strength progression workout using autoreg top set, AMRAP trigger, or wave progression, **When** the athlete misses the prescribed target or logs top-set RPE at least 1 point above expected, **Then** the system records a deterministic progression-failure outcome and either issues advisory guidance (default) or applies the template-defined deterministic auto-adjust rule to the next uncompleted workout in that progression track.
12. **Given** a session is marked `completed`, **When** required completion invariants are validated, **Then** completion is accepted only if completion timestamp, resolved prescription snapshot reference, and actual load data are present; otherwise the transition is rejected.

---

### User Story 3 - Understand Fatigue and Readiness (Priority: P2)

As an athlete, I can see explainable fatigue signals and plan risk warnings so I can decide whether to follow or adjust upcoming training.

**Why this priority**: The fatigue model is the differentiator, but it depends on completed logging and planned structure already being in place.

**Independent Test**: Can be fully tested by completing representative sessions, submitting check-ins, and verifying axis scores, thresholds, and explanation chips.

**UX State Acceptance**:

- Success: Today and Calendar views show current fatigue/readiness metrics, adherence flags, and explanation contributors from authoritative snapshots.
- Loading: Fatigue and audit views show loading placeholders while data is fetched or recomputation status is pending.
- Empty: If insufficient completed-session/check-in data exists, views show explicit empty states with instructions for required inputs.
- Error: Recompute/fetch failures display error state with retry option and last-known snapshot context where available.

**Acceptance Scenarios**:

1. **Given** completed sessions and daily check-in inputs, **When** the athlete opens Today after midnight rollover, **Then** neural, metabolic, mechanical, recruitment, combined score, and system capacity are shown.
2. **Given** missing sleep input for a day, **When** fatigue is computed, **Then** the system uses a normal sleep default.
3. **Given** a high-risk stacking pattern, **When** fatigue thresholds are exceeded, **Then** the athlete sees soft warnings and can still choose to proceed.
4. **Given** a fatigue score, **When** the athlete taps "Why this?", **Then** top contributing sessions are shown.
5. **Given** a retroactive daily check-in edit, **When** recomputation runs, **Then** fatigue outputs are recomputed deterministically from the edited date forward with version-linked lineage.
6. **Given** recomputed fatigue outputs after a retroactive edit, **When** historical values are queried, **Then** prior computed snapshots remain immutable and new versioned snapshots are available with lineage metadata.
7. **Given** a retroactive recomputation run, **When** audit history is viewed, **Then** a recalc event is present with actor, reason, recompute date range, and affected snapshot version references.
8. **Given** a session classification suggests high-threshold work while computed neural and mechanical remain moderate, **When** recruitment is calculated, **Then** recruitment stays strictly `max(neural, mechanical)` with no direct classification override.
9. **Given** a rolling adherence analytics window, **When** overtraining and undertraining are evaluated, **Then** flags are computed using deterministic threshold rules for 7-day/14-day load ratio, fatigue-axis threshold days, and 14-day planned-session completion rate.
10. **Given** two same-day workouts with a short time gap, **When** fatigue is evaluated before midnight rollover, **Then** no intra-day decay adjustment is applied from time-between; instead, the system uses time-between only for warning/explanation heuristics.

---

### User Story 4 - Coach and Team Oversight (Priority: P3)

As a coach or team admin, I can manage athlete plans and collaboration while respecting athlete privacy and preserving auditability.

**Why this priority**: Coaching and team workflows expand value and monetization after core athlete planning and execution are stable.

**Independent Test**: Can be fully tested by assigning roles, editing an athlete plan as coach, reviewing audit history, and verifying privacy controls.

**UX State Acceptance**:

- Success: Coach/team views show updated comments, privacy-filtered calendar data, and resolved integration dedup outcomes.
- Loading: Team calendars, coach comments, and import queues show deterministic loading states for each request.
- Empty: Team/coaching screens with no assigned athletes, comments, or pending imports show explicit empty states with next actions.
- Error: Permission or dedup-resolution failures show role-aware error messaging and preserve pending user choices.

**Acceptance Scenarios**:

1. **Given** a coach role, **When** the coach edits an athlete plan and comments, **Then** changes are saved and visible to the athlete.
2. **Given** team privacy settings, **When** another team member opens a shared calendar, **Then** only permitted athlete data is visible.
3. **Given** an external activity import, **When** the activity is ingested, **Then** completed data is added without altering planned workouts owned by Sportolo.
4. **Given** an imported activity candidate, **When** deduplication runs, **Then** the system matches first on `(provider, athlete, external_activity_id)`, then fallback `(start time within +/-60s, duration within +/-5%, same modality)` when ID is unavailable, and requires explicit user resolution for ambiguous multiple matches.

### Edge Cases

- A user moves multiple planned workouts into a single day that crosses fatigue red thresholds.
- A user performs two-a-days with too little time between sessions.
- A workout contains mixed segments where one segment is deleted mid-session.
- A user imports an external file that duplicates an already completed session.
- A user edits daily check-ins retroactively after several sessions are already completed.
- A user attempts to override fatigue output directly.
- A user attempts to override axis decay parameters or base fatigue weights.
- A user creates custom exercises that match global names but should remain user-scoped.
- A user pastes external-style builder syntax that is close to Liftosaur or Intervals.icu patterns but not fully valid in Sportolo DSL.
- A user edits a mesocycle template after multiple weeks were already generated.
- A user changes macro goal mid-cycle and expects completed history to remain intact.
- A user creates multiple snapshots and later restores an older one with pending future workouts already generated.
- A user restores an older snapshot after several newer versions already exist.
- A user exits a session mid-workout with some logged work but without explicit completion.
- A user abandons a session after minimal logged work and expects predictable fatigue treatment.
- A user records repeated progression failures across consecutive weeks and expects deterministic repeat/regress/deload handling per template policy.
- A session ends due to app crash/background kill after logged work but without explicit user end/save.
- A user edits a check-in from two weeks ago and expects current fatigue to reflect corrected history without losing reproducibility of prior computed records.
- A coach compares past and recomputed fatigue outputs and needs traceable lineage between versions.
- A retroactive recompute is triggered by a coach edit and both athlete and coach need a traceable audit record of the change.
- The same workout is edited offline on web and mobile and both clients reconnect with conflicting changes.
- Two clients both mark the same workout `completed` with different amounts of logged completed work before reconnect.
- An imported activity has no external ID and matches multiple prior sessions within fallback tolerance windows.
- A classification input implies high-threshold recruitment but computed neural/mechanical do not justify a recruitment increase.
- A DSL submission includes excessive nesting or loop bounds that would exceed deterministic compile safety limits.
- A DSL compile exceeds hard timeout due to pathological input and must fail predictably without partial IR.
- An athlete updates FTP after workouts are compiled and expects future unresolved workouts to use the new baseline without mutating already executed history.
- A workout has a resolved prescription snapshot and athlete baseline later changes; historical execution and fatigue replay must remain unchanged.
- A completed session is submitted without completion timestamp, resolved prescription reference, or actual load data.
- A planned workout is attempted without a mesocycle parent relationship.

## Constitution Alignment *(mandatory)*

- **Code Quality Gates**: All acceptance scenarios in this spec must be traceable to automated or manual test evidence before release; deterministic behavior checks are mandatory for fatigue calculations and sync outcomes.
- **TDD Plan**: Each behavior starts with a failing test based on acceptance scenarios, then minimal behavior changes, then refactor while preserving deterministic outputs.
- **Testing Matrix**: Unit tests cover fatigue axis math, classification logic, and progression rules; integration tests cover plan lifecycle, calendar movement rules, and offline sync; contract tests cover external ingest boundaries; regression tests cover primary athlete and coach journeys.
- **UX Consistency Plan**: All user-facing screens must define success, loading, empty, and error states; warnings remain advisory only; interaction patterns remain consistent across Today, Calendar, and workout execution surfaces.
- **Frontend Verification Plan**: Every modified UI surface must be browser-verified with `agent-browser` + `chrome-devtools-mcp`, and verification evidence must be attached before release.
- **Performance Budget**: Define and enforce user-visible latency budgets for primary flows (plan load, workout logging, fatigue display updates) with release blocked if thresholds are not met.
- **Open Clarifications**: None.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support the hierarchy `User -> Athlete Profile -> Macrocycle -> Mesocycle -> Microcycle (Workout) -> Session`.
- **FR-002**: The system MUST represent two-a-days as separate workouts with time-of-day and time-between metadata.
- **FR-003**: Users MUST be able to define macrocycles with primary goal, target date, and strength/endurance priority.
- **FR-004**: Users MUST be able to create mesocycle templates with modality focus, periodization type (block, DUP, linear), progression rules, deload rules, test week rules, and weekly structure philosophy.
- **FR-005**: Users MUST be able to define workouts through either structured builder inputs or DSL text.
- **FR-006**: The system MUST compile all workout definitions to a canonical, versioned intermediate representation that executes deterministically.
- **FR-007**: The system MUST support mixed-modality workouts and deterministic segment aggregation.
- **FR-008**: Completed workouts MUST be immutable in schedule position; users cannot move completed workouts.
- **FR-009**: Planned workouts MUST remain planned after calendar moves, and weekly audit views MUST update after each move.
- **FR-010**: The system MUST issue soft warnings for high-risk stacking and MUST NOT enforce hard training locks; a high-risk stacking warning MUST trigger when any deterministic rule is met: (a) any fatigue axis is `>=7.0` and at least one session classified as hard is scheduled in the next 24 hours, (b) two sessions classified as hard are scheduled with less than 8 hours between planned start times, or (c) three consecutive calendar days each contain at least one hard-classified planned session.
- **FR-011**: Users MUST be able to modify planned workout structure and classification inputs.
- **FR-012**: Users MUST NOT be able to directly edit fatigue outputs.
- **FR-013**: Athlete profiles MUST store strength baselines (training max, estimated 1RM, and RPE/RIR inputs) and endurance baselines (FTP/CP, HR zones, pace zones, power zones).
- **FR-014**: Athlete profiles MUST store preferences including unit system, training signal priority (pace/power/HR), equipment access, and injury constraints.
- **FR-015**: Users MUST be able to submit and edit daily check-ins for sleep, fuel, and stress.
- **FR-016**: The system MUST treat missing sleep input as a deterministic normal-sleep default for system-capacity and fatigue calculations: `sleep_score = 3` on a 1-5 scale, sourced from versioned model constants.
- **FR-017**: The fatigue model MUST maintain four axes (recruitment, metabolic, mechanical, neural) on a 1.0-10.0 scale with red threshold at 7.0 or above.
- **FR-018**: Recruitment MUST be strictly derived as `max(neural, mechanical)` and expressed as an availability-oriented signal; no direct override path is permitted.
- **FR-019**: Neural fatigue MUST use stepwise decay with sleep-triggered reductions and global scope with at most one decay event per day; metabolic fatigue MUST use versioned parameters with an effective half-life of 24 hours or less; mechanical fatigue MUST use versioned parameters with an effective half-life of 72 hours or more.
- **FR-020**: Combined fatigue MUST be computed as weighted metabolic/mechanical/recruitment values (0.45/0.35/0.20), then neural-gated and system-capacity-gated; combined fatigue remains secondary to axis-level signals.
- **FR-021**: Session classification MUST follow modality-specific rules and use HR over power over pace when multiple endurance inputs exist; classification outputs may influence recruitment only through neural/mechanical contributor scoring and MUST NOT directly set recruitment.
- **FR-022**: The Today view MUST show fatigue after midnight rollover based on completed sessions and deterministically qualified session outcomes (`partial` and threshold-qualified `abandoned`), including explanation chips for top contributors.
- **FR-023**: Calendar views MUST include a 7-day weekly audit and 30-day month series with completed as solid, planned as dashed, recruitment overlay, and red threshold zone.
- **FR-024**: Workout execution in the current implementation slice MUST be delivered via responsive web (desktop and mobile browser) and support quick strength set logging, interval control (skip/extend), autopause handling, sensor dropout handling, and mid-session edits without invalidating session completion.
- **FR-025**: Workout logging MUST operate offline and synchronize later; deterministic same-workout conflict-resolution semantics are normatively defined by FR-045 through FR-049.
- **FR-045**: Offline sync conflict resolution for the same workout MUST use deterministic field-level precedence: session lifecycle state precedence is `completed` > `partial` > `abandoned` > `in_progress` > `planned`, and a state with higher precedence MUST win over lower precedence states.
- **FR-046**: When conflict exists between completed-session execution data and planned-workout edits for the same workout, completed-session execution data MUST win and MUST NOT be overwritten by planned edits.
- **FR-047**: Free-text notes and comments in same-workout offline edit conflicts MUST resolve by latest server-receive write time (last-write-wins).
- **FR-048**: Structural same-workout sync conflicts (for example incompatible segment/order changes) MUST be surfaced for explicit user resolution and MUST remain unresolved until user selects a winner.
- **FR-049**: When same-workout conflicts involve execution records with equal lifecycle precedence, deterministic tie-break MUST resolve winner by higher completed-work proportion; if tied, latest server-receive write time MUST win.
- **FR-050**: DSL compilation MUST enforce balanced input guardrails: maximum source length 50,000 characters, maximum syntactic nesting depth 16, and maximum generated IR node count 20,000.
- **FR-051**: DSL control-flow constructs MUST be statically bounded before execution, and total evaluated loop iterations per compile request MUST NOT exceed 10,000.
- **FR-052**: DSL compile requests SHOULD complete within 2 seconds for valid in-limit programs and MUST hard-stop at 5 seconds.
- **FR-053**: When any DSL/IR guardrail is violated (size, depth, node count, loop bound, or timeout), the system MUST reject compilation deterministically with explicit machine-readable validation errors and MUST NOT persist executable IR output.
- **FR-054**: LLM-assisted DSL translation or parsing outputs MUST pass the same deterministic compile pipeline and all DSL/IR guardrails before IR persistence; no LLM-specific bypass path is permitted.
- **FR-055**: Canonical IR artifacts MUST be immutable once compiled and versioned.
- **FR-056**: Canonical IR artifacts MUST remain athlete-agnostic by storing symbolic workout intent and progression definitions, not athlete-resolved absolute intensity targets.
- **FR-057**: Athlete-dependent values (for example FTP/training-max-derived intensities and progression outputs) MUST be late-bound at workout instance execution using the effective athlete baseline version at resolution time.
- **FR-058**: Each execution-bound resolution MUST persist an immutable resolved prescription snapshot containing resolved intensity/progression values, source IR version, and source baseline version for deterministic replay and auditability.
- **FR-059**: Baseline changes MUST affect only unresolved future workouts; previously resolved prescription snapshots and completed-session history MUST remain immutable unless the user performs an explicit plan-versioning action.
- **FR-026**: The platform MUST support required v1 integrations (Strava, Garmin, Wahoo, FIT/TCX import-export) as ingest pathways while preserving Sportolo ownership of planned workouts.
- **FR-027**: External systems MUST NOT edit or overwrite Sportolo plans.
- **FR-028**: Analytics MUST provide deterministic decision-support metrics for strength, endurance, and adherence using rolling 7-day and 30-day windows.
- **FR-069**: Strength analytics MUST include at minimum completed-session count, total completed strength volume (`sets * reps * load`), and top-set intensity trend over 7-day and 30-day windows.
- **FR-070**: Endurance analytics MUST include at minimum completed-session count, total completed duration, and modality load trend over 7-day and 30-day windows using the athlete's configured primary training signal (pace/power/HR).
- **FR-071**: The frontend MUST be runnable and deployable with explicit production commands (`npm run build` and `npm run start`) and must pass all frontend quality gates before release.
- **FR-072**: User-facing pages in v1 MUST use a modern visual system (Aceternity + shadcn/ui + Tailwind) with intentional typography, spacing, and motion rather than placeholder/default browser styling.
- **FR-029**: The system MUST support roles for athlete, coach, and team admin with role-appropriate plan editing, commenting, template sharing, privacy controls, and edit history visibility.
- **FR-030**: The system MUST seed and maintain an exercise catalog with deduplicated canonical identifiers, aliases, region tags, placeholder media, and user-created exercises that remain user-scoped.
- **FR-031**: The platform MUST support subscription monetization including coach access for unlimited athletes and MUST enforce at least one entitlement-gated operation in v1; when entitlement is absent, the operation MUST return a deterministic access-denied response (`403` + machine-readable reason code). Future feature-gating capability MUST reuse the same entitlement mechanism.
- **FR-032**: The platform MUST include medical disclaimer messaging, privacy compliance support, and user data export/delete capabilities.
- **FR-033**: The unified DSL MUST meet a versioned parity matrix for Liftosaur-style strength and Intervals.icu-style endurance builders: minimum supported strength constructs are autoregulated top set + backoffs, percentage waves, and AMRAP/rep-PR triggers; minimum supported endurance constructs are interval blocks with warmup/work/recovery segments, repeated interval sets, and HR/power/pace targets; parity verification MUST use at least 40 canonical templates (minimum 20 strength, 20 endurance) and achieve at least 95% deterministic compile success with equivalent canonical IR outcomes. Equivalent canonical IR outcomes are defined as identical normalized IR hashes (`determinism_hash`) after deterministic normalization (stable key ordering, unit normalization, and default-expansion), with no semantic diffs in segment order, durations, and target prescriptions. Implementation evidence MUST include a parity corpus manifest and deterministic hash comparison report artifacts.
- **FR-034**: The system MUST version macrocycles, mesocycles, and workouts; structural edits MUST create a new version and regenerate only uncompleted future workouts from an explicit effective date while preserving completed workouts and prior versions for deterministic auditability.
- **FR-035**: When a macro goal or priority changes mid-cycle, the system MUST create a new macrocycle version and re-prioritize/regenerate only uncompleted future mesocycles/workouts from the chosen effective date.
- **FR-036**: The system MUST provide user-created snapshot capability for macrocycles and mesocycles, and MUST automatically create snapshots on structural edits that affect generated plans.
- **FR-037**: Restoring a snapshot MUST create a new forward plan version (not destructive rollback), preserve completed session history, and regenerate only uncompleted future workouts from the user-selected effective date.
- **FR-038**: Session lifecycle state MUST be explicit and limited to `planned`, `in_progress`, `completed`, `partial`, and `abandoned`, with deterministic transition rules from in-session events.
- **FR-039**: `partial` sessions MUST contribute fatigue proportionally to completed prescribed work using deterministic calculation rules.
- **FR-040**: `abandoned` sessions MUST contribute zero fatigue unless completed work is at least 20% of prescribed work (or deterministic modality-equivalent threshold); threshold-qualified `abandoned` sessions MUST use the same deterministic proportional fatigue method as `partial`.
- **FR-041**: Session transition to `partial` MUST require explicit user end/save before completion; transitions caused by discard, timeout, or app exit without explicit end MUST resolve to `abandoned`.
- **FR-042**: Retroactive daily check-in edits MUST trigger deterministic fatigue recomputation from the edited date forward, and recomputed outputs MUST be stored with lineage to prior computed versions.
- **FR-043**: Historical computed fatigue snapshots MUST remain immutable; recomputation MUST create new versioned snapshots that reference prior versions through explicit lineage metadata.
- **FR-044**: Every retroactive recomputation MUST emit a recalc audit event that records actor, trigger reason, recompute date range, and affected fatigue snapshot version identifiers.
- **FR-060**: The system MUST persist daily fatigue axis snapshots as the authoritative fatigue history and read model for Today/Calendar views; any invalidating change MUST trigger deterministic recomputation from the earliest affected date forward and append new lineage-linked snapshot versions rather than mutating prior records.
- **FR-061**: For autoreg top sets, AMRAP triggers, and wave progressions, the system MUST deterministically mark progression failure when prescribed minimum targets are missed or top-set RPE exceeds expected by at least 1; default behavior MUST be advisory-only, and template-configured auto-adjust policies (`repeat`, `regress`, `deload`) MUST apply only to the next uncompleted workout in the same progression track.
- **FR-062**: Integration ingest deduplication MUST follow deterministic hierarchical matching: (1) exact `(provider, athlete, external_activity_id)` when available; (2) fallback `(start time within +/-60 seconds, duration within +/-5%, same modality)` when external ID is unavailable; and (3) when fallback returns multiple candidates, the import MUST remain pending and require explicit user resolution before linking.
- **FR-063**: Adherence over/undertraining flags MUST be computed deterministically: overtraining is flagged when `(rolling 7-day completed load >=115% of planned and any fatigue axis >=7.0 on at least 2 days)` OR `(any fatigue axis >=7.0 for 3 consecutive days)`; undertraining is flagged when `(rolling 14-day completed load <=75% of planned)` OR `(planned-session completion rate <70% over 14 days)`.
- **FR-064**: For two-a-day workflows, `time-between` metadata MUST be stored and used for warning heuristics and explanation/audit context only; v1 MUST NOT apply intra-day fatigue decay adjustments based on time-between, and decay behavior remains governed by existing day-boundary/sleep-triggered rules.
- **FR-065**: Users MUST NOT be able to override fatigue model axis decay parameters or base fatigue weighting constants (including combined-score weights) in v1.
- **FR-066**: Fatigue scoring and progression resolution MUST be deterministic pure functions of stored inputs and fixed versioned model parameters; no randomness or nondeterministic sampling is permitted in scoring or progression outcomes.
- **FR-067**: A session transition to `completed` MUST be valid only when completion timestamp, resolved prescription snapshot reference (with IR lineage), and actual load/execution data are present.
- **FR-068**: A planned workout record MUST always reference an existing mesocycle parent; orphan planned workouts are invalid and MUST be rejected.

### User Experience Consistency Requirements *(mandatory for user-facing changes)*

- **UXR-001**: Today, Calendar, plan editing, and workout execution flows MUST each define clear success, loading, empty, and error states.
- **UXR-002**: Warning behavior MUST be consistently advisory across all surfaces; users can proceed after seeing warnings.
- **UXR-003**: Completed-versus-planned visual semantics MUST be consistent anywhere timeline data is shown.
- **UXR-004**: Fatigue explanations MUST use plain language and identify top contributors to build user confidence.
- **UXR-005**: Modified screens MUST meet a WCAG 2.2 AA baseline: full keyboard navigation for interactive controls, visible focus indicators, accessible form labels/status messages, and zero critical accessibility violations in automated and manual release checks.
- **UXR-006**: Every modified frontend page/component MUST be manually verified in a real browser with `agent-browser` + `chrome-devtools-mcp`, and evidence must be saved in feature verification artifacts.
- **UXR-007**: Production UI reviews MUST reject generic placeholder styling; accepted designs must demonstrate a defined visual direction and responsive behavior on mobile and desktop.

### Performance Requirements *(mandatory)*

- **PRF-001**: For a user with at least 30 days of data, 95% of Today and Calendar loads MUST render key metrics within 2 seconds.
- **PRF-002**: During workout execution, 95% of logging actions MUST provide visible confirmation within 1 second.
- **PRF-003**: After moving a planned workout, weekly audit updates MUST appear within 2 seconds in 95% of attempts.
- **PRF-004**: Offline session synchronization after reconnect MUST complete within 60 seconds for at least 95% of sessions when validated under a defined network profile: round-trip latency `<=150ms`, downlink `>=5 Mbps`, uplink `>=1 Mbps`, and packet loss `<=2%`.
- **PRF-005**: Release approval MUST be blocked when any performance threshold above is not met without explicit product sign-off.
- **PRF-006**: Frontend production builds (`npm run build`) MUST succeed in CI and local release validation before merge.
- **PRF-007**: Core user flows (Planner, Workout Execute, Today) SHOULD meet Web Vitals thresholds in validation runs: LCP <=2.5s and CLS <=0.1 on desktop and mobile profiles.

### Assumptions

- Athlete-facing v1 supports combined strength and endurance planning within a single athlete profile.
- Midnight rollover is evaluated in the athlete's configured local timezone.
- CSS support is explicitly out of scope for v1 and treated as future work.
- Team features are included in v1 scope but secondary to core athlete planning and logging workflows.
- Data retention and deletion follow applicable privacy obligations in markets where the product operates.
- Current implementation slice delivers API + responsive web; native mobile app delivery is deferred.

### Dependencies

- Availability of integration access from Strava, Garmin, Wahoo, and FIT/TCX file sources for ingest and export workflows.
- Availability of seed exercise data from the exercemus repository for initial global catalog population.
- Athlete-provided baseline and check-in inputs for accurate fatigue and capacity calculations.

### Scope Boundaries

- In scope for v1: planner-first hybrid programming, deterministic fatigue scoring, workout execution and logging, calendar and analytics decision support, required integrations ingest, role-based coaching and teams, and subscription support.
- Out of scope for v1: automatic plan generation, AI coaching recommendations, injury prediction, Hyrox-specific optimization, and real-time readiness coaching.
- Out of scope for current implementation slice: native iOS/Android app delivery (while keeping APIs mobile-compatible).

### Key Entities *(include if feature involves data)*

- **User**: Account holder with role assignment and ownership of one or more athlete contexts.
- **Athlete Profile**: Baselines, preferences, and constraints used to classify sessions and compute fatigue.
- **Macrocycle**: Goal-oriented training container with target date and overall training priority.
- **Mesocycle Template**: Reusable block defining periodization model, progression logic, deload, and test week rules.
- **Workout (Microcycle Item)**: Planned training unit with modality segments, schedule placement, warning hooks, and a required mesocycle parent relationship.
- **Two-a-Day Gap Signal**: Derived from stored `time-between` metadata and used for warning/explanation context; does not directly modify intra-day fatigue decay in v1.
- **Session**: Workout execution instance with lifecycle state (`planned`, `in_progress`, `completed`, `partial`, `abandoned`), explicit termination signal (`user_end_save`, `discard`, `timeout`, `app_exit`, `planned_complete`), actual execution details, completed-work proportion, and deterministic fatigue-impact eligibility; `completed` requires completion timestamp, resolved prescription snapshot reference, and actual load data.
- **Daily Check-in**: Sleep, fuel, and stress inputs used for system-capacity gating.
- **Fatigue Snapshot**: Authoritative immutable daily record of axis scores, recruitment signal, combined score, explanation contributors, and computed-version lineage used for deterministic reads and replay.
- **Calendar Audit Point**: Daily plotted values for completed/planned workloads and threshold overlays.
- **Exercise Catalog Item**: Canonical exercise definition with aliases, region tags, and source scope (global or user-created).
- **Integration Activity**: External activity or file ingest record linked to athlete history without plan-edit authority, including dedup match keys, matched-record reference, and ambiguity-resolution status.
- **Plan Version**: Immutable snapshot metadata for macrocycle/mesocycle/workout structures, including effective date, source version link, and change audit trail.
- **Snapshot**: User-created or system-created immutable restore point for macrocycle or mesocycle structure, linked to version history and audit metadata.
- **Recalculation Event**: Immutable audit record emitted for retroactive fatigue recomputation, including actor, reason, affected date range, and lineage references to prior/new fatigue snapshot versions.
- **Progression Failure Outcome**: Deterministic per-session progression result containing trigger reason (target miss or RPE overshoot), advisory recommendation, and any template-driven adjustment applied to the next uncompleted workout in the same progression track.
- **Sync Conflict Record**: Immutable conflict audit record capturing workout identifier, competing edit sources, conflicting field category, deterministic winner rule applied (or user-resolution requirement), and resolution timestamp.
- **DSL Program**: Authorable workout text with deterministic compile constraints, including source-size limit, nesting-depth limit, and bounded control-flow constraints.
- **IR Artifact**: Immutable canonical compiled representation produced only for guardrail-compliant programs, storing symbolic workout intent without athlete-resolved absolute targets.
- **Resolved Prescription Snapshot**: Immutable execution-time resolution record that binds an IR artifact to the effective athlete baseline version and stores resolved intensity/progression values used for session execution and replay.
- **Adherence Training Flag**: Deterministic analytics result per athlete window indicating `overtraining` and/or `undertraining` based on defined rolling-load, fatigue-axis, and completion-rate thresholds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 80% of new athletes can create a complete first-week hybrid plan (profile through scheduled workouts) in under 30 minutes without assisted support.
- **SC-002**: At least 90% of started workouts are completed and saved without user-reported logging friction in the same session.
- **SC-003**: At least 95% of repeated fatigue recalculations with identical inputs produce identical outputs.
- **SC-004**: At least 70% of active athletes achieve 30-day adherence without triggering overtraining or undertraining flags, using FR-063 deterministic flag definitions.
- **SC-005**: At least 80% of surveyed active users agree that they feel confident executing their plan.
- **SC-006**: Support requests related to workout logging difficulty decrease by at least 30% compared with the pre-release baseline.
- **SC-007**: At least 95% of DSL programs using supported unified parity constructs compile successfully to canonical IR on first validation attempt.
- **SC-008**: 100% of release candidates pass frontend production build/start validation and documented browser verification evidence for changed screens.
- **SC-009**: At least 90% of stakeholder UI reviews rate new/changed screens as modern, coherent, and production-ready.
