import {
  isExerciseCatalogResponse,
  loadExerciseCatalog,
} from "../../src/features/exercise-picker/api";

describe("exercise picker api", () => {
  it("builds the exercise catalog query with search + facets", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            items: [],
          }),
        }) as Response,
    );

    await loadExerciseCatalog({
      searchText: "split squat",
      equipment: "barbell",
      muscle: "quads",
      fetchImpl: fetchMock,
      endpoint: "/api/exercises",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/exercises?scope=all&search=split+squat&equipment=barbell&muscle=quads",
      { cache: "no-store" },
    );
  });

  it("returns empty list for malformed payloads", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({ invalid: true }),
        }) as Response,
    );

    const result = await loadExerciseCatalog({
      fetchImpl: fetchMock,
      endpoint: "/api/exercises",
    });

    expect(result).toEqual([]);
  });

  it("validates exercise catalog payload shape", () => {
    expect(
      isExerciseCatalogResponse({
        items: [
          {
            id: "global-split-squat",
            canonicalName: "Split Squat",
            aliases: [],
            regionTags: ["quads"],
            equipmentOptions: ["barbell"],
            ownerUserId: null,
            scope: "global",
          },
        ],
      }),
    ).toBe(true);

    expect(isExerciseCatalogResponse({ items: [{ id: "bad" }] })).toBe(false);
  });
});
