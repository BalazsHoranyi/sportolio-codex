# Quickstart: Sportolo v1 API + Web Planning Slice

## Goal

Deliver the clarified v1 API + responsive web scope with deterministic planning, deterministic session lifecycle behavior, deterministic offline sync resolution, deterministic DSL/IR guardrails, immutable canonical IR, late execution-time baseline binding, strict derived recruitment behavior, retroactive fatigue recomputation auditability, deterministic adherence over/undertraining analytics flags, two-a-day warning-only time-gap behavior (no intra-day decay in v1), and tightened deterministic invariants for model controls and core records.

## Inputs

- `/Users/bhoranyi/Personal/sportolo2/specs/001-define-sportolo-v1/spec.md`
- `/Users/bhoranyi/Personal/sportolo2/specs/001-define-sportolo-v1/plan.md`
- `/Users/bhoranyi/Personal/sportolo2/specs/001-define-sportolo-v1/research.md`
- `/Users/bhoranyi/Personal/sportolo2/specs/001-define-sportolo-v1/data-model.md`
- `/Users/bhoranyi/Personal/sportolo2/specs/001-define-sportolo-v1/contracts/openapi.yaml`

## Delivery Sequence

1. **Backend foundation**
   - Stand up FastAPI modules for planning, versions, snapshots, sessions, sync, DSL, prescriptions, fatigue, recalculation, integrations.
   - Implement SQLAlchemy models + Alembic migrations for lineage, audit, sync conflict, baseline versioning, and resolved prescription snapshots.

2. **Planning/versioning workflows**
   - Implement FR-034 to FR-037 (effective-date rebase, snapshot creation, forward restore).

3. **Session workflows**
   - Implement FR-038 to FR-041 (explicit states, deterministic transitions, 20% abandoned threshold logic).

4. **Offline sync workflows**
   - Implement FR-045 to FR-049:
     - deterministic state precedence,
     - completed execution data precedence over planned edits,
     - notes/comments LWW by server-receive timestamp,
     - structural conflict queue + explicit user resolution,
     - equal-precedence execution tie-break (work ratio then server-receive timestamp).

5. **DSL guardrail workflows**
   - Implement FR-050 to FR-054:
     - enforce source/depth/IR-node limits,
     - enforce static loop bounds,
     - enforce compile target (`<=2s`) and hard timeout (`5s`),
     - deterministic machine-readable rejection for violations,
     - no bypass path for LLM-assisted DSL outputs.

6. **IR binding and prescription resolution workflows**
   - Implement FR-055 to FR-059:
     - immutable canonical IR artifacts,
     - athlete-agnostic symbolic IR only,
     - execution-time late binding to effective baseline version,
     - immutable resolved prescription snapshots (IR version + baseline version + resolved values),
     - baseline changes affect unresolved future workouts only unless explicit plan-versioning action.

7. **Retroactive recompute + fatigue persistence workflows**
   - Implement FR-042 to FR-044 and FR-060:
     - retroactive check-in edit triggers deterministic recompute from edited date forward,
     - immutable prior computed snapshots plus lineage-linked new versions,
     - mandatory recalculation event logging,
     - authoritative fatigue reads served from persisted daily snapshot versions (latest computed version per date).
   - Enforce FR-018/FR-021 recruitment semantics:
     - recruitment is always `max(neural, mechanical)`,
     - classification inputs can affect neural/mechanical contributors only,
     - no direct recruitment override path in any API or UI flow.

8. **Progression-failure workflows**
   - Implement FR-061:
     - deterministic progression-failure detection for target misses and top-set RPE overshoot (>= +1),
     - advisory-only default behavior,
     - optional template policy auto-adjust (`repeat`, `regress`, `deload`) for next uncompleted workout in same progression track,
     - immutable progression-failure outcome records for auditability.

9. **Responsive web implementation**
   - Build planner/today/calendar/session/conflict-resolution/DSL validation feedback/prescription-preview flows with Tailwind + shadcn/ui.
   - Enforce route-level Aceternity composition map:
     - `/planner`: at least one of `BackgroundBeams`, `HoverBorderGradient`, `SparklesText`
     - `/workouts/[workoutId]/execute`: at least one of `Spotlight`, `TracingBeam`, `AnimatedTooltip`
     - `/today`: at least one of `BentoGrid`, `CardStack`, `TextGenerateEffect`
     - `/calendar`: at least one of `BentoGrid`, `HoverBorderGradient`, `AnimatedTooltip`
   - If a mapped component cannot be used, record route-specific exception + shadcn fallback in verification evidence.

10. **Integration boundary**
   - Implement ingest/export pipelines for Strava/Garmin/Wahoo/FIT/TCX.
   - Implement FR-062 dedup hierarchy:
     - external ID exact match first,
     - fallback `(start time +/-60s, duration +/-5%, same modality)`,
     - explicit user resolution when fallback yields multiple candidates.
   - Preserve ingest-only authority for external systems.

11. **Adherence analytics workflows**
   - Implement FR-063 deterministic flagging rules:
     - overtraining flag from 7-day load ratio + fatigue-axis threshold rules,
     - undertraining flag from 14-day load ratio/completion-rate rules.
   - Expose windowed adherence analytics read endpoint for SC-004 validation and dashboard usage.
   - Persist immutable, auditable per-window adherence flag records with source lineage references.

12. **Two-a-day gap warning workflows**
   - Implement FR-064:
     - store and surface `time-between` metadata for two-a-day workflows,
     - evaluate deterministic gap warnings for explanation/context,
     - do not apply intra-day fatigue decay adjustments from time-between in v1.

13. **Deterministic control/invariant workflows**
    - Implement FR-065 to FR-068:
      - enforce non-editable fatigue decay parameters and base weights in user-facing workflows,
      - enforce no-randomness rule for fatigue/progression computation paths,
      - enforce completed-session invariants (completion timestamp, resolved prescription/IR lineage, actual load data),
      - enforce planned-workout mesocycle-parent invariant (no orphan planned workouts).

14. **Muscle usage attribution workflows**
    - Implement deterministic exercise -> routine -> microcycle aggregation for visualization support.
    - Expose aggregation output through `POST /v1/athletes/{athleteId}/muscle-usage/aggregate`.
    - Ensure unknown exercise mappings and workload validation paths are deterministic and test-covered.
    - Render exercise/routine/microcycle muscle maps in the web UI with deterministic key-to-anatomy mapping and update behavior when routine/exercise selection changes.
    - Surface deterministic exercise-level `Primary focus` and `Secondary focus` labels from muscle usage payload ordering.

## Testing (Failing-First)

- Unit:
  - fatigue axis math,
  - session transitions,
  - abandoned threshold and partial proportionality,
  - sync precedence and tie-break determinism,
  - DSL guardrail limit checks (size/depth/nodes/loops),
  - timeout handling and non-persist rejection behavior,
  - immutable IR enforcement,
  - late-binding resolution from baseline versions,
  - immutable resolved prescription snapshots,
  - authoritative fatigue-snapshot selection (highest computed version per day),
  - recruitment remains strictly derived from neural/mechanical even when classification implies high-threshold work,
  - two-a-day time-gap warning evaluation is deterministic and does not alter intra-day fatigue decay math,
  - axis decay/base-weight override attempts are rejected deterministically,
  - no-randomness assertions hold across fatigue/progression computation paths,
  - completed-session invariant validation (timestamp + resolved prescription + actual load) is enforced,
  - planned-workout parent invariant is enforced,
  - adherence flag threshold evaluation (FR-063) for all overtraining/undertraining trigger paths,
  - muscle usage weighting and exercise->routine->microcycle rollup determinism,
  - deterministic progression-failure trigger evaluation and policy application rules.
- Integration:
  - offline dual-client same-workout conflicts,
  - structural conflict manual resolution path,
  - baseline update -> future unresolved workout uses new baseline,
  - resolved historical snapshot remains unchanged after baseline update,
  - retroactive check-in edit -> recompute -> new snapshot versions -> recalculation event,
  - Today/Calendar reads use persisted snapshot history without full recompute-on-read,
  - two same-day workouts with short time gap trigger warning context while producing no intra-day decay adjustment,
  - repeated identical fatigue/progression inputs produce identical outputs with explicit no-randomness checks,
  - completed-session finalize calls missing required invariant fields are rejected with deterministic validation errors,
  - planned workout create/move flows cannot produce mesocycle-orphaned planned records,
  - progression failure with `advisory_only` policy does not mutate future workouts,
  - progression failure with template `repeat|regress|deload` mutates only the next uncompleted workout in the same progression track,
  - adherence analytics windows produce deterministic identical flags for identical inputs,
  - retroactive recompute updates subsequent adherence-window outputs deterministically without mutating prior immutable records,
  - integration import dedup external-id match links duplicates deterministically,
  - fallback dedup tolerance behavior is deterministic, and multi-candidate fallback enters pending resolution state until user resolves,
  - over-limit and timeout compile requests return deterministic validation errors.
- Contract:
  - OpenAPI conformance for compile/translate, prescription resolve/read, sync ingest/conflict resolution, session finalize, progression-failure outcome read, integration dedup resolution, check-in update, recalculation listing, adherence analytics reads, muscle-usage aggregation reads, two-a-day warning/no-intra-day-decay fields, and invariant/no-randomness model-policy fields.
- Web:
  - success/loading/empty/error states,
  - responsive layouts for mobile/desktop web,
  - accessibility checks for data-entry, compile errors, prescription preview, and conflict resolution screens.
- Regression:
  - immutable historical records,
  - SC-003 deterministic reproducibility,
  - SC-004 uses FR-063 deterministic flag definitions and remains objectively testable,
  - FR-064 remains warning-only with no intra-day decay behavior regression,
  - FR-065 to FR-068 remain enforced across API and web surfaces,
  - no external integration plan overwrite,
  - no executable IR persistence on guardrail violations.

## Quality and Performance Gates

- Enforce lint/format/static-analysis for backend and frontend before merge.
- Enforce strict Red-Green-Refactor sequencing for behavior changes.
- Enforce frontend runtime production gates before release:
  - `npm run build` succeeds,
  - `npm run start` serves the production bundle,
  - browser verification evidence exists for every changed screen.
- Validate thresholds from spec:
  - p95 <= 2s Today/Calendar load,
  - p95 <= 1s logging acknowledgment,
  - p95 <= 2s weekly audit refresh,
  - p95 <= 60s reconnect sync completion for 95% of sessions,
  - in-limit DSL compile target <= 2s and hard stop at 5s.
- Block release if thresholds fail without explicit sign-off.

## Frontend Runtime Commands

Run from `/Users/bhoranyi/Personal/sportolo2/frontend`:

```bash
npm install
npm run dev
npm run build
npm run start
```

Required auth runtime secret (production):

```bash
export SPORTOLO_AUTH_SECRET='<strong-random-secret>'
```

Optional live muscle-map API wiring for the home-page explorer:

```bash
export SPORTOLO_API_BASE_URL=http://127.0.0.1:8000
export SPORTOLO_DEMO_ATHLETE_ID=athlete-1
```

If `SPORTOLO_API_BASE_URL` is not set or the API call fails, the explorer renders deterministic local sample data instead of an empty map.

Repository-level gates from `/Users/bhoranyi/Personal/sportolo2`:

```bash
make all
make release
```

## Browser Verification (Required)

1. Run each changed UI flow in browser automation using `agent-browser`.
2. Validate layout/interaction/accessibility with `chrome-devtools-mcp`.
3. Save evidence to:
   - `specs/001-define-sportolo-v1/checklists/ui-browser-verification.md`
   - optional screenshots under `specs/001-define-sportolo-v1/checklists/artifacts/`
4. For mapped routes, include Aceternity component names observed in render output and any documented fallback exceptions.

## Aceternity Pro Rule

- Ask the user to download them for you


## Next Step

Run `/speckit.tasks` to generate executable implementation tasks.
