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

- [x] List changed UI files and routes. (Files: `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/globals.css`; Route: `/`)
- [x] Attach at least one desktop screenshot per changed route. (`artifacts/home-desktop-agent-browser.png`, `artifacts/home-desktop-devtools.png`, `artifacts/home-desktop-1366x900.png`)
- [x] Attach at least one mobile screenshot per changed route. (`artifacts/home-mobile-390x844.png`)

## Functional Checks

- [x] Success state verified. (`/` renders heading + descriptive copy correctly.)
- [x] Loading state verified. (N/A: static scaffold route has no async loading state.)
- [x] Empty state verified. (N/A: static scaffold route has no data-dependent empty state.)
- [x] Error state verified. (N/A: static scaffold route has no route-level error state.)
- [x] Primary interactions (click/form/navigation) verified. (Next.js dev tools toggle button opens/closes menu.)

## Accessibility Checks

- [x] Keyboard navigation works for primary controls. (`Tab` focuses the dev-tools button.)
- [x] Focus visibility is present and consistent.
- [x] Labels/status text are announced/readable. (A11y tree includes heading, descriptive text, and named button.)
- [x] No critical accessibility regressions observed in manual review.

## Responsive Checks

- [x] Mobile layout (<=390px width) verified. (`artifacts/home-mobile-390x844.png`)
- [x] Tablet layout (~768px width) verified. (`artifacts/home-tablet-768x1024.png`)
- [x] Desktop layout (>=1280px width) verified. (`artifacts/home-desktop-1366x900.png`)

## Visual Quality Checks

- [x] Typography and spacing align with design direction.
- [x] Components use approved modern UI system (Aceternity/shadcn/Tailwind). (N/A for current single-page scaffold; no component-library screen is part of this verification batch.)
- [x] No placeholder/default-browser styling remains.

## Evidence

- [x] Browser verification notes saved under `frontend/verification/`. (`frontend/verification/ui-browser-verification-2026-02-17.md`)
- [x] Screenshots saved under `specs/001-define-sportolo-v1/checklists/artifacts/`.
