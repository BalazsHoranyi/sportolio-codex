import { NextRequest } from "next/server";

import { GET as exercisesGet } from "../../src/app/api/exercises/route";

interface ExercisePayloadItem {
  id: string;
  canonicalName: string;
  aliases: string[];
  regionTags: string[];
  equipmentOptions: string[];
}

async function responseJson(response: Response): Promise<{
  items: ExercisePayloadItem[];
}> {
  return (await response.json()) as { items: ExercisePayloadItem[] };
}

describe("exercises api route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes through backend catalog payload on successful upstream response", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              id: "global-bench-press",
              canonicalName: "Bench Press",
              aliases: ["Barbell Bench Press"],
              regionTags: ["chest", "triceps"],
              equipmentOptions: ["barbell"],
            },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const response = await exercisesGet(
      new NextRequest("http://localhost/api/exercises?scope=all&search=bench"),
    );
    const payload = await responseJson(response);

    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]?.canonicalName).toBe("Bench Press");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("returns deterministic fallback catalog with >=1000 exercises when backend is unavailable", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("offline"));

    const response = await exercisesGet(
      new NextRequest("http://localhost/api/exercises?scope=all"),
    );
    const payload = await responseJson(response);

    expect(payload.items.length).toBeGreaterThanOrEqual(1000);
    expect(payload.items[0]).toMatchObject({
      id: expect.any(String),
      canonicalName: expect.any(String),
      aliases: expect.any(Array),
      regionTags: expect.any(Array),
      equipmentOptions: expect.any(Array),
    });
  });

  it("applies equipment and muscle filters against fallback catalog", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("offline"));

    const response = await exercisesGet(
      new NextRequest(
        "http://localhost/api/exercises?scope=all&equipment=barbell&muscle=quads",
      ),
    );
    const payload = await responseJson(response);

    expect(payload.items.length).toBeGreaterThan(0);
    expect(
      payload.items.every(
        (item) =>
          item.equipmentOptions.includes("barbell") &&
          item.regionTags.includes("quads"),
      ),
    ).toBe(true);
  });
});
