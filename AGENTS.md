# ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in .agents/exec/PLANS.md) from design to implementation.

## Active Technologies
- Python 3.12 (API), TypeScript 5.6 (web) + FastAPI, SQLAlchemy, Alembic, Pydantic, PostgreSQL driver, Next.js 15, React 19, Tailwind CSS, shadcn/ui, Aceternity components (001-define-sportolo-v1)
- PostgreSQL 16 (primary), object storage/files for FIT/TCX artifacts (001-define-sportolo-v1)
- PostgreSQL 16 for relational core data, object/file storage for FIT/TCX artifacts (001-define-sportolo-v1)
- PostgreSQL 16 for relational domain/version history, file/object storage for FIT/TCX artifacts (001-define-sportolo-v1)
- PostgreSQL 16 for relational domain/version lineage and recalculation events, file/object storage for FIT/TCX artifacts (001-define-sportolo-v1)
- Python 3.12 (API), TypeScript 5.x (Web) + FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL driver, Next.js, React, Tailwind CSS, shadcn/ui, Aceternity Components (only for specific screens), OpenAPI tooling (001-define-sportolo-v1)
- Python 3.12 (API), TypeScript 5.x (Web) + FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL driver, Next.js, React, Tailwind CSS, shadcn/ui, Aceternity Components (screen-specific), OpenAPI tooling (001-define-sportolo-v1)
- Python 3.12 (API), TypeScript 5.x (web) + FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL driver, Next.js, React, Tailwind CSS, shadcn/ui, Aceternity components/templates (only when a specific screen requires) (001-define-sportolo-v1)
- Python 3.11+ (API), TypeScript 5.x (web) + FastAPI, SQLAlchemy, Alembic, PostgreSQL driver, Next.js, React, Tailwind CSS, shadcn/ui (001-define-sportolo-v1)
- PostgreSQL (authoritative operational store + immutable/versioned history records) (001-define-sportolo-v1)

- TypeScript 5.6 (shared domain, DSL/IR compiler, API, and client logic) + Node.js 22 runtime, React web app, React Native mobile app, schema validation library, OpenAPI tooling (001-define-sportolo-v1)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

`make all` must be run after any changes, a feature is not complete if `make all` does not pass. 

## Code Style

TypeScript 5.6 (shared domain, DSL/IR compiler, API, and client logic): Follow standard conventions

## TDD
## Core Rules
1. Write tests first
   - Before writing or modifying implementation code, create or update tests that describe the desired behavior.
   - Tests should initially fail for the right reason.
2. Red -> Green -> Refactor
   - Red: Add a failing test that captures the requirement or bug.
   - Green: Write comprehensive implementation needed to make the test pass.
   - Refactor: Improve code structure and clarity without changing behavior, keeping all tests passing.
3. No untested behavior
   - Every new feature, bug fix, or edge case must be covered by tests.
   - Do not introduce logic that is not exercised by at least one test.
4. Tests define the contract
   - Prefer readable, intention-revealing test names and assertions.
   - Test observable behavior over internal implementation details.
5. Deterministic tests
   - No flaky or time-dependent tests.
   - No real network calls in unit/component/integration tests.
## User Testing
Before finishing any new frontend related feature use agent-browser and go though each persona in user_profiles. 
Acting as that user, implement the feature from the browser to make sure everything works as expected. 


## Technical Context

**Language/Version**: Python 3.11+ (API), TypeScript 5.6+ (web)  
**Primary Dependencies**: FastAPI, SQLAlchemy, Alembic, PostgreSQL driver, Next.js 15, React 19, Tailwind CSS, shadcn/ui, Aceternity UI
**Storage**: PostgreSQL (authoritative operational store + immutable/versioned history records)  
**Testing**: pytest (unit/integration/contract), frontend unit/integration tests, OpenAPI contract validation  
**Target Platform**: Linux-hosted API + responsive web browsers (desktop/mobile web); native mobile app out of current slice  
**Project Type**: Web application (backend + frontend)  
**Performance Goals**: p95 <= 2s Today/Calendar load, p95 <= 1s workout logging acknowledgment, p95 <= 2s weekly audit update, p95 <= 60s reconnect sync completion for 95% of sessions, DSL compile target <= 2s with 5s hard stop  
**Constraints**: Deterministic fatigue/sync/analytics/progression outcomes; immutable historical records with lineage; no randomness in scoring/progression; no user overrides for fatigue decay parameters/base weights; no external plan-write authority; two-a-day `time-between` is warning-only in v1; production-ready frontend runtime (`build`+`start`) required; responsive web required  
**Scale/Scope**: v1 slice for plan authoring/versioning, workout/session logging, fatigue history/recompute, adherence flags, deterministic invariants for completed sessions/planned workouts, exercise catalog operations, integrations ingest/export with deterministic dedup resolution, coach/team role workflows, subscription entitlement checks, and compliance export/delete/disclaimer operations
**UI**: Use Aceternity + shadcn/ui + Tailwind as the default visual system, preserve modern visual quality, and require browser verification (`agent-browser` + `chrome-devtools-mcp`) for every changed screen before release.
Before creating any pages browse https://ui.aceternity.com/ to see if there is one there can use. We have a pro account so download from browser. (use agent-browser to access)
Pull Shadcn components from https://ui.shadcn.com/docs/components or https://shadcnstudio.com/components
## Required Skills
Whenever a frontend change is made we must use the following skills. frontend-design, refactoring-ui, vercel-react-best-practices and web-design-guidelines

# use template found in aceternity/nodus-template for overarching design