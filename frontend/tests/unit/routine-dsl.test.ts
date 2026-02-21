import {
  parseRoutineDsl,
  serializeRoutineDsl,
} from "../../src/features/routine/routine-dsl";
import type { RoutineDraft } from "../../src/features/routine/types";

describe("routine DSL helpers", () => {
  it("round-trips routine data without losing supported fields", () => {
    const routine: RoutineDraft = {
      routineId: "routine-hybrid-a",
      routineName: "Hybrid Builder",
      path: "strength",
      strength: {
        exercises: [
          {
            exerciseId: "global-split-squat",
            canonicalName: "Split Squat",
            selectedEquipment: "barbell",
            regionTags: ["quads", "glutes", "hamstrings"],
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
    };

    const dsl = serializeRoutineDsl(routine);
    const parsed = parseRoutineDsl(dsl);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value).toStrictEqual(routine);
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
