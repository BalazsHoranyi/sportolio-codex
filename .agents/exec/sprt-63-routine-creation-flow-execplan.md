# SPRT-63 Routine Creation Flow (Visual Builder + DSL Advanced Mode + UI/DSL Parity Hooks)

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document follows `.agents/exec/PLANS.md` and must be maintained in accordance with that file.

## Purpose / Big Picture

After this change, authenticated Sportolo users can create routines through either a visual editor or an advanced DSL editor, switch between modes without losing supported fields, and receive inline actionable validation when DSL content is invalid. This enables both novice workflow speed (visual path) and advanced precision (DSL path) in a single route. A novice can verify the behavior by opening `/routine`, adding a strength exercise visually, switching to DSL and seeing the change reflected, editing DSL to add endurance intervals, and switching back to visual mode with edits preserved.

## Progress

- [x] (2026-02-21 06:35Z) Selected one issue only: `SPRT-63` (`Urgent`, sportolo project, non-mobile scope).
- [x] (2026-02-21 06:36Z) Confirmed no sportolo issues are currently `In Progress`; selected highest-priority non-mobile ticket.
- [x] (2026-02-21 06:39Z) Audited repository state and confirmed `SPRT-63` feature is not implemented in this repository.
- [x] (2026-02-21 06:40Z) Read required skills context (`frontend-design`, `refactoring-ui`, `vercel-react-best-practices`, `web-design-guidelines`, `agent-browser`) and project goals.
- [x] (2026-02-21 06:42Z) Created branch `feature/sprt-63`.
- [x] (2026-02-21 06:45Z) Reviewed Aceternity component catalog and selected `Tabs` as base interaction pattern for Visual/DSL mode switching.
- [x] (2026-02-21 06:55Z) Moved Linear issue `SPRT-63` to `In Progress` and posted plan + acceptance criteria comment.
- [x] (2026-02-21 06:58Z) Added failing tests first for DSL helpers, routine flow component behavior, and `/routine` route rendering (red phase confirmed via missing-module failures).
- [x] (2026-02-21 07:02Z) Implemented routine flow route and feature modules (`types`, `routine-dsl`, `RoutineCreationFlow`, `/routine`) plus navigation links from authenticated pages.
- [x] (2026-02-21 07:05Z) Completed persona browser validation (desktop + mobile) for all profiles in `user_profiles` and refreshed required screenshot artifacts.
- [x] (2026-02-21 07:08Z) Ran `make all` successfully after formatting/type fixes.
- [ ] Commit once, push `feature/sprt-63`, and open MR.

## Surprises & Discoveries

- Observation: `SPRT-63` includes prior completion comments in Linear from a different repository context, but the current repository lacks routine-flow implementation files.
  Evidence: `find frontend/src -maxdepth 4 -type f` shows no routine feature module or route.

- Observation: Existing frontend codebase is plain Next.js + CSS classes and does not yet include a shared shadcn component directory.
  Evidence: `find frontend/src/components` fails; all UI is implemented directly inside feature modules.

- Observation: `SPRT-63` is blocked in Linear by several foundation issues, but current repository already has enough primitives (auth, exercise catalog API, frontend testing, route framework) to deliver the defined acceptance slice.
  Evidence: `get_issue` response lists blockers; `frontend/src/features/exercise-picker` provides reusable catalog/search behavior.

- Observation: URL-based wait checks using `?next=/routine` can create false positives when matching `**/routine` before login redirect completes.
  Evidence: initial `agent-browser wait --url \"**/routine\"` reported success while still on `/login?next=/routine`; switched validation to `wait --text \"Routine creation flow\"`.

- Observation: TypeScript did not narrow `payload.routineId`/`payload.routineName` to `string` from guard checks without explicit normalized variables.
  Evidence: `make all` typecheck failed with `TS2322` in `frontend/src/features/routine/routine-dsl.ts` until normalized string assignments were added.

## Decision Log

- Decision: Implement `SPRT-63` as a scoped web-only v1 routine flow even though related dependent tickets are still open.
  Rationale: User asked to implement one highest-priority sportolo issue now, explicitly excluding mobile scope; this ticket can be delivered with deterministic local behavior and existing APIs.
  Date/Author: 2026-02-21 / Codex

- Decision: Use Aceternity `Tabs` interaction pattern as the base for mode switching (`Visual` vs `DSL`) instead of inventing a custom switch UX.
  Rationale: It matches the exact dual-mode interaction model in the issue and satisfies the project requirement to source frontend blocks from Aceternity before building.
  Date/Author: 2026-02-21 / Codex

- Decision: Keep DSL format JSON-based for deterministic parsing and low-risk round-trip behavior.
  Rationale: Existing codebase and tests already operate on JSON contracts; JSON allows clear validation errors and stable serialization without introducing parser complexity.
  Date/Author: 2026-02-21 / Codex

- Decision: Use Refactoring UI guidance from chapter `Layout and Spacing` to drive visual hierarchy and whitespace rhythm.
  Rationale: The route combines dense controls and editors; that chapter gives practical spacing rules that keep complexity readable.
  Date/Author: 2026-02-21 / Codex

## Outcomes & Retrospective

Implemented `SPRT-63` end-to-end in this repository with TDD and frontend/browser quality gates. The app now includes an authenticated `/routine` route with a dual-mode routine editor (`Visual`, `DSL`) and dual-path workflow (`Strength`, `Endurance`). DSL parsing/validation is deterministic, invalid DSL preserves last valid visual state, and supported fields round-trip between visual and DSL workflows without loss. Persona-based desktop/mobile verification is complete for all profiles in `user_profiles`, required evidence artifacts were refreshed, and `make all` passes.

## Context and Orientation

Current frontend routes include `/`, `/login`, `/today`, and `/calendar` in `frontend/src/app`. There is no dedicated routine-creation page, no dual-mode editor, and no routine DSL parser module in this repository.

Relevant existing modules:

- `frontend/src/features/exercise-picker/state.ts`: deterministic fuzzy search + routine draft helpers for strength exercises.
- `frontend/src/features/exercise-picker/api.ts`: catalog loader for `/api/exercises`.
- `frontend/src/features/auth/*`: authentication/session infrastructure already enforced by `frontend/src/middleware.ts`.
- `frontend/tests/unit/*.test.ts[x]`: Vitest tests for server-rendered routes and client components.

In this plan, “no-loss updates” means that supported routine fields edited in one mode (`Visual` or `DSL`) remain present and equivalent when moving to the other mode and back.

## Plan of Work

1. Add failing tests first (red phase):

   - Introduce a new routine-flow component test suite that verifies:
     - strength + endurance entry paths are both available,
     - mode switching works without crashes,
     - visual-to-DSL and DSL-to-visual synchronization for supported fields,
     - invalid DSL surfaces inline actionable validation and preserves last valid state.
   - Add DSL unit tests for parser/serializer round-trip and structured error reporting.

2. Implement routine domain types and deterministic DSL helpers:

   - Create `frontend/src/features/routine/types.ts` for routine models.
   - Create `frontend/src/features/routine/routine-dsl.ts` with:
     - stable JSON serializer,
     - parser + schema validation returning explicit error messages,
     - synchronization helper(s) used by UI and tests.

3. Implement routine creation feature UI:

   - Create `frontend/src/features/routine/components/routine-creation-flow.tsx` as a client component.
   - Include:
     - entry path toggle (`Strength`, `Endurance`),
     - mode tabs (`Visual`, `DSL`) inspired by Aceternity Tabs,
     - visual strength editor with fuzzy search/add/remove (using existing exercise picker state helpers),
     - visual endurance interval editor (add/remove/update interval blocks),
     - DSL editor textarea with inline validation panel,
     - deterministic parity preview payload for debugging hooks.

4. Add route and navigation:

   - Create `frontend/src/app/routine/page.tsx` to render the routine flow.
   - Add primary navigation affordance from home/today/calendar to `/routine`.

5. Browser verification and documentation updates:

   - Run `agent-browser` + `chrome-devtools-mcp` checks on changed screens.
   - Execute persona walkthroughs for all profiles in `user_profiles` on desktop/mobile and refresh required screenshot artifacts in `frontend/tests/ui-evidence/`.
   - Update `specs/001-define-sportolo-v1/checklists/ui-browser-verification.md` to reflect route coverage and evidence.

6. Validate, package, and deliver:

   - Run targeted frontend tests, then `make all` from repo root.
   - Commit once with `SPRT-63` reference, push branch, open MR.

## Acceptance Criteria

- Routine flow supports both strength and endurance entry paths.
- Users can switch seamlessly between visual builder and DSL advanced mode.
- DSL and UI state remain synchronized for supported routine fields across mode switches.
- Validation feedback is inline and actionable when DSL content is invalid.
- Automated tests cover mode switching and no-loss update behavior.
- Changed screens are browser-verified with persona coverage (desktop + mobile) and evidence artifacts updated.
- `make all` passes from repository root.

## Risks and Edge Cases to Test

- DSL parsing failure after partial edits: invalid JSON or wrong field types should not wipe valid visual state.
- Path-switch persistence: switching `Strength` <-> `Endurance` should preserve both path datasets.
- No-op DSL edits: formatting-only edits should not create spurious state churn.
- Duplicate or empty strength exercise entries: ensure deterministic handling and safe rendering.
- Endurance interval bounds: zero/negative duration or missing targets should produce actionable validation.
- Rapid mode/path toggles: final rendered state should remain deterministic.
- Mobile viewport behavior: controls remain reachable and mode/path toggles do not overflow.

## Concrete Steps

Run all commands from `/Users/bhoranyi/Personal/sportolo2`.

1. Set Linear state and comment with execution plan.

    (Linear MCP) update `SPRT-63` state to `In Progress`
    (Linear MCP) add comment containing plan + acceptance criteria

2. Add failing tests first.

    pnpm --dir frontend test -- routine

3. Implement feature files.

    frontend/src/features/routine/types.ts
    frontend/src/features/routine/routine-dsl.ts
    frontend/src/features/routine/components/routine-creation-flow.tsx
    frontend/src/app/routine/page.tsx

4. Update navigation and docs.

    frontend/src/app/page.tsx
    frontend/src/app/today/page.tsx
    frontend/src/app/calendar/page.tsx
    specs/001-define-sportolo-v1/checklists/ui-browser-verification.md

5. Run targeted + full quality gates.

    pnpm --dir frontend test -- routine
    make all

6. Browser/persona verification and evidence artifacts.

    pnpm --dir frontend dev
    (agent-browser + chrome-devtools-mcp walkthroughs)

7. Ship branch.

    git add <files>
    git commit -m "SPRT-63 implement routine creation flow with DSL/visual parity"
    git push -u origin feature/sprt-63
    gh pr create --fill --base main --head feature/sprt-63

## Validation and Acceptance

A valid implementation must provide proof in this order:

1. Red-to-green: routine tests fail before implementation and pass after.
2. Behavioral proof: `/routine` supports both paths, both modes, state synchronization, and inline DSL validation.
3. Browser proof: desktop/mobile screenshots updated for all personas listed in `user_profiles`.
4. Gate proof: `make all` passes from repo root.

## Idempotence and Recovery

All planned edits are additive and rerunnable. If DSL parsing logic introduces regressions, keep parser pure and restore behavior through tests before touching UI wiring. If browser evidence capture fails for a specific persona, rerun only that persona flow and replace the corresponding artifact file. Do not modify unrelated working-tree files (`AGENTS.md`, `scripts/ralph.py`).

## Artifacts and Notes

Expected artifacts for this issue:

- New routine feature module files under `frontend/src/features/routine/`.
- New route file `frontend/src/app/routine/page.tsx`.
- New routine unit/component tests under `frontend/tests/unit/`.
- Updated persona screenshots in `frontend/tests/ui-evidence/`.
- Updated checklist references in `specs/001-define-sportolo-v1/checklists/ui-browser-verification.md`.
- Linear comment containing plan and acceptance criteria.

## Interfaces and Dependencies

Expected interfaces at completion:

- `parseRoutineDsl(input: string): { ok: true; value: RoutineDraft } | { ok: false; errors: string[] }`
- `serializeRoutineDsl(routine: RoutineDraft): string`
- `RoutineCreationFlow` React component exposing deterministic dual-mode interactions
- `/routine` server route rendering routine flow for authenticated users

Dependencies:

- Existing `frontend/src/features/exercise-picker/state.ts` fuzzy search/ranking helpers
- Existing `frontend/src/features/exercise-picker/api.ts` catalog loading path
- Existing auth middleware/session flow for protected routes
- Existing Vitest + Testing Library stack for unit/component tests

Change note: Initial ExecPlan authored before implementation to satisfy `SPRT-63` workflow requirements (plan first, acceptance criteria first, risks first).
Change note: Updated living sections after implementation, browser/persona verification, and `make all` completion so a stateless contributor can resume from current delivery state.
