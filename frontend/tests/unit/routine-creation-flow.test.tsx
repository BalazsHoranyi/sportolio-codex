/* @vitest-environment jsdom */

import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { SearchableExerciseCatalogItem } from "../../src/features/exercise-picker/state";

const { loadExerciseCatalogMock } = vi.hoisted(() => ({
  loadExerciseCatalogMock:
    vi.fn<() => Promise<SearchableExerciseCatalogItem[]>>(),
}));

vi.mock("../../src/features/exercise-picker/api", () => ({
  loadExerciseCatalog: loadExerciseCatalogMock,
}));

import { RoutineCreationFlow } from "../../src/features/routine/components/routine-creation-flow";

const catalogFixture: SearchableExerciseCatalogItem[] = [
  {
    id: "global-split-squat",
    canonicalName: "Split Squat",
    aliases: ["Barbell Split Squat", "DB Split Squat"],
    regionTags: ["quads", "glutes", "hamstrings"],
    equipmentOptions: ["barbell", "dumbbell"],
  },
  {
    id: "global-bench-press",
    canonicalName: "Bench Press",
    aliases: ["Barbell Bench Press"],
    regionTags: ["chest", "triceps"],
    equipmentOptions: ["barbell"],
  },
];

describe("RoutineCreationFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadExerciseCatalogMock.mockResolvedValue(catalogFixture);
  });

  it("supports visual -> DSL -> visual synchronization for strength and endurance fields", async () => {
    const user = userEvent.setup();

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);

    const searchInput = screen.getByRole("combobox", {
      name: /strength exercise search/i,
    });
    await user.type(searchInput, "splt sqaut");

    const resultsList = screen.getByRole("listbox", {
      name: /strength search results/i,
    });
    await user.click(
      within(resultsList).getByRole("button", {
        name: /split squat/i,
      }),
    );

    await user.click(screen.getByRole("tab", { name: /^dsl$/i }));

    const dslEditor = screen.getByRole("textbox", {
      name: /routine dsl editor/i,
    }) as HTMLTextAreaElement;

    expect(dslEditor.value).toContain('"exerciseId": "global-split-squat"');

    const nextDsl = JSON.stringify(
      {
        routineId: "routine-hybrid-a",
        routineName: "Hybrid Builder",
        path: "endurance",
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
              label: "Threshold Block",
              durationSeconds: 480,
              targetType: "power_watts",
              targetValue: 286,
            },
          ],
        },
      },
      null,
      2,
    );

    fireEvent.change(dslEditor, {
      target: {
        value: nextDsl,
      },
    });

    await user.click(screen.getByRole("tab", { name: /^visual$/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Threshold Block")).toBeTruthy();
    });

    await user.click(screen.getByRole("tab", { name: /^strength$/i }));

    const selectedStrengthList = screen.getByRole("list", {
      name: /selected strength exercises/i,
    });
    expect(within(selectedStrengthList).getByText("Split Squat")).toBeTruthy();
  });

  it("shows inline validation and preserves last valid visual state on invalid DSL", async () => {
    const user = userEvent.setup();

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);

    const searchInput = screen.getByRole("combobox", {
      name: /strength exercise search/i,
    });
    await user.type(searchInput, "split squat");

    const resultsList = screen.getByRole("listbox", {
      name: /strength search results/i,
    });
    await user.click(
      within(resultsList).getByRole("button", {
        name: /split squat/i,
      }),
    );

    await user.click(screen.getByRole("tab", { name: /^dsl$/i }));

    const dslEditor = screen.getByRole("textbox", {
      name: /routine dsl editor/i,
    });

    fireEvent.change(dslEditor, {
      target: {
        value: "{ this is not valid json",
      },
    });

    expect(screen.getByText(/invalid json/i)).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: /^visual$/i }));

    const selectedStrengthList = screen.getByRole("list", {
      name: /selected strength exercises/i,
    });
    expect(within(selectedStrengthList).getByText("Split Squat")).toBeTruthy();
  });
});
