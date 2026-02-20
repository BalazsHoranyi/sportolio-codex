# sportolo Constitution

## Core Principles

### I. Code Quality as a Release Gate
- All production code MUST meet project linting, formatting, and static-analysis gates before
  review approval.
- Every change MUST preserve readability through clear naming, focused functions, and removal of
  dead code.
- Pull requests MUST include evidence that quality checks passed for affected modules.

Rationale: quality gates reduce defect density and keep maintenance cost predictable.

### II. Strict TDD (Non-Negotiable)
- Behavior changes MUST follow Red-Green-Refactor in that order.
- Tests for new or changed behavior MUST be authored and executed in a failing state before
  implementation code is added.
- Merges are blocked when implementation appears before corresponding failing tests unless a
  documented maintainer exception is approved.

Rationale: strict TDD prevents overbuilding and keeps behavior specification executable.

### III. Testing Standards and Coverage Accountability
- Test strategy MUST include the appropriate levels: unit tests for logic, integration tests for
  component boundaries, and contract tests for external interfaces.
- Every bug fix MUST include a regression test that fails before the fix and passes after the fix.
- Coverage for touched modules MUST NOT decrease without a documented waiver and approver.
- Flaky tests MUST be fixed or quarantined with an owner and deadline before release.

Rationale: standardized testing lowers regression risk and keeps confidence high during delivery.

### IV. User Experience Consistency
- User-facing changes MUST align with established interaction patterns, component usage, and visual
  language for the product surface.
- Each user-facing story MUST define acceptance criteria for success, loading, empty, and error
  states.
- Accessibility for new or changed UI flows MUST meet the project's baseline a11y checks before
  merge.

Rationale: consistent UX lowers cognitive load and improves trust in product behavior.

### V. Performance Requirements by Default
- Every feature MUST declare measurable performance targets for its critical path before
  implementation starts.
- Plans MUST define how performance is validated, including tooling and pass/fail thresholds.
- Changes that degrade an agreed performance target MUST be blocked unless a documented exception
  and mitigation plan are approved.

Rationale: explicit budgets prevent gradual performance erosion and production instability.

## Engineering and Experience Standards

- `plan.md` MUST document quality gates, TDD approach, testing matrix, UX consistency checks, and
  performance budgets for the feature.
- `spec.md` MUST capture measurable outcomes for both user experience and performance where
  applicable.
- Task plans MUST include explicit work items for code quality checks, failing-first tests,
  UX validation, and performance validation.
- Unknown constraints MUST be marked as concrete clarification items before implementation begins.

## Delivery Workflow and Enforcement

- Delivery order is mandatory: `spec.md` -> `plan.md` -> `tasks.md` -> implementation.
- Constitution Check in `plan.md` MUST pass before research and MUST be re-validated after design.
- Pull request review MUST verify evidence for quality gates, TDD execution, test results,
  UX acceptance coverage, and performance validation.
- A change is complete only when documentation and validation artifacts are updated to match
  delivered behavior.

## Governance

- This constitution is the authoritative policy for engineering decisions in this repository.
- Amendment process: submit a proposed change with rationale, affected artifacts, migration impact,
  and maintainer approval before merge.
- Versioning policy follows semantic versioning for governance updates:
  - MAJOR for incompatible principle removals or redefinitions.
  - MINOR for new principles/sections or materially expanded obligations.
  - PATCH for clarifications, wording improvements, or typo-level edits.
- Compliance review expectations: each plan, task list, and pull request MUST include an explicit
  constitution compliance check.

**Version**: 1.0.0 | **Ratified**: 2026-02-16 | **Last Amended**: 2026-02-16
