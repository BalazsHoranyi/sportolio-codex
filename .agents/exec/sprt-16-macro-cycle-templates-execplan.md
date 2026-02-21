# SPRT-16 Macro-Cycle Generation from Goals/Events with Hybrid Templates

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document follows `.agents/exec/PLANS.md` and must be maintained in accordance with that file.

## Purpose / Big Picture

After this change, authenticated users can start a new cycle in `/planner` by selecting a hybrid profile template and generating an editable macro plan anchored to one or more goals and/or events. Users can choose between `powerlifting + 5k`, `triathlon + strength`, and `strength + cycling`, then modify generated plan details without being locked to template defaults. The planner will also recalculate and display an updated macro timeline whenever event dates change, so timeline anchors remain accurate as users adjust race/meet dates.

## Progress

- [x] (2026-02-21 15:10Z) Selected one issue only: `SPRT-16` (`Urgent`, sportolo, non-mobile scope).
- [x] (2026-02-21 15:10Z) Confirmed no sportolo tickets are currently `In Progress`; selected highest-priority eligible backlog item.
- [x] (2026-02-21 15:10Z) Reviewed existing planner implementation (`SPRT-62`) and identified integration points in `cycle-creation-flow.tsx`, `types.ts`, and planner tests.
- [x] (2026-02-21 15:10Z) Created branch `feature/sprt-16`.
- [x] (2026-02-21 15:11Z) Moved Linear issue `SPRT-16` to `In Progress` and posted plan + acceptance criteria comment.
- [x] (2026-02-21 15:13Z) Added failing tests first for template application, goal/event anchored macro timeline generation, and dynamic timeline updates when event dates change.
- [x] (2026-02-21 15:16Z) Implemented template catalog + macro generation engine with deterministic defaults for all three required templates.
- [x] (2026-02-21 15:16Z) Integrated template selection/application into macro step, including editable post-template fields and live macro timeline preview.
- [x] (2026-02-21 15:16Z) Updated planner feature documentation for macro templates and timeline anchor semantics.
- [x] (2026-02-21 15:27Z) Completed validation (`pnpm --dir frontend test -- planner`, `make all`).
- [x] (2026-02-21 15:27Z) Performed browser verification across all personas in `user_profiles` on desktop and mobile, including template application checks on `/planner`.
- [ ] Commit once with Linear key, push branch, and open PR.

## Surprises & Discoveries

- Observation: `/planner` flow already exists and is test-covered from prior issue `SPRT-62`, so `SPRT-16` should be delivered as additive macro-generation behavior rather than a new route.
  Evidence: `frontend/src/features/planner/components/cycle-creation-flow.tsx` and `frontend/tests/unit/planner-cycle-creation-flow.test.tsx`.

- Observation: Current planner uses local draft persistence and no backend macro-generation endpoint, so this issue must provide deterministic client-side generation logic without stubs.
  Evidence: `frontend/src/features/planner/draft-storage.ts` and absence of planner generation API routes under `backend/src/sportolo/api/routes`.

- Observation: Existing draft starts with a placeholder blank goal, so template generation needs meaningful-entry detection to avoid keeping empty seed data.
  Evidence: `createInitialPlannerDraft()` in `frontend/src/features/planner/types.ts` initializes one empty goal row by default.

- Observation: Browser automation can set `input[type=date]` DOM values without reliably triggering React-controlled `onChange`, so persona verification relied on visible template apply outcomes while timeline update behavior remained covered by unit tests.
  Evidence: `chrome-devtools` snapshot showed updated DOM date value while anchor summary remained unchanged until controlled-event paths were used.

## Decision Log

- Decision: Implement `SPRT-16` in the existing planner web flow as a deterministic client-side template generator with live timeline recalculation.
  Rationale: Current repository architecture supports this flow today; backend generation endpoints are not present and introducing stubs would violate production-quality expectations.
  Date/Author: 2026-02-21 / Codex

- Decision: Keep template instantiation explicitly editable by writing generated values into normal planner draft fields, never storing immutable template locks.
  Rationale: The issue acceptance criteria require template output to remain editable and not hard-locked.
  Date/Author: 2026-02-21 / Codex

- Decision: Use an explicit auto-sync toggle for macro dates so event/goal anchor updates can drive timeline changes without forcing date locks.
  Rationale: This preserves required timeline update behavior while still allowing manual date edits after template application.
  Date/Author: 2026-02-21 / Codex

## Outcomes & Retrospective

Implementation and validation are complete for `SPRT-16`: macro template generation, timeline preview, auto-sync behavior, tests, and documentation are all in place. Remaining work is release mechanics only (single commit, push, PR creation).

## Context and Orientation

The planner user interface is implemented in `frontend/src/features/planner/components/cycle-creation-flow.tsx` and rendered from `frontend/src/app/planner/page.tsx`. Planner domain types live in `frontend/src/features/planner/types.ts`. Advisory logic and deterministic review helpers already exist in `frontend/src/features/planner/advisory.ts`, `frontend/src/features/planner/mesocycle-strategy.ts`, and `frontend/src/features/planner/review-muscle-summary.ts`.

In this repository, “macro cycle timeline” means the top-level plan window represented by `startDate`, `endDate`, and the mesocycle sequence the user configures. “Anchored to goals/events” means generated timeline values are derived from user-entered goal target dates and event dates, with deterministic handling for missing anchors.

## Plan of Work

First, add tests in red phase. Create unit tests for a new macro template engine that validate deterministic output for all required templates and timeline anchoring from goal/event dates. Add component tests that confirm template application pre-fills planner draft fields, remains editable after application, and updates timeline projections when event dates are changed.

Second, implement a new planner macro template module under `frontend/src/features/planner/` that defines the three required templates and exposes pure functions for generation. The generation path will consume current draft goals/events and return merged plan updates (`planName`, date window, goals/events normalization when needed, mesocycles, and microcycle starter structure).

Third, integrate the template module into the macro step UI in `cycle-creation-flow.tsx`. Add a template picker with clear copy, an apply action, and a macro timeline preview panel that reflects current goal/event anchors. Ensure users can edit generated goals, events, dates, and mesocycles directly after template application.

Fourth, wire live timeline update behavior so event-date edits trigger immediate recomputation of the macro timeline preview and any dependent end-date defaults. Keep the logic deterministic and side-effect free.

Fifth, update planner documentation to describe template behavior, anchor precedence rules, and editable instantiation semantics.

Finally, run planner-focused tests, run full `make all`, perform persona browser validation on desktop/mobile, and then finish with one commit, push, and PR.

## Acceptance Criteria

- Users can create macro cycles anchored to one or more goals/events from `/planner`.
- Templates exist for `powerlifting + 5k`, `triathlon + strength`, and `strength + cycling`.
- Template-generated plans are fully editable after instantiation (no hard locks).
- Macro timeline preview and derived window update when event dates move.
- Planner flow supports net-new plan creation with no import dependency.
- Tests cover template generation determinism, application/editability, and timeline update behavior.
- Browser verification confirms usable desktop/mobile behavior after UI changes.
- `make all` passes.

## Risks and Edge Cases to Test

- Only goals present, only events present, and both present: timeline anchor precedence remains deterministic.
- Multiple goals/events with mixed dates: earliest/latest anchor selection is stable and explainable.
- Event date moved outside current window: timeline recomputes safely and keeps valid ordering.
- Invalid or missing dates during editing: generator and preview avoid crashes and preserve user-entered data.
- Reapplying a different template after manual edits: behavior is explicit and not partially stale.
- Draft persistence with template metadata across reload: no corruption or incompatible schema failures.
- Mobile macro step layout with template cards and timeline summary remains readable and actionable.

## Concrete Steps

Run from `/Users/bhoranyi/Personal/sportolo2`.

1. Move `SPRT-16` to `In Progress` and post plan + acceptance criteria in Linear.
2. Add failing tests first:
   - `frontend/tests/unit/planner-macro-template.test.ts`
   - `frontend/tests/unit/planner-cycle-creation-flow.test.tsx` (new test cases)
3. Implement feature code:
   - `frontend/src/features/planner/macro-templates.ts` (new)
   - `frontend/src/features/planner/types.ts` (template selection/type additions if needed)
   - `frontend/src/features/planner/components/cycle-creation-flow.tsx` (macro UI + live timeline behavior)
4. Update docs:
   - `frontend/src/features/planner/README.md`
5. Validate:
   - `pnpm --dir frontend test -- planner`
   - `make all`
6. Browser verification with personas across desktop/mobile.
7. Ship:
   - `git add ...`
   - `git commit -m "SPRT-16 implement macro-cycle generation templates"`
   - `git push -u origin feature/sprt-16`
   - `gh pr create --fill --base main --head feature/sprt-16`

## Validation and Acceptance

The feature is accepted when:

1. New template and macro timeline tests fail before implementation and pass after.
2. In `/planner`, selecting and applying each template populates a complete editable starting plan.
3. Changing event dates visibly updates macro timeline output without requiring page reload.
4. Users can continue creating a brand-new plan from scratch without import flows.
5. `make all` completes successfully from repository root.
6. Browser verification covers persona flows and both desktop/mobile form factors.

## Idempotence and Recovery

All changes are additive and safe to rerun. If template draft persistence schema evolves, loader logic must continue to read old drafts by applying defaults for missing keys. If a template apply action produces invalid dates due to partial user input, recover by clamping to a deterministic minimum valid window and surfacing an inline advisory instead of failing silently.

## Artifacts and Notes

Expected implementation artifacts:

- New macro template engine file and unit tests.
- Updated cycle creation flow UI with template apply and timeline preview.
- Updated planner README documentation.
- Linear comment with plan and acceptance criteria.
- Passing `make all` output and browser verification evidence.

## Interfaces and Dependencies

Expected interfaces at completion:

- `getMacroTemplates(): PlannerMacroTemplateDefinition[]`
- `applyMacroTemplate(input: ApplyMacroTemplateInput): PlannerDraft`
- `buildMacroTimelinePreview(draft: PlannerDraft): MacroTimelinePreview`

Dependencies and constraints:

- Use existing Next.js/React client component architecture in `frontend/src/features/planner`.
- Keep logic deterministic and pure where possible for stable unit tests.
- Follow existing planner state management pattern (`useState`, derived `useMemo`, pure helpers).
- Keep output compatible with existing draft storage migration behavior.

Change note: Updated progress/discoveries/decisions after completing TDD red-green implementation of macro templates, auto-sync timeline behavior, and planner documentation updates.
