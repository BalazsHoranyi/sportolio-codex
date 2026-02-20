import { mapMuscleUsageToBodyParts } from "../../src/features/muscle-map/adapter";

describe("mapMuscleUsageToBodyParts", () => {
  it("maps backend muscle keys into deterministic highlighter body parts", () => {
    const mapped = mapMuscleUsageToBodyParts({
      front_delts: 16,
      rear_delts: 12,
      quads: 95,
      spinal_erectors: 27,
      lats: 27,
      chest: 40,
      global_other: 12,
    });

    expect(mapped).toEqual([
      { slug: "chest", intensity: 3 },
      { slug: "deltoids", intensity: 2 },
      { slug: "lower-back", intensity: 2 },
      { slug: "quadriceps", intensity: 4 },
      { slug: "upper-back", intensity: 2 },
    ]);
  });

  it("returns an empty list when no supported muscles have positive values", () => {
    const mapped = mapMuscleUsageToBodyParts({
      global_other: 10,
      unknown_bucket: 20,
      chest: 0,
    });

    expect(mapped).toEqual([]);
  });
});
