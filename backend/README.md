# sportolo-backend

Backend service modules for Sportolo.

## Backend bootstrap architecture

`SPRT-12` introduces centralized backend bootstrap wiring with explicit dependency injection boundaries:

- App factory: `backend/src/sportolo/app_factory.py`
- Runtime config + feature flags: `backend/src/sportolo/config.py`
- Router registry and exception handler registration:
  - `backend/src/sportolo/api/router_registry.py`
  - `backend/src/sportolo/api/error_handlers.py`
- Route dependency providers: `backend/src/sportolo/api/dependencies.py`
- Shared API primitives: `backend/src/sportolo/api/schemas/common.py`

System smoke endpoint:

- `GET /v1/system/smoke`
- Returns API envelope payload with app metadata and active feature flags.

Detailed architecture notes:

- `backend/docs/bootstrap-architecture.md`

## Fatigue persistence schema

`SPRT-26` introduces persistent storage for the 4-axis fatigue data model and system capacity.

Persistence components:

- SQLAlchemy model: `backend/src/sportolo/models/fatigue_snapshot.py`
- Repository: `backend/src/sportolo/repositories/fatigue_snapshot_repository.py`
- Alembic migration: `backend/migrations/versions/0001_sprt26_fatigue_snapshots.py`

`fatigue_snapshots` stores:

- Global axes: `global_neural`, `global_metabolic`
- Regional axes (JSON payloads): `regional_recruitment`, `regional_metabolic`, `regional_mechanical`
- System capacity fields: `system_capacity_sleep` (nullable), `system_capacity_fuel`, `system_capacity_stress`
- Optional `derived_recruitment`

Legacy `LIHC/HILC` fields are intentionally absent from the active persistence schema.

Migration usage examples from `backend/`:

- `uv run alembic upgrade head`
- `uv run alembic downgrade base`

Migration governance and rollout details:

- `backend/docs/migrations.md`

Migration lint command from repository root:

- `uv run --project backend python backend/scripts/migration_lint.py --migrations-dir backend/migrations/versions`

## Domain contexts and event contracts

`SPRT-11` introduces explicit backend domain boundaries and versioned domain-event
contracts so parallel implementation work stays schema-compatible.

Primary references:

- Architecture and ownership/lifecycle map: `backend/docs/domain-contexts-and-events.md`
- Versioned event contracts: `backend/src/sportolo/domain/events/contracts.py`
- Compatibility contract tests: `backend/tests/contract/test_domain_event_contracts.py`

Contract schema fixtures (compatibility baselines):

- `backend/tests/contract/fixtures/domain_events/`

## Today accumulation API

`SPRT-36` introduces a deterministic boundary-compute endpoint:

- `POST /v1/athletes/{athleteId}/fatigue/today/accumulation`

Request payload includes `asOf`, `timezone` (IANA), optional `sleepEvents`, and session records with axis contributions.
Payload also accepts:

- `combinedScoreContext.workoutType`: `hybrid | strength | endurance` (default `hybrid`).
- `systemCapacity`: `sleep` (optional, defaults to deterministic normal value `3`), `fuel` (1-5), `stress` (1-5).

Behavior:

- Includes only sessions where `state == completed` and `endedAt < boundaryEnd`.
- Resolves rollover boundary from latest same-local-day sleep event at or before `asOf`.
- Falls back to user-local midnight when no qualifying sleep event exists.
- Returns explicit boundary metadata: `boundaryStart`, `boundaryEnd`, `boundarySource`, `timezone`.
- Computes `combinedScore` in strict order: weighted recruitment/metabolic/mechanical blend -> neural gate -> system-capacity gate.
- Applies workout-type weight modifiers with renormalization so effective weights remain deterministic and sum to `1.0`.
- Keeps interpretation text fixed to `probability next hard session degrades adaptation`.
- Emits debug fields for `baseWeights`, `modifierWeights`, and `effectiveWeights` plus gate-stage scores.

## Exercise catalog API

`SPRT-72` introduces deterministic exercise catalog generation and filtering:

- `GET /v1/exercises`

Query parameters:

- `scope`: `global | user | all` (`user` returns an empty list in this implementation slice).
- `search`: case-insensitive canonical-name and alias matching.
- `equipment`: normalized equipment filter (`ez_bar`, `landmine`, `rings`, etc.).
- `muscle`: normalized region tag filter (`core`, `quads`, etc.).

Behavior:

- Canonical names are not forced into equipment-prefixed format (`Split Squat`, `Good Morning`, `Pallof Press`).
- Legacy equipment-prefixed aliases are preserved for backwards-compatible lookup (`Barbell Split Squat` resolves to `Split Squat`).
- Expanded equipment labels/abbreviations include `landmine`, `ez_bar`, `medicine_ball`, `preacher_bench`, `ghd`, `bosu`, `stability_ball`, and `rings`.
- Responses are deterministic for identical query inputs.

`SPRT-71` backfills missing strength families and naming coverage gaps in the same endpoint:

- Lower-body coverage now includes stationary split squats, cable pull-throughs, glute-ham raises, hip adduction, Copenhagen plank, tibialis raises, and dorsiflexion.
- Upper-body push/pull naming now includes shoulder/military press mapping, landmine press, triceps pressdowns, and straight-arm pulldowns.
- Forearm/rotator-cuff/core gaps now include wrist curls, reverse wrist curls, pronation/supination, gripper squeezes, external/internal rotations, Cuban press, dead bug, offset carry, and ab wheel rollout.
- Common aliases are explicitly searchable (`RFESS`, `Hyperextension`, `Adductor Machine`, `Military Press`, `Pressdown`, `GHR`, and related variants).

`SPRT-65` expands this endpoint into a deterministic production-sized seed catalog:

- Catalog now provides `>=1000` active deterministic global entries.
- Each entry includes canonical metadata fields:
  - `movementPattern`
  - `primaryMuscles`
  - `secondaryMuscles`
  - plus existing `regionTags` and `equipmentOptions`.
- Seed validation rejects malformed entries during catalog build (empty canonical name, missing equipment, missing primary muscle data, unknown equipment tokens, duplicate canonical names, duplicate IDs).
- Seed generation is deterministic across environments because blueprint expansion and build ordering are stable and normalization-based.

## Wahoo push + execution history sync API

`SPRT-46` introduces deterministic Wahoo workout push and history reconciliation endpoints:

- `POST /v1/athletes/{athleteId}/integrations/wahoo/workouts/push`
- `POST /v1/athletes/{athleteId}/integrations/wahoo/execution-history/sync`

Push behavior:

- Requires `idempotencyKey`, `plannedWorkoutId`, trainer metadata, and structured steps.
- Returns deterministic `externalWorkoutId` mapping for accepted pushes.
- Trainer IDs that begin with `offline` or `fail` return deterministic failed push status (`trainer_unreachable`) without creating side effects.
- Non-Wahoo trainer IDs return deterministic failed push status (`unsupported_trainer`) without creating side effects.
- Reusing the same `idempotencyKey` with the same payload replays the original response.
- Reusing the same `idempotencyKey` with a different payload is rejected as validation failure.

Sync behavior:

- Reconciles provider history against pushed `externalWorkoutId -> plannedWorkoutId` mappings.
- Returns deterministic per-entry reconciliation metadata including `dedupStatus`, `sequenceNumber`, and import IDs.
- Suppresses duplicates by `externalActivityId` and preserves ordering across retries.
- Emits deterministic pipeline dispatch metadata for new imports:
  - `workout_sync`
  - `fatigue_recompute`
- Enqueues each new dispatch through the background-job queue sink so sync/recompute pipelines can be processed with retry + dead-letter behavior.
- Sync retries with the same `idempotencyKey` replay the exact prior response and do not duplicate dispatch side effects.

## Background job framework

`SPRT-14` introduces deterministic in-process background job orchestration for sync/recompute workflows.

Core behavior:

- Queue supports idempotent enqueue replay keyed by `(athleteId, idempotencyKey)` with payload drift rejection.
- Retry policy supports configurable max attempts + retry delay.
- Terminal failures are captured as dead-letter jobs with actionable metadata (`lastErrorCode`, `lastErrorMessage`, attempt counts, failure timestamp).
- Metrics are tracked for:
  - queue depth,
  - failure rate (failed attempts / processed attempts),
  - average processing latency (ms),
  - retry and dead-letter counts.

System diagnostics endpoints:

- `GET /v1/system/background-jobs/metrics`
- `GET /v1/system/background-jobs/dead-letters`

## Wahoo trainer control API

`SPRT-45` introduces deterministic trainer control endpoint:

- `POST /v1/athletes/{athleteId}/integrations/wahoo/trainers/control`

Control behavior:

- Supports mode commands for:
  - `erg` with `targetUnit=watts`
  - `resistance` with `targetUnit=ratio` (`0..1`)
  - `slope` with `targetUnit=percent` (`-25..25`)
- Uses `idempotencyKey` replay semantics; identical retries return the original response and payload drift is rejected.
- Performs reconnect attempt when trainer state is disconnected before applying the requested mode.
- Applies immediate deterministic safety fallback (`resistance`, `0.0`, `ratio`) when reconnect or command apply fails.
- Returns explicit transition + status fields (`applied`, `safety_fallback`, `failed`) with failure reason metadata.
- Emits telemetry events for command issue, acknowledgements/failures, reconnect attempts, and safety fallback path.
