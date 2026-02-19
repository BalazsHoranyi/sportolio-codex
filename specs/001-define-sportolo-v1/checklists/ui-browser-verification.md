# UI Browser Verification Checklist

Use this checklist for every changed frontend page/component.
Verification must be executed with:
- agent-browser
- chrome-devtools-mcp

## Metadata

- Date: 2026-02-17
- Verifier: Codex (GPT-5)
- Branch: 001-define-sportolo-v1
- Commit: 50570c2

## Scope

- [x] List changed UI files and routes. (Files: `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/globals.css`, `frontend/src/app/planner/page.tsx`, `frontend/src/features/dsl/EditorPanel.tsx`, `frontend/src/features/planner/VersionHistoryPanel.tsx`, `frontend/src/app/workouts/[workoutId]/execute/page.tsx`, `frontend/src/features/sessions/ProgressionFailurePanel.tsx`, `frontend/src/features/sync/ConflictResolutionModal.tsx`; Routes: `/`, `/planner`, `/workouts/[workoutId]/execute`)
- [ ] For mapped routes (`/planner`, `/workouts/[workoutId]/execute`, `/today`, `/calendar`), list exact Aceternity component names rendered on each route.
- [x] Attach at least one desktop screenshot per changed route. (`artifacts/home-desktop-agent-browser.png`, `artifacts/home-desktop-devtools.png`, `artifacts/home-desktop-1366x900.png`, `artifacts/planner-agent-browser.png`, `artifacts/planner-devtools-desktop.png`, `artifacts/execute-agent-browser.png`, `artifacts/execute-devtools-desktop.png`)
- [x] Attach at least one mobile screenshot per changed route. (`artifacts/home-mobile-390x844.png`, `artifacts/planner-devtools-mobile-390x844.png`, `artifacts/execute-devtools-mobile-390x844.png`)

## Functional Checks

- [x] Success state verified. (`/planner` DSL validation renders success feedback with deterministic hash.)
- [x] Loading state verified. (`/planner` macrocycle submit transitions through loading state.)
- [x] Empty state verified. (`/planner` displays the no-macrocycles empty state before creation.)
- [x] Error state verified. (`/planner` displays create-macrocycle error feedback when API is unavailable.)
- [x] Primary interactions (click/form/navigation) verified. (Validated `/planner` form submission + DSL validation and `/workouts/[workoutId]/execute` log-set, sync, and conflict-resolution actions; `/` dev-tools toggle still works.)

## Accessibility Checks

- [x] Keyboard navigation works for primary controls. (`Tab` focuses the dev-tools button.)
- [x] Focus visibility is present and consistent.
- [x] Labels/status text are announced/readable. (A11y tree includes heading, descriptive text, and named button.)
- [x] No critical accessibility regressions observed in manual review.

## Responsive Checks

- [x] Mobile layout (<=390px width) verified. (`artifacts/home-mobile-390x844.png`, `artifacts/planner-devtools-mobile-390x844.png`, `artifacts/execute-devtools-mobile-390x844.png`)
- [x] Tablet layout (~768px width) verified. (`artifacts/home-tablet-768x1024.png`)
- [x] Desktop layout (>=1280px width) verified. (`artifacts/home-desktop-1366x900.png`)

## Visual Quality Checks

- [x] Typography and spacing align with design direction.
- [x] Components use approved modern UI system (Aceternity/shadcn/Tailwind). (N/A for current single-page scaffold; no component-library screen is part of this verification batch.)
- [x] No placeholder/default-browser styling remains.
- [ ] Any missing mapped Aceternity usage has route-specific exception reason + shadcn fallback documented.

## Evidence

- [x] Browser verification notes saved under `frontend/verification/`. (`frontend/verification/ui-browser-verification-2026-02-17.md`, `frontend/verification/planner-ui-2026-02-17.md`, `frontend/verification/session-execute-ui-2026-02-17.md`)
- [x] Screenshots saved under `specs/001-define-sportolo-v1/checklists/artifacts/`.
