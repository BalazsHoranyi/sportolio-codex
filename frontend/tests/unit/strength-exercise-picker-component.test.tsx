/* @vitest-environment jsdom */

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { SearchableExerciseCatalogItem } from "../../src/features/exercise-picker/state";

const { loadExerciseCatalogMock } = vi.hoisted(() => ({
  loadExerciseCatalogMock:
    vi.fn<() => Promise<SearchableExerciseCatalogItem[]>>(),
}));

vi.mock("../../src/features/exercise-picker/api", () => ({
  loadExerciseCatalog: loadExerciseCatalogMock,
}));

import { StrengthExercisePicker } from "../../src/features/exercise-picker/strength-exercise-picker";

const catalogFixture: SearchableExerciseCatalogItem[] = [
  {
    id: "global-split-squat",
    canonicalName: "Split Squat",
    aliases: ["Barbell Split Squat", "DB Split Squat"],
    regionTags: ["glutes", "hamstrings", "quads"],
    equipmentOptions: ["barbell", "dumbbell", "kettlebell"],
  },
  {
    id: "global-pallof-press",
    canonicalName: "Pallof Press",
    aliases: ["Cable Pallof", "Anti Rotation Press"],
    regionTags: ["core", "obliques"],
    equipmentOptions: ["cable", "band"],
  },
  {
    id: "global-shrug",
    canonicalName: "Shrug",
    aliases: ["Trap Shrug"],
    regionTags: ["traps"],
    equipmentOptions: ["dumbbell"],
  },
];

describe("StrengthExercisePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadExerciseCatalogMock.mockResolvedValue(catalogFixture);
  });

  it("supports fuzzy search + facet filters + keyboard selection with DSL binding", async () => {
    const user = userEvent.setup();

    render(<StrengthExercisePicker />);

    await screen.findByText("Showing 3 matches.");

    const equipmentFilter = screen.getByRole("combobox", {
      name: /equipment filter/i,
    });
    await user.selectOptions(equipmentFilter, "barbell");

    const muscleFilter = screen.getByRole("combobox", {
      name: /muscle filter/i,
    });
    await user.selectOptions(muscleFilter, "glutes");

    const searchInput = screen.getByRole("combobox", {
      name: /exercise search/i,
    });
    await user.type(searchInput, "splt sqaut");

    const listbox = screen.getByRole("listbox", {
      name: /exercise search results/i,
    });
    const splitSquatOption = within(listbox).getByRole("option", {
      name: /split squat/i,
    });
    expect(splitSquatOption).toBeTruthy();

    await user.click(searchInput);
    await user.keyboard("{ArrowDown}{Enter}");

    const selectedEquipment = screen.getByRole("combobox", {
      name: /selected equipment/i,
    }) as HTMLSelectElement;
    expect(selectedEquipment.value).toBe("barbell");

    const dslPreview = screen.getByLabelText(/workout dsl preview/i);
    expect(dslPreview.textContent).toContain(
      '"exerciseId": "global-split-squat"',
    );
    expect(dslPreview.textContent).toContain('"selectedEquipment": "barbell"');
  });

  it("exposes ARIA combobox linkage and active descendant while navigating", async () => {
    const user = userEvent.setup();

    render(<StrengthExercisePicker />);

    await screen.findByText("Showing 3 matches.");

    const searchInput = screen.getByRole("combobox", {
      name: /exercise search/i,
    });
    const resultsListbox = screen.getByRole("listbox", {
      name: /exercise search results/i,
    });

    expect(searchInput.getAttribute("aria-controls")).toBe(resultsListbox.id);
    expect(searchInput.getAttribute("aria-activedescendant")).toBeNull();

    await user.type(searchInput, "splt sqaut");
    await user.keyboard("{ArrowDown}");

    const splitSquatOption = within(resultsListbox).getByRole("option", {
      name: /split squat/i,
    });

    await waitFor(() => {
      expect(searchInput.getAttribute("aria-activedescendant")).toBe(
        splitSquatOption.id,
      );
    });
  });
});
