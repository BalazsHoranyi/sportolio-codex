# sportolo-backend

Backend service modules for Sportolo.

## Today accumulation API

`SPRT-36` introduces a deterministic boundary-compute endpoint:

- `POST /v1/athletes/{athleteId}/fatigue/today/accumulation`

Request payload includes `asOf`, `timezone` (IANA), optional `sleepEvents`, and session records with axis contributions.
Payload also accepts:

- `combinedScoreContext.workoutType`: `hybrid | strength | endurance` (default `hybrid`).
- `systemCapacity`: `sleep` (optional, defaults to deterministic normal value `3`), `fuel` (1-5), `stress` (1-5).

Behavior:

- Includes only sessions where `state == completed` and `endedAt < boundaryEnd`.
- Resolves rollover boundary from latest same-local-day sleep event at or before `asOf`.
- Falls back to user-local midnight when no qualifying sleep event exists.
- Returns explicit boundary metadata: `boundaryStart`, `boundaryEnd`, `boundarySource`, `timezone`.
- Computes `combinedScore` in strict order: weighted recruitment/metabolic/mechanical blend -> neural gate -> system-capacity gate.
- Applies workout-type weight modifiers with renormalization so effective weights remain deterministic and sum to `1.0`.
- Keeps interpretation text fixed to `probability next hard session degrades adaptation`.
- Emits debug fields for `baseWeights`, `modifierWeights`, and `effectiveWeights` plus gate-stage scores.

## Exercise catalog API

`SPRT-72` introduces deterministic exercise catalog generation and filtering:

- `GET /v1/exercises`

Query parameters:

- `scope`: `global | user | all` (`user` returns an empty list in this implementation slice).
- `search`: case-insensitive canonical-name and alias matching.
- `equipment`: normalized equipment filter (`ez_bar`, `landmine`, `rings`, etc.).
- `muscle`: normalized region tag filter (`core`, `quads`, etc.).

Behavior:

- Canonical names are not forced into equipment-prefixed format (`Split Squat`, `Good Morning`, `Pallof Press`).
- Legacy equipment-prefixed aliases are preserved for backwards-compatible lookup (`Barbell Split Squat` resolves to `Split Squat`).
- Expanded equipment labels/abbreviations include `landmine`, `ez_bar`, `medicine_ball`, `preacher_bench`, `ghd`, `bosu`, `stability_ball`, and `rings`.
- Responses are deterministic for identical query inputs.
