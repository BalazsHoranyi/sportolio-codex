# Planner Feature

The planner flow (`/planner`) is a four-step authenticated wizard for macro, mesocycle, microcycle, and review.

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
