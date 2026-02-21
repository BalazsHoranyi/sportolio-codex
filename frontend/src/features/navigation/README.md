# Authenticated Navigation Shell

The authenticated web experience uses a shared Nodus-inspired shell defined in `frontend/src/components/navigation/authenticated-app-shell.tsx`.

## Shadcn-first control primitives

Interactive controls in authenticated route shells should be composed from shared primitives in `frontend/src/components/ui/`:

- `Button` (`frontend/src/components/ui/button.tsx`) for nav links, CTAs, and form actions.
- `Badge` (`frontend/src/components/ui/badge.tsx`) for status pills.

Use route-local custom controls only when a matching shared primitive does not exist.

## Top-level routes

The shell enforces focused, single-purpose routes:

- `Today` (`/today`): daily readiness and execution context.
- `Calendar` (`/calendar`): schedule and audit timeline context.
- `Planner` (`/planner`): cycle planning and block design context.
- `Analytics` (`/analytics`): trend insight and adaptation-signal context.
- `Settings` (`/settings`): account and app preference context.

`/` reuses the `Today` page implementation so post-login defaults stay aligned with the same route objective.

## Bento layout contract

The authenticated top-level routes use a shared Bento layout pattern built from `frontend/src/components/ui/bento-grid.tsx`.

- `/today` root landmark: `aria-label="Today bento layout"`
- `/calendar` root landmark: `aria-label="Calendar bento layout"`
- `/planner` root landmark: `aria-label="Planner bento layout"`
- `/planner` inner workflow landmark: `aria-label="Planner bento workspace"`
- `/analytics` root landmark: `aria-label="Analytics bento layout"`
- `/settings` root landmark: `aria-label="Settings bento layout"`

These landmarks are test-backed in route unit tests and used during browser verification for responsive checks.

## Shared layout token contract

Shared layout primitives are enforced through global tokens in `frontend/src/app/globals.css`:

- `--layout-shell-max-width`
- `--layout-shell-gap`
- `--layout-bento-gap`

These tokens drive shell and bento spacing so dashboard, calendar, and planning flow surfaces stay consistent as routes evolve.

## Active state contract

Top-level links use `aria-current="page"` for the active destination. This is applied in both desktop and mobile navigation render paths.

## Auth behavior

All top-level routes above remain protected by `frontend/src/middleware.ts` and redirect unauthenticated users to `/login?next=<requested-route>`.

## Extension guidance

When adding a new authenticated top-level route:

1. Add the route to `APP_NAV_ITEMS` in `frontend/src/components/navigation/nav-config.ts`.
2. Wrap the page content with `AuthenticatedAppShell`.
3. Compose route modules with `BentoGrid`/`BentoGridItem` and expose a route-specific Bento landmark label.
4. Use `Button` and `Badge` primitives for shell-level controls and route CTAs where applicable.
5. Provide a route-specific `title` and `description` that keeps the page single-purpose.
6. Add/update unit tests for route rendering, primitive adoption, Bento landmark presence, and nav active-state behavior.
