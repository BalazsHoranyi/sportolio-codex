# UI Browser Verification

- Date: February 20, 2026
- Routes: `/login`, `/`, and protected deep-link redirect via `/calendar?week=2026-W08`
- Browser tooling: `agent-browser` + `chrome-devtools-mcp`
- Devices: Desktop (1440px), Mobile (390px)

## Evidence Artifacts

- home-desktop-after.png
- home-mobile-after.png
- persona-diego-desktop.png
- persona-diego-mobile.png
- persona-evan-desktop.png
- persona-evan-mobile.png
- persona-hybrid-desktop.png
- persona-hybrid-mobile.png
- persona-lena-desktop.png
- persona-lena-mobile.png
- persona-nora-desktop.png
- persona-nora-mobile.png
- persona-priya-desktop.png
- persona-priya-mobile.png

## Persona Coverage

- Diego (competitive triathlete): deep-linked to `/calendar?week=2026-W08` while logged out, redirected to login, signed in, returned to intended protected route, and logged out back to `/login`.
- Evan (powerlifter with minimal cardio): repeated desktop/mobile login and redirect flow with persona credentials, then verified logout protection.
- Hybrid athlete (600lb DL + 4 W/kg target): validated desktop/mobile protected-route login flow and post-login access.
- Lena (busy hybrid generalist): validated mobile-first login form usability, non-leaky invalid-credentials state, then successful login/logout.
- Nora (masters endurance + longevity strength): verified desktop/mobile redirect-to-login and return-to-intended-route behavior.
- Priya (marathoner adding strength): verified protected-route login completion and logout enforcement on desktop/mobile.

## Result

- All required persona screenshots were refreshed for this auth-gating release (`home-*` and `persona-*` artifacts), and each artifact now reflects real authenticated surfaces rather than 404 pages.
- Unauthenticated access to protected routes redirects to login with preserved `next` target.
- Valid credentials establish authenticated session and return users to the intended protected route (`/calendar?week=2026-W08` now resolves).
- Invalid credentials display the generic non-leaky error: `Invalid email or password.`
- Logout returns users to `/login`, and session checks continue enforcing protected-route access rules after refresh.
- Chrome DevTools MCP pass confirmed desktop/mobile rendering quality for the Aceternity-structured login screen and authenticated home/calendar surfaces.
- Removed misleading self-referential `Sign up` CTA from login and replaced it with a clear demo credential onboarding note.
- Marked social sign-in controls as disabled with explicit "coming soon" messaging to avoid dead-click UX.
