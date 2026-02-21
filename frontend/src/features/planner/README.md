# Planner Feature

The planner flow (`/planner`) is a four-step authenticated wizard for macro, mesocycle, microcycle, and review.

## Macro Templates and Timeline Anchors

`macro-templates.ts` provides deterministic net-new plan generation from
profile templates:

- `powerlifting + 5k`
- `triathlon + strength`
- `strength + cycling`

Each template applies:

- default plan name + starter goals/events when the current draft has no
  meaningful anchors
- mesocycle sequence and duration allocation
- starter microcycle workouts
- macro window recommendation derived from goal/event dates

`buildMacroTimelinePreview` computes the recommended macro timeline from anchor
dates and template lead/cooldown settings. In the planner UI, enabling
auto-sync keeps `startDate`/`endDate` aligned to this recommendation whenever
goal or event dates move. Users can disable auto-sync and edit dates manually;
template values are never locked.

## Mesocycle Strategy Engine

`mesocycle-strategy.ts` provides deterministic derivations for each mesocycle strategy:

- `block`: validates phase allocation and derives accumulation/intensification/deload week projections.
- `dup`: validates weekly session allocation and derives week-by-week intensity wave output.
- `linear`: validates progression/peak settings and derives load progression and peak week output.

For each mesocycle, the engine returns:

- strategy validation errors
- expected modality emphasis (strength/endurance/recovery percentages)
- projected week sequence used for microcycle reflow preview

`buildMicrocycleReflowProjection` flattens per-mesocycle week projections into an ordered cross-plan preview without mutating user-entered workouts.

## Strategy Switching and Persistence

Each mesocycle stores strategy parameters for all periodization modes (`block`, `dup`, `linear`). Changing the active periodization only changes visible controls; hidden mode values remain preserved for later switches.

Planner draft persistence in `draft-storage.ts` supports migration from legacy payloads that predate:

- events collection
- mesocycle strategy configuration

## Review Muscle Summary

`review-muscle-summary.ts` derives a deterministic microcycle muscle summary from
planner workout drafts (`label`, `type`, `intensity`, `day`) without backend
round-trips.

The review step uses this model to render:

- microcycle-level muscle map + total usage
- high-overlap day warnings (visual/advisory only)
- drill-down anchors into routine and exercise contribution detail lists

Additions, removals, and day moves in the microcycle step immediately refresh
review outputs through React state recomputation.
