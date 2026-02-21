# UI Browser Verification

- Date: February 21, 2026
- Routes: `/login?next=/calendar`, `/calendar`
- Browser tooling: `agent-browser` + `chrome-devtools-mcp`
- Devices: Desktop (1440px), Mobile (390px / iPhone 14)

## Evidence Artifacts

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

- Diego (competitive triathlete): moved a session to an occupied day, observed overlap block, used `Proceed anyway`, and reordered same-day sessions via keyboard controls on desktop/mobile.
- Evan (powerlifter with minimal cardio): verified deterministic slot ordering after overlap override and confirmed mutation log captures `workout_moved` override metadata on desktop/mobile.
- Hybrid athlete (600lb DL + 4 W/kg target): validated same-day reorder changes slot labels (`1`, `2`) without losing workout identity/history on desktop/mobile.
- Lena (busy hybrid generalist): confirmed validation banner actions (`Proceed anyway` / `Dismiss`) are readable and operable on mobile and desktop layouts.
- Nora (masters endurance + longevity strength): validated history counts increment after move + reorder and controls stay keyboard operable on desktop/mobile.
- Priya (marathoner adding strength): validated calendar recompute log includes reorder metadata and weekly audit visuals stay stable after reorder on desktop/mobile.

## Result

- `/calendar` now supports deterministic microcycle scheduler semantics for move, overlap validation, explicit override, and in-day reorder.
- Default overlap behavior blocks conflicting placement; explicit override applies the move and records `overrideApplied` metadata.
- Reorder actions update `sessionOrder`, mutation log entries (`workout_reordered`), and per-workout history counts without regressing weekly audit recompute behavior.
- Browser checks using `agent-browser` and `chrome-devtools-mcp` passed for all personas in `user_profiles` across desktop and mobile.
