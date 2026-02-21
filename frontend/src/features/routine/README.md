# Routine Creation Flow

The routine builder supports two synchronized modes:

- `Visual` mode for guided editing.
- `DSL` mode for direct JSON edits.

## Strength model

The strength path uses explicit advanced structures:

- `strength.variables[]` for custom expressions reused in logic.
- `strength.blocks[]` for looped block execution (`repeatCount`) and optional block-level `condition`.
- `block.exercises[]` for exercise-level `condition` and selected equipment.
- `exercise.sets[]` for deterministic set controls:
  - `reps`
  - `restSeconds`
  - `timerSeconds`
  - optional `progression { strategy, value }`

Supported progression strategies:

- `linear_add_load`
- `linear_add_reps`
- `percentage_wave`

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
