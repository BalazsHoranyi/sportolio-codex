import { readFileSync } from "node:fs";
import {
  parseRoutineDsl,
  serializeRoutineDsl,
} from "../../src/features/routine/routine-dsl";
import type { RoutineDraft } from "../../src/features/routine/types";

interface VersionedRoutineDraft extends RoutineDraft {
  dslVersion: "2.0";
  references: {
    macrocycleId: string | null;
    mesocycleId: string | null;
    microcycleId: string | null;
  };
  endurance: RoutineDraft["endurance"] & {
    blocks: Array<{
      blockId: string;
      label: string;
      repeatCount: number;
      segments: Array<{
        segmentId: string;
        label: string;
        durationSeconds: number;
        target: {
          type: "power_watts" | "pace" | "heart_rate";
          value: number;
        };
      }>;
    }>;
  };
}

describe("routine DSL helpers", () => {
  it("passes representative Liftosaur-like parity fixtures without lossy simplification", () => {
    const fixtures = [
      {
        dslVersion: "2.0",
        references: {
          macrocycleId: null,
          mesocycleId: null,
          microcycleId: null,
        },
        routineId: "routine-strength-parity-a",
        routineName: "Strength Parity A",
        path: "strength",
        strength: {
          variables: [
            {
              variableId: "training-max",
              name: "Training Max",
              expression: "0.9 * oneRepMax",
            },
            {
              variableId: "readiness-floor",
              name: "Readiness Floor",
              expression: "6",
            },
          ],
          blocks: [
            {
              blockId: "block-main",
              label: "Main",
              repeatCount: 4,
              condition: "readiness >= readiness_floor",
              exercises: [
                {
                  instanceId: "exercise-1",
                  exerciseId: "global-back-squat",
                  canonicalName: "Back Squat",
                  selectedEquipment: "barbell",
                  regionTags: ["quads", "glutes", "spinal_erectors"],
                  condition: "day != deload",
                  sets: [
                    {
                      setId: "set-1",
                      reps: 5,
                      restSeconds: 210,
                      timerSeconds: 45,
                      load: null,
                      rpe: null,
                      rir: null,
                      progression: {
                        strategy: "linear_add_load",
                        value: 2.5,
                      },
                    },
                    {
                      setId: "set-2",
                      reps: 8,
                      restSeconds: 150,
                      timerSeconds: null,
                      load: null,
                      rpe: null,
                      rir: null,
                      progression: {
                        strategy: "linear_add_reps",
                        value: 1,
                      },
                    },
                  ],
                },
              ],
            },
            {
              blockId: "block-assistance",
              label: "Assistance",
              repeatCount: 2,
              condition: null,
              exercises: [
                {
                  instanceId: "exercise-2",
                  exerciseId: "global-pallof-press",
                  canonicalName: "Pallof Press",
                  selectedEquipment: "cable",
                  regionTags: ["core", "obliques"],
                  condition: null,
                  sets: [
                    {
                      setId: "set-1",
                      reps: 12,
                      restSeconds: 75,
                      timerSeconds: null,
                      load: null,
                      rpe: null,
                      rir: null,
                      progression: {
                        strategy: "percentage_wave",
                        value: 5,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        endurance: {
          intervals: [],
          blocks: [],
        },
      },
      {
        dslVersion: "2.0",
        references: {
          macrocycleId: null,
          mesocycleId: null,
          microcycleId: null,
        },
        routineId: "routine-hybrid-parity-b",
        routineName: "Hybrid Parity B",
        path: "endurance",
        strength: {
          variables: [
            {
              variableId: "auto-reg-cap",
              name: "Auto-reg cap",
              expression: "lastSessionRpe <= 8",
            },
          ],
          blocks: [
            {
              blockId: "block-1",
              label: "Primer",
              repeatCount: 1,
              condition: null,
              exercises: [
                {
                  instanceId: "exercise-1",
                  exerciseId: "global-bench-press",
                  canonicalName: "Bench Press",
                  selectedEquipment: "barbell",
                  regionTags: ["chest", "triceps", "front_delts"],
                  condition: "sessionType == quality",
                  sets: [
                    {
                      setId: "set-1",
                      reps: 6,
                      restSeconds: 150,
                      timerSeconds: null,
                      load: null,
                      rpe: null,
                      rir: null,
                      progression: null,
                    },
                  ],
                },
              ],
            },
          ],
        },
        endurance: {
          intervals: [
            {
              intervalId: "interval-1",
              label: "Threshold Block",
              durationSeconds: 600,
              targetType: "power_watts",
              targetValue: 290,
            },
            {
              intervalId: "interval-2",
              label: "Pace Float",
              durationSeconds: 300,
              targetType: "pace",
              targetValue: 255,
            },
          ],
          blocks: [
            {
              blockId: "block-1",
              label: "Threshold Block",
              repeatCount: 1,
              segments: [
                {
                  segmentId: "segment-1",
                  label: "Threshold Block",
                  durationSeconds: 600,
                  target: {
                    type: "power_watts",
                    value: 290,
                  },
                },
              ],
            },
            {
              blockId: "block-2",
              label: "Pace Float",
              repeatCount: 1,
              segments: [
                {
                  segmentId: "segment-2",
                  label: "Pace Float",
                  durationSeconds: 300,
                  target: {
                    type: "pace",
                    value: 255,
                  },
                },
              ],
            },
          ],
        },
      },
    ] as unknown as RoutineDraft[];

    for (const fixture of fixtures) {
      const serialized = serializeRoutineDsl(fixture);
      const parsed = parseRoutineDsl(serialized);

      expect(parsed.ok).toBe(true);
      if (!parsed.ok) {
        return;
      }
      expect(parsed.value).toStrictEqual(fixture);
    }
  });

  it("round-trips routine data without losing supported fields", () => {
    const routine = {
      dslVersion: "2.0",
      references: {
        macrocycleId: null,
        mesocycleId: null,
        microcycleId: null,
      },
      routineId: "routine-hybrid-a",
      routineName: "Hybrid Builder",
      path: "strength",
      strength: {
        variables: [
          {
            variableId: "training-max",
            name: "Training Max",
            expression: "0.9 * 1rm",
          },
        ],
        blocks: [
          {
            blockId: "block-1",
            label: "Primary",
            repeatCount: 3,
            condition: "readiness >= 6",
            exercises: [
              {
                instanceId: "exercise-1",
                exerciseId: "global-split-squat",
                canonicalName: "Split Squat",
                selectedEquipment: "barbell",
                regionTags: ["quads", "glutes", "hamstrings"],
                condition: "day != deload",
                sets: [
                  {
                    setId: "set-1",
                    reps: 6,
                    restSeconds: 180,
                    timerSeconds: 45,
                    load: null,
                    rpe: null,
                    rir: null,
                    progression: {
                      strategy: "linear_add_load",
                      value: 2.5,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      endurance: {
        intervals: [
          {
            intervalId: "interval-1",
            label: "Threshold",
            durationSeconds: 480,
            targetType: "power_watts",
            targetValue: 286,
          },
        ],
        blocks: [
          {
            blockId: "block-1",
            label: "Threshold",
            repeatCount: 1,
            segments: [
              {
                segmentId: "segment-1",
                label: "Threshold",
                durationSeconds: 480,
                target: {
                  type: "power_watts",
                  value: 286,
                },
              },
            ],
          },
        ],
      },
    } as unknown as RoutineDraft;

    const dsl = serializeRoutineDsl(routine);
    const parsed = parseRoutineDsl(dsl);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value).toStrictEqual(routine);
  });

  it("hydrates legacy strength.exercises payloads into block-based structure", () => {
    const parsed = parseRoutineDsl(
      JSON.stringify({
        routineId: "routine-hybrid-a",
        routineName: "Hybrid Builder",
        path: "strength",
        strength: {
          exercises: [
            {
              exerciseId: "global-split-squat",
              canonicalName: "Split Squat",
              selectedEquipment: "barbell",
              regionTags: ["quads", "glutes"],
            },
          ],
        },
        endurance: {
          intervals: [],
        },
      }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.strength.blocks.length).toBe(1);
    expect(parsed.value.strength.blocks[0]?.exercises[0]?.exerciseId).toBe(
      "global-split-squat",
    );
    expect(parsed.value.strength.blocks[0]?.exercises[0]?.instanceId).toBe(
      "exercise-1",
    );
  });

  it("assigns stable per-instance ids for duplicate exercises when missing from DSL", () => {
    const parsed = parseRoutineDsl(
      JSON.stringify({
        routineId: "routine-duplicate-instances",
        routineName: "Duplicate Instances",
        path: "strength",
        strength: {
          blocks: [
            {
              blockId: "block-1",
              label: "Main block",
              repeatCount: 1,
              condition: null,
              exercises: [
                {
                  exerciseId: "global-split-squat",
                  canonicalName: "Split Squat",
                  selectedEquipment: "barbell",
                  regionTags: ["quads", "glutes"],
                  condition: "side == left",
                  sets: [
                    {
                      setId: "set-1",
                      reps: 8,
                      restSeconds: 90,
                      timerSeconds: null,
                      progression: null,
                    },
                  ],
                },
                {
                  exerciseId: "global-split-squat",
                  canonicalName: "Split Squat",
                  selectedEquipment: "dumbbell",
                  regionTags: ["quads", "glutes"],
                  condition: "side == right",
                  sets: [
                    {
                      setId: "set-1",
                      reps: 10,
                      restSeconds: 90,
                      timerSeconds: null,
                      progression: null,
                    },
                  ],
                },
              ],
            },
          ],
        },
        endurance: {
          intervals: [],
        },
      }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const [first, second] = parsed.value.strength.blocks[0]?.exercises ?? [];
    expect(first?.instanceId).toBe("exercise-1");
    expect(second?.instanceId).toBe("exercise-2");
  });

  it("returns actionable errors for invalid JSON", () => {
    const parsed = parseRoutineDsl("{ this is not valid json");

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    expect(parsed.errors[0]).toContain("Invalid JSON");
  });

  it("returns actionable errors for invalid schema values", () => {
    const parsed = parseRoutineDsl(
      JSON.stringify({
        routineId: "routine-hybrid-a",
        routineName: "Hybrid Builder",
        path: "endurance",
        strength: {
          exercises: [],
        },
        endurance: {
          intervals: [
            {
              intervalId: "interval-1",
              label: "Bad interval",
              durationSeconds: 0,
              targetType: "power_watts",
              targetValue: 286,
            },
          ],
        },
      }),
    );

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    expect(parsed.errors.join("\n")).toContain(
      "endurance.intervals[0].durationSeconds",
    );
  });

  it("parses v2 DSL envelope with references, set load/RPE/RIR, and endurance blocks", () => {
    const parsed = parseRoutineDsl(
      JSON.stringify({
        dslVersion: "2.0",
        references: {
          macrocycleId: "macro-2026-base",
          mesocycleId: "meso-1",
          microcycleId: "micro-3",
        },
        routineId: "routine-v2-hybrid-a",
        routineName: "Hybrid V2",
        path: "endurance",
        strength: {
          variables: [],
          blocks: [
            {
              blockId: "strength-block-1",
              label: "Main",
              repeatCount: 1,
              condition: null,
              exercises: [
                {
                  instanceId: "exercise-1",
                  exerciseId: "global-back-squat",
                  canonicalName: "Back Squat",
                  selectedEquipment: "barbell",
                  regionTags: ["quads", "glutes"],
                  condition: null,
                  sets: [
                    {
                      setId: "set-1",
                      reps: 5,
                      restSeconds: 180,
                      timerSeconds: null,
                      load: {
                        unit: "kg",
                        value: 145,
                      },
                      rpe: 8,
                      rir: 2,
                      progression: {
                        strategy: "linear_add_load",
                        value: 2.5,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        endurance: {
          blocks: [
            {
              blockId: "endurance-block-1",
              label: "Threshold set",
              repeatCount: 2,
              segments: [
                {
                  segmentId: "seg-1",
                  label: "Work",
                  durationSeconds: 300,
                  target: {
                    type: "power_watts",
                    value: 285,
                  },
                },
                {
                  segmentId: "seg-2",
                  label: "Recovery",
                  durationSeconds: 120,
                  target: {
                    type: "heart_rate",
                    value: 145,
                  },
                },
              ],
            },
          ],
        },
      }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const value = parsed.value as VersionedRoutineDraft;

    expect(value.dslVersion).toBe("2.0");
    expect(value.references).toStrictEqual({
      macrocycleId: "macro-2026-base",
      mesocycleId: "meso-1",
      microcycleId: "micro-3",
    });

    expect(value.strength.blocks[0]?.exercises[0]?.sets[0]).toMatchObject({
      load: {
        unit: "kg",
        value: 145,
      },
      rpe: 8,
      rir: 2,
    });

    expect(value.endurance.blocks).toHaveLength(1);
    expect(value.endurance.blocks[0]?.segments).toHaveLength(2);
  });

  it("normalizes legacy payloads to the latest DSL version with null lineage references", () => {
    const parsed = parseRoutineDsl(
      JSON.stringify({
        routineId: "legacy-routine",
        routineName: "Legacy Routine",
        path: "strength",
        strength: {
          blocks: [
            {
              blockId: "block-1",
              label: "Main",
              repeatCount: 1,
              condition: null,
              exercises: [
                {
                  exerciseId: "global-bench-press",
                  canonicalName: "Bench Press",
                  selectedEquipment: "barbell",
                  regionTags: ["chest", "triceps"],
                  condition: null,
                  sets: [
                    {
                      setId: "set-1",
                      reps: 6,
                      restSeconds: 150,
                      timerSeconds: null,
                      progression: null,
                    },
                  ],
                },
              ],
            },
          ],
        },
        endurance: {
          intervals: [],
        },
      }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const value = parsed.value as VersionedRoutineDraft;
    expect(value.dslVersion).toBe("2.0");
    expect(value.references).toStrictEqual({
      macrocycleId: null,
      mesocycleId: null,
      microcycleId: null,
    });
  });

  it("returns location-specific fix hints for malformed set load/rpe/rir fields", () => {
    const parsed = parseRoutineDsl(
      JSON.stringify({
        dslVersion: "2.0",
        references: {
          macrocycleId: null,
          mesocycleId: null,
          microcycleId: null,
        },
        routineId: "invalid-prescription-fields",
        routineName: "Invalid Prescription Fields",
        path: "strength",
        strength: {
          blocks: [
            {
              blockId: "block-1",
              label: "Main",
              repeatCount: 1,
              condition: null,
              exercises: [
                {
                  instanceId: "exercise-1",
                  exerciseId: "global-back-squat",
                  canonicalName: "Back Squat",
                  selectedEquipment: "barbell",
                  regionTags: ["quads", "glutes"],
                  condition: null,
                  sets: [
                    {
                      setId: "set-1",
                      reps: 5,
                      restSeconds: 180,
                      timerSeconds: null,
                      load: {
                        value: 140,
                      },
                      rpe: 12,
                      rir: -1,
                      progression: null,
                    },
                  ],
                },
              ],
            },
          ],
        },
        endurance: {
          intervals: [],
        },
      }),
    );

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    const combined = parsed.errors.join("\n");
    expect(combined).toContain("strength.blocks[0].exercises[0].sets[0].load");
    expect(combined).toContain("strength.blocks[0].exercises[0].sets[0].rpe");
    expect(combined).toContain("strength.blocks[0].exercises[0].sets[0].rir");
    expect(combined).toContain("Hint:");
  });

  it("matches golden fixture output for grammar stability", () => {
    const input = readFileSync(
      new URL("../fixtures/routine-dsl/v2-hybrid.input.json", import.meta.url),
      "utf8",
    );
    const expected = JSON.parse(
      readFileSync(
        new URL(
          "../fixtures/routine-dsl/v2-hybrid.expected.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as VersionedRoutineDraft;
    const expectedSerialized = readFileSync(
      new URL(
        "../fixtures/routine-dsl/v2-hybrid.serialized.json",
        import.meta.url,
      ),
      "utf8",
    );

    const parsed = parseRoutineDsl(input);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value as VersionedRoutineDraft).toStrictEqual(expected);
    expect(serializeRoutineDsl(parsed.value)).toBe(
      JSON.stringify(JSON.parse(expectedSerialized), null, 2),
    );
  });
});
