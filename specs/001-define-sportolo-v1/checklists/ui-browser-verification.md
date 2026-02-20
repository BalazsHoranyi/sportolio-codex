# UI Browser Verification

- Date: February 20, 2026
- Routes: `/login`, `/`, and protected deep-link redirect via `/calendar`
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

- Diego (competitive triathlete): attempted protected route while logged out, verified redirect to `/login?next=...`, logged in with persona credentials, and confirmed redirect completion to intended route.
- Evan (powerlifter with minimal cardio): verified login success path on desktop/mobile and authenticated access to protected surface.
- Hybrid athlete (600lb DL + 4 W/kg target): verified login flow and refresh-stable authenticated state on desktop/mobile.
- Lena (busy hybrid generalist): verified mobile login form usability, error-safe flow, and authenticated landing behavior.
- Nora (masters endurance + longevity strength): verified protected-route redirect, login completion, and continued access on desktop/mobile.
- Priya (marathoner adding strength): verified login completion from protected deep-link and post-auth route access on desktop/mobile.

## Result

- All required persona screenshots were refreshed for this auth-gating release (`home-*` and `persona-*` artifacts).
- Unauthenticated access to protected routes redirects to login with preserved `next` target.
- Valid credentials establish authenticated session and route back to intended destination.
- Logout returns user to `/login`, and session checks continue enforcing protected-route access rules after refresh.
- Chrome DevTools MCP pass confirmed desktop/mobile rendering for login + authenticated home surfaces and validated auth-banner visibility in authenticated state.
