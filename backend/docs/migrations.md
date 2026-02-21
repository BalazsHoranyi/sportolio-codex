# Migration and Rollback Strategy

This document defines how schema migrations are authored, validated, and rolled out in Sportolo backend.

## Naming and Versioning Conventions

Migration files live in `backend/migrations/versions/` and must follow this filename format:

- `NNNN_sprtXX_short_description.py`

Rules:

- `NNNN` is a zero-padded sequence (`0001`, `0002`, ...).
- `sprtXX` references the Linear ticket in lowercase without dash (`sprt13`, `sprt26`).
- `short_description` is snake_case and action-oriented.

Inside each migration file:

- `revision` must match the filename prefix (`0001_sprt26` for `0001_sprt26_fatigue_snapshots.py`).
- `down_revision` must always be explicitly set.
- `upgrade()` and `downgrade()` must both exist.
- `downgrade()` cannot be a no-op (`pass`, `...`, `raise NotImplementedError`).

## Automated Migration Checks

Migration safety is enforced by:

1. Integration tests (`backend/tests/integration/test_migration_pipeline.py`) that validate deterministic
   `upgrade -> rollback -> upgrade` behavior.
2. Migration lint script (`backend/scripts/migration_lint.py`) that enforces naming, revision consistency,
   downgrade presence, and destructive operation safeguards.

Run manually from repository root:

- `uv run --project backend python backend/scripts/migration_lint.py --migrations-dir backend/migrations/versions`
- `uv run --project backend pytest backend/tests/integration/test_migration_linting.py backend/tests/integration/test_migration_pipeline.py`

`make all` executes migration lint through `backend-lint` and migration pipeline checks through `backend-test`.

## Seed Strategy for Migration-Aware Tests

Deterministic fixture seeds for migration-backed tables are defined in:

- `backend/src/sportolo/testing/migration_seed.py`

Use `reset_and_seed_fatigue_snapshots(engine)` in tests to:

- clear existing `fatigue_snapshots` rows,
- insert a deterministic baseline dataset,
- return stable seeded IDs.

This keeps migration integration tests reproducible and independent from runtime clock/state.

## Production Rollout Runbook

### 1) Preflight

- Ensure application and migration code are from the same commit/tag.
- Back up the target database.
- Validate current revision state with `alembic current`.
- Run local checks (`make all`) before deployment.

### 2) Staging Rehearsal

- Apply migration in staging with production-like data volume.
- Run smoke checks against key API paths.
- Validate rollback command for the newest revision.

### 3) Production Apply

- Put write traffic in maintenance mode if migration is not online-safe.
- Run `alembic upgrade head`.
- Verify expected tables/columns and service health.

### 4) Rollback Procedure

Rollback is required if post-migration checks fail or error budgets are exceeded.

- Roll back exactly one revision with `alembic downgrade -1`.
- Confirm schema and service recovery.
- Keep maintenance mode active until validation passes.

### 5) Post-Deployment Verification

- Confirm `alembic current` matches expected head.
- Review migration logs and error monitors.
- Document any incident timeline and corrective actions.

## Destructive Changes Policy

Destructive upgrade operations (for example `drop_table`, `drop_column`, destructive SQL) are blocked by default.
If a destructive change is intentionally required, include this explicit marker in the migration file and document the operational plan in the PR:

- `# migration-lint: allow-destructive-upgrade`
