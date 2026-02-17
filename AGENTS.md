# sportolo2 Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-16

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
## tools for testing UI. 
agent-browser skill and chrome-devtools-mcp

## Frontend Verification Requirement
- Every frontend component/page change MUST be verified in a browser before being marked complete.
- Verification MUST use `agent-browser` and Chrome DevTools MCP (`chrome-devtools-mcp`).
- “Done” for frontend work requires:
  1. Automated tests pass (`make all`).
  2. Manual browser verification is executed with the tools above.
