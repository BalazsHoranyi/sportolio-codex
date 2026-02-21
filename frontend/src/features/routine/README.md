# Routine Creation Flow

The routine builder supports two synchronized modes:

- `Visual` mode for guided editing.
- `DSL` mode for direct JSON edits.

## Strength model

The strength path uses explicit advanced structures:

- `strength.variables[]` for custom expressions reused in logic.
- `strength.blocks[]` for looped block execution (`repeatCount`) and optional block-level `condition`.
- `block.exercises[]` for per-instance exercise entries (`instanceId`), conditionals, and selected equipment.
- `exercise.sets[]` for deterministic set controls:
  - `reps`
  - `restSeconds`
  - `timerSeconds`
  - optional `progression { strategy, value }`

Supported progression strategies:

- `linear_add_load`
- `linear_add_reps`
- `percentage_wave`

## Catalog and filtering

Strength search supports:

- typo-tolerant fuzzy matching against canonical names and aliases
- equipment filtering
- muscle filtering

When `/api/exercises` cannot reach the backend, it falls back to a deterministic
seeded catalog snapshot (`>=1000` entries) so authoring remains usable offline.

## Backward compatibility

Legacy DSL payloads that only include `strength.exercises[]` are still accepted.
They are deterministically hydrated into one imported block (`repeatCount: 1`) with
an initial default set for each exercise.

## Validation behavior

- Invalid DSL edits show inline validation errors.
- The last valid visual state is preserved until DSL becomes valid again.

## Reordering behavior

Strength exercise order inside a block can be changed using:

- drag and drop
- keyboard/button controls (`Move up` / `Move down`)

Reordering is deterministic and structure-safe (no out-of-bounds moves).

## Muscle-map visibility

Visual strength editing includes deterministic muscle-map rollups rendered via
`react-muscle-highlighter` for:

- selected exercise-level emphasis
- routine-level aggregate emphasis
- microcycle draft aggregate emphasis

## Set removal guardrail

Each exercise must keep at least one set. The last remaining set cannot be
removed, which prevents accidental destructive resets.
