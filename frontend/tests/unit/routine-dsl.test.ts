import {
  parseRoutineDsl,
  serializeRoutineDsl,
} from "../../src/features/routine/routine-dsl";
import type { RoutineDraft } from "../../src/features/routine/types";

describe("routine DSL helpers", () => {
  it("passes representative Liftosaur-like parity fixtures without lossy simplification", () => {
    const fixtures = [
      {
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
        },
      },
      {
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
});
