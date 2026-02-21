# Routine Creation Flow

The routine builder supports two synchronized modes:

- `Visual` mode for guided editing.
- `DSL` mode for human-readable text authoring.

The DSL parser accepts two formats:

- Human-friendly text DSL (default in the editor).
- JSON envelope (backward-compatible import path for internal/legacy payloads).

## Human DSL syntax (v2)

The editor uses a deterministic text grammar rooted by a required header:

```txt
routine "Routine Name" id:routine-id path:strength
references macro:null meso:null micro:null
```

`path` controls which authoring section is parsed (`strength` or `endurance`).

### Strength authoring

Supported constructs:

- Week/day headings: `# Week 1`, `## Day 1`
- Inline notes/comments before an exercise: `// Pause at bottom`
- Variable declarations: `@var training-max | Training Max = 0.9 * 1rm`
- Liftosaur-like exercise lines:
  - `Squat / 5x5 / progress: lp(5lb) / rest: 210s`
  - optional tokens: `timer`, `load`, `rpe`, `rir`, `if`, `id`, `instance`, `equip`, `regions`
- Explicit per-set declarations for non-uniform prescriptions:
  - `sets: [id=set-1,reps=5,rest=180,progress=linear_add_load(2.5); id=set-2,reps=8,rest=150]`

Progression directives support:

- `lp(...)` / `linear_add_load(...)`
- `reps(...)` / `linear_add_reps(...)`
- `wave(...)` / `percentage_wave(...)`

### Endurance authoring

Supported constructs:

- Intervals.icu-style block headings with optional repeat counts:
  - `Warmup`
  - `Main set 6x`
  - `Cooldown`
- Segment lines:
  - `- 20m 60% 90-100rpm`
  - `- 4m 100% 40-50rpm, power is less important than torque`
  - `- 5m recovery at 40%`

Targets support:

- `%` intensity (`power_watts` path)
- `pace:<value>`
- `hr:<value>`, `bpm:<value>`, or `<value>bpm`

Optional cadence and notes are preserved:

- `cadenceRangeRpm { min, max }`
- `note`

## JSON envelope (v2)

The routine DSL is versioned and uses a normalized root envelope:

- `dslVersion` (currently `"2.0"`; legacy payloads are normalized to this)
- `references` for planning lineage:
  - `macrocycleId`
  - `mesocycleId`
  - `microcycleId`
- routine payload (`routineId`, `routineName`, `path`, `strength`, `endurance`)

## Strength model

The strength path uses explicit advanced structures:

- `strength.variables[]` for custom expressions reused in logic.
- `strength.blocks[]` for looped block execution (`repeatCount`) and optional block-level `condition`.
- `block.exercises[]` for per-instance exercise entries (`instanceId`), conditionals, and selected equipment.
- `exercise.sets[]` for deterministic set controls:
  - `reps`
  - `restSeconds`
  - `timerSeconds`
  - optional `load` (`unit`: `kg` | `lb` | `percent_1rm`, `value` > 0)
  - optional `rpe` (1-10)
  - optional `rir` (0-10)
  - optional `progression { strategy, value }`

Supported progression strategies:

- `linear_add_load`
- `linear_add_reps`
- `percentage_wave`

## Endurance model

Endurance supports both:

- `endurance.intervals[]` (legacy + UI-friendly flat representation)
- `endurance.blocks[]` (v2 AST representation)

Each block contains:

- `blockId`, `label`, `repeatCount`
- `segments[]` with:
  - `segmentId`, `label`, `durationSeconds`
  - `target { type, value }` where type is `power_watts` | `pace` | `heart_rate`
  - optional `cadenceRangeRpm { min, max }`
  - optional `note`

When only one representation is provided, parser normalization derives the other
deterministically.

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

Legacy JSON-based authoring/integration flows remain supported via the JSON parser
path even though editor-first authoring is now human text DSL.

## Validation behavior

- Invalid DSL edits show inline validation errors.
- Human DSL errors include `Line` + `column` and a `Hint:` fix suggestion.
- JSON errors preserve actionable parse/schema messages.
- The last valid visual state is preserved until DSL becomes valid again.

## Edit history behavior

- Valid routine-model changes from either mode (Visual controls or valid DSL edits)
  are captured in a bounded undo/redo stack.
- Invalid DSL text edits are **not** added to history; they keep inline validation
  errors while preserving the last valid routine snapshot.
- Creating a new valid edit after undo clears the redo stack deterministically.
- History controls are available in the UI (`Undo`, `Redo`) and via keyboard
  shortcuts when focus is outside form fields:
  - `Ctrl/Cmd+Z` for undo
  - `Ctrl+Y` or `Ctrl/Cmd+Shift+Z` for redo

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
