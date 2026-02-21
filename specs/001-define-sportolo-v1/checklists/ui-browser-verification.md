# UI Browser Verification

- Date: February 21, 2026
- Routes: `/login`, `/`, `/today`, and `/calendar?sessionId=...`
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

- Diego (competitive triathlete): logged in, opened `/today`, verified neural/metabolic/mechanical gauges, recruitment badge, and chip navigation into calendar session focus.
- Evan (powerlifter with minimal cardio): validated `/today` score/capacity separation and confirmed why-this links do not show excluded sessions.
- Hybrid athlete (600lb DL + 4 W/kg target): validated threshold-aware combined score presentation and contributor chip navigation from `/today` to `/calendar?sessionId=...`.
- Lena (busy hybrid generalist): validated mobile readability and tap targets for gauges/cards/chips and the calendar session-focus card.
- Nora (masters endurance + longevity strength): validated clear boundary source/window messaging and system-capacity indicator on desktop/mobile, then session-focus context on calendar.
- Priya (marathoner adding strength): validated full login -> `/today` -> chip click -> `/calendar` session-focus flow.

## Result

- Today dashboard renders correctly in browser with axis gauges, recruitment badge, separated combined score vs capacity indicator, and filtered why-this chips.
- Calendar now renders explicit session-focus context when opened from a why-this chip (`/calendar?sessionId=...`), including contributor label and session id trace.
- Persona desktop/mobile runs completed for all profiles in `user_profiles`.
- Required evidence artifact set remains complete and linked in this checklist.
