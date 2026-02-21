# sportolo-backend

Backend service modules for Sportolo.

## Today accumulation API

`SPRT-36` introduces a deterministic boundary-compute endpoint:

- `POST /v1/athletes/{athleteId}/fatigue/today/accumulation`

Request payload includes `asOf`, `timezone` (IANA), optional `sleepEvents`, and session records with axis contributions.

Behavior:

- Includes only sessions where `state == completed` and `endedAt < boundaryEnd`.
- Resolves rollover boundary from latest same-local-day sleep event at or before `asOf`.
- Falls back to user-local midnight when no qualifying sleep event exists.
- Returns explicit boundary metadata: `boundaryStart`, `boundaryEnd`, `boundarySource`, `timezone`.
