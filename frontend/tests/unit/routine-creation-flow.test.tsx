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

vi.mock("react-muscle-highlighter", () => ({
  __esModule: true,
  default: ({
    data,
    side,
  }: {
    data: Array<{ slug: string; intensity: number }>;
    side: string;
  }) =>
    React.createElement(
      "div",
      { "data-side": side },
      data.map((part) => `${part.slug}:${part.intensity}`).join("|"),
    ),
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

    expect(dslEditor.value).toContain("Split Squat");

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

  it("uses human-readable DSL authoring text instead of JSON-centric text in DSL mode", async () => {
    const user = userEvent.setup();

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);
    await user.click(screen.getByRole("tab", { name: /^dsl$/i }));

    const dslEditor = screen.getByRole("textbox", {
      name: /routine dsl editor/i,
    }) as HTMLTextAreaElement;

    expect(dslEditor.value).toContain('routine "Hybrid Builder"');
    expect(dslEditor.value).not.toContain('"routineName":');

    const nextDsl = `
routine "Hybrid Builder" id:routine-hybrid-a path:endurance
references macro:null meso:null micro:null

Warmup
- 10m 60% 90-100rpm

Main set 2x
- 4m 100% 40-50rpm, torque focus
- 2m recovery at 40%

Cooldown
- 5m 55% 90-100rpm
`.trim();

    fireEvent.change(dslEditor, {
      target: {
        value: nextDsl,
      },
    });

    await user.click(screen.getByRole("tab", { name: /^visual$/i }));
    await waitFor(() => {
      expect(screen.getByDisplayValue("Main set: Work")).toBeTruthy();
    });
  });

  it("supports equipment/muscle filtering and shows exercise/routine/microcycle muscle-map visibility", async () => {
    const user = userEvent.setup();

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);

    const equipmentFilter = screen.getByRole("combobox", {
      name: /equipment filter/i,
    });
    await user.selectOptions(equipmentFilter, "barbell");

    const muscleFilter = screen.getByRole("combobox", {
      name: /muscle filter/i,
    });
    await user.selectOptions(muscleFilter, "chest");

    const resultsList = screen.getByRole("listbox", {
      name: /strength search results/i,
    });
    expect(
      within(resultsList).getByRole("button", { name: /bench press/i }),
    ).toBeTruthy();
    expect(
      within(resultsList).queryByRole("button", { name: /split squat/i }),
    ).toBeNull();

    await user.click(
      within(resultsList).getByRole("button", { name: /bench press/i }),
    );

    expect(screen.getByText(/exercise map/i)).toBeTruthy();
    expect(screen.getByText(/routine map/i)).toBeTruthy();
    expect(screen.getByText(/microcycle map/i)).toBeTruthy();
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

  it("supports advanced strength controls and keyboard reorder for Liftosaur-like parity", async () => {
    const user = userEvent.setup();

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);

    await user.click(
      screen.getByRole("button", {
        name: /add variable/i,
      }),
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: /variable name/i,
      }),
      { target: { value: "Training Max" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: /variable expression/i,
      }),
      { target: { value: "0.9 * 1rm" } },
    );

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

    await user.clear(searchInput);
    await user.type(searchInput, "bench");
    await user.click(
      within(resultsList).getByRole("button", {
        name: /bench press/i,
      }),
    );

    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: /repeat count/i,
      }),
      { target: { value: "3" } },
    );
    await user.type(
      screen.getByRole("textbox", {
        name: /block condition/i,
      }),
      "readiness >= 6",
    );

    const exerciseConditionInputs = screen.getAllByRole("textbox", {
      name: /exercise condition/i,
    });
    await user.type(exerciseConditionInputs[0] as HTMLElement, "day != deload");

    const restInputs = screen.getAllByRole("spinbutton", {
      name: /rest seconds/i,
    });
    fireEvent.change(restInputs[0] as HTMLElement, {
      target: { value: "180" },
    });

    const timerInputs = screen.getAllByRole("spinbutton", {
      name: /timer seconds/i,
    });
    fireEvent.change(timerInputs[0] as HTMLElement, {
      target: { value: "45" },
    });

    const progressionStrategySelects = screen.getAllByRole("combobox", {
      name: /progression strategy/i,
    });
    await user.selectOptions(
      progressionStrategySelects[0] as HTMLElement,
      "linear_add_load",
    );

    const progressionValueInputs = screen.getAllByRole("spinbutton", {
      name: /progression value/i,
    });
    fireEvent.change(progressionValueInputs[0] as HTMLElement, {
      target: { value: "2.5" },
    });

    await user.click(
      screen.getByRole("button", {
        name: /move split squat down/i,
      }),
    );

    await user.click(screen.getByRole("tab", { name: /^dsl$/i }));
    const dslEditor = screen.getByRole("textbox", {
      name: /routine dsl editor/i,
    }) as HTMLTextAreaElement;

    expect(dslEditor.value.indexOf("Bench Press")).toBeLessThan(
      dslEditor.value.indexOf("Split Squat"),
    );
    expect(dslEditor.value).toContain("@var");
    expect(dslEditor.value).toContain("3x if readiness >= 6");
    expect(dslEditor.value).toContain("progress: linear_add_load(2.5)");
  });

  it("supports drag and drop reorder while preserving structure validity", async () => {
    const user = userEvent.setup();

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);

    const searchInput = screen.getByRole("combobox", {
      name: /strength exercise search/i,
    });
    const resultsList = screen.getByRole("listbox", {
      name: /strength search results/i,
    });

    await user.type(searchInput, "bench");
    await user.click(
      within(resultsList).getByRole("button", {
        name: /bench press/i,
      }),
    );

    await user.clear(searchInput);
    await user.type(searchInput, "split");
    await user.click(
      within(resultsList).getByRole("button", {
        name: /split squat/i,
      }),
    );

    const selectedList = screen.getByRole("list", {
      name: /selected strength exercises/i,
    });
    const splitItem = (
      within(selectedList).getByRole("button", {
        name: /move split squat up/i,
      }) as HTMLElement
    ).closest("li");
    const benchItem = (
      within(selectedList).getByRole("button", {
        name: /move bench press down/i,
      }) as HTMLElement
    ).closest("li");
    expect(splitItem).toBeTruthy();
    expect(benchItem).toBeTruthy();

    fireEvent.dragStart(splitItem as HTMLElement);
    fireEvent.dragOver(benchItem as HTMLElement);
    fireEvent.drop(benchItem as HTMLElement);

    await user.click(screen.getByRole("tab", { name: /^dsl$/i }));

    const dslEditor = screen.getByRole("textbox", {
      name: /routine dsl editor/i,
    }) as HTMLTextAreaElement;
    expect(dslEditor.value.indexOf("Split Squat")).toBeLessThan(
      dslEditor.value.indexOf("Bench Press"),
    );
  });

  it("supports keyboard tab navigation for editor mode and routine path", async () => {
    const user = userEvent.setup();

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);

    const visualTab = screen.getByRole("tab", { name: /^visual$/i });
    const dslTab = screen.getByRole("tab", { name: /^dsl$/i });

    visualTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(dslTab.getAttribute("aria-selected")).toBe("true");
    expect(
      screen.getByRole("textbox", {
        name: /routine dsl editor/i,
      }),
    ).toBeTruthy();

    dslTab.focus();
    await user.keyboard("{ArrowLeft}");
    expect(visualTab.getAttribute("aria-selected")).toBe("true");

    const strengthTab = screen.getByRole("tab", { name: /^strength$/i });
    const enduranceTab = screen.getByRole("tab", { name: /^endurance$/i });

    strengthTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(enduranceTab.getAttribute("aria-selected")).toBe("true");
    expect(
      screen.getByRole("button", {
        name: /add interval/i,
      }),
    ).toBeTruthy();

    await user.keyboard("{Home}");
    expect(strengthTab.getAttribute("aria-selected")).toBe("true");
  });

  it("requires confirmation before destructive remove actions", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm");

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);

    await user.click(
      screen.getByRole("button", {
        name: /add variable/i,
      }),
    );
    expect(
      screen.getByRole("textbox", {
        name: /variable name/i,
      }),
    ).toBeTruthy();

    confirmSpy.mockReturnValueOnce(false);
    await user.click(
      screen.getByRole("button", {
        name: /remove variable/i,
      }),
    );

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("textbox", {
        name: /variable name/i,
      }),
    ).toBeTruthy();

    confirmSpy.mockReturnValueOnce(true);
    await user.click(
      screen.getByRole("button", {
        name: /remove variable/i,
      }),
    );

    expect(
      screen.queryByRole("textbox", {
        name: /variable name/i,
      }),
    ).toBeNull();

    confirmSpy.mockRestore();
  });

  it("keeps the last set immutable and only allows remove when more than one set exists", async () => {
    const user = userEvent.setup();

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);

    const resultsList = screen.getByRole("listbox", {
      name: /strength search results/i,
    });
    await user.click(
      within(resultsList).getByRole("button", {
        name: /split squat/i,
      }),
    );

    const initialRemoveSetButton = screen.getByRole("button", {
      name: /remove set/i,
    }) as HTMLButtonElement;
    expect(initialRemoveSetButton.disabled).toBe(true);

    await user.click(
      screen.getByRole("button", {
        name: /add set/i,
      }),
    );

    const removeSetButtons = screen.getAllByRole("button", {
      name: /remove set/i,
    }) as HTMLButtonElement[];
    expect(removeSetButtons.every((button) => button.disabled === false)).toBe(
      true,
    );
  });

  it("keeps duplicate exercise instances independently editable and removable", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);

    await user.click(screen.getByRole("tab", { name: /^dsl$/i }));
    const dslEditor = screen.getByRole("textbox", {
      name: /routine dsl editor/i,
    });

    fireEvent.change(dslEditor, {
      target: {
        value: JSON.stringify(
          {
            routineId: "routine-hybrid-a",
            routineName: "Hybrid Builder",
            path: "strength",
            strength: {
              variables: [],
              blocks: [
                {
                  blockId: "block-1",
                  label: "Main block",
                  repeatCount: 1,
                  condition: null,
                  exercises: [
                    {
                      instanceId: "exercise-1",
                      exerciseId: "global-split-squat",
                      canonicalName: "Split Squat",
                      selectedEquipment: "barbell",
                      regionTags: ["quads", "glutes", "hamstrings"],
                      condition: "side == left",
                      sets: [
                        {
                          setId: "set-1",
                          reps: 8,
                          restSeconds: 120,
                          timerSeconds: null,
                          progression: null,
                        },
                      ],
                    },
                    {
                      instanceId: "exercise-2",
                      exerciseId: "global-split-squat",
                      canonicalName: "Split Squat",
                      selectedEquipment: "dumbbell",
                      regionTags: ["quads", "glutes", "hamstrings"],
                      condition: "side == right",
                      sets: [
                        {
                          setId: "set-1",
                          reps: 10,
                          restSeconds: 120,
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
          },
          null,
          2,
        ),
      },
    });

    await user.click(screen.getByRole("tab", { name: /^visual$/i }));

    const exerciseConditionInputs = screen.getAllByRole("textbox", {
      name: /exercise condition/i,
    }) as HTMLInputElement[];
    expect(exerciseConditionInputs).toHaveLength(2);

    fireEvent.change(exerciseConditionInputs[1], {
      target: {
        value: "side == right && tempo == slow",
      },
    });

    expect(exerciseConditionInputs[0]?.value).toBe("side == left");

    const removeButtons = screen.getAllByRole("button", {
      name: /^remove$/i,
    });
    await user.click(removeButtons[0]);

    await user.click(screen.getByRole("tab", { name: /^dsl$/i }));
    const dslAfterEdit = screen.getByRole("textbox", {
      name: /routine dsl editor/i,
    }) as HTMLTextAreaElement;

    const splitSquatOccurrences =
      dslAfterEdit.value.match(/id:\s*global-split-squat/g) ?? [];

    expect(splitSquatOccurrences).toHaveLength(1);
    expect(dslAfterEdit.value).toContain("if: side == right && tempo == slow");
    expect(dslAfterEdit.value).not.toContain("if: side == left");

    confirmSpy.mockRestore();
  });

  it("announces reorders only when movement occurs", async () => {
    const user = userEvent.setup();

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);

    const searchInput = screen.getByRole("combobox", {
      name: /strength exercise search/i,
    });
    const resultsList = screen.getByRole("listbox", {
      name: /strength search results/i,
    });

    await user.type(searchInput, "bench");
    await user.click(
      within(resultsList).getByRole("button", {
        name: /bench press/i,
      }),
    );

    await user.clear(searchInput);
    await user.type(searchInput, "split");
    await user.click(
      within(resultsList).getByRole("button", {
        name: /split squat/i,
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: /move bench press up/i,
      }),
    );

    expect(
      screen.queryByText(/moved bench press up in main block\./i),
    ).toBeNull();

    await user.click(
      screen.getByRole("button", {
        name: /move bench press down/i,
      }),
    );

    expect(
      screen.getByText(/moved bench press down in main block\./i),
    ).toBeTruthy();
  });

  it("supports undo/redo across mixed visual and DSL edit history", async () => {
    const user = userEvent.setup();

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);

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
    fireEvent.change(dslEditor, {
      target: {
        value: dslEditor.value.replace(
          /Split Squat[^\n]*/,
          (line) => `${line} / if: tempo == controlled`,
        ),
      },
    });

    await user.click(screen.getByRole("tab", { name: /^visual$/i }));
    expect(
      (
        screen.getByRole("textbox", {
          name: /exercise condition/i,
        }) as HTMLInputElement
      ).value,
    ).toBe("tempo == controlled");

    const undoButton = screen.getByRole("button", { name: /^undo$/i });
    const redoButton = screen.getByRole("button", { name: /^redo$/i });

    await user.click(undoButton);
    expect(
      (
        screen.getByRole("textbox", {
          name: /exercise condition/i,
        }) as HTMLInputElement
      ).value,
    ).toBe("");

    await user.click(undoButton);
    expect(
      screen.queryByRole("list", {
        name: /selected strength exercises/i,
      }),
    ).toBeNull();

    await user.click(redoButton);
    await user.click(redoButton);

    const selectedStrengthList = screen.getByRole("list", {
      name: /selected strength exercises/i,
    });
    expect(within(selectedStrengthList).getByText("Split Squat")).toBeTruthy();
    expect(
      (
        screen.getByRole("textbox", {
          name: /exercise condition/i,
        }) as HTMLInputElement
      ).value,
    ).toBe("tempo == controlled");
  });

  it("does not create history entries from invalid DSL edits", async () => {
    const user = userEvent.setup();

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);

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

    await user.click(screen.getByRole("button", { name: /^undo$/i }));
    await user.click(screen.getByRole("tab", { name: /^visual$/i }));

    expect(
      screen.queryByRole("list", {
        name: /selected strength exercises/i,
      }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: /^redo$/i }));
    const selectedStrengthList = screen.getByRole("list", {
      name: /selected strength exercises/i,
    });
    expect(within(selectedStrengthList).getByText("Split Squat")).toBeTruthy();
  });

  it("supports keyboard shortcuts for undo and redo when focus is outside editors", async () => {
    const user = userEvent.setup();

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);

    const resultsList = screen.getByRole("listbox", {
      name: /strength search results/i,
    });
    await user.click(
      within(resultsList).getByRole("button", {
        name: /split squat/i,
      }),
    );

    const selectedStrengthList = screen.getByRole("list", {
      name: /selected strength exercises/i,
    });
    expect(within(selectedStrengthList).getByText("Split Squat")).toBeTruthy();

    fireEvent.keyDown(window, {
      key: "z",
      ctrlKey: true,
    });
    expect(
      screen.queryByRole("list", {
        name: /selected strength exercises/i,
      }),
    ).toBeNull();

    fireEvent.keyDown(window, {
      key: "y",
      ctrlKey: true,
    });
    const listAfterRedo = screen.getByRole("list", {
      name: /selected strength exercises/i,
    });
    expect(within(listAfterRedo).getByText("Split Squat")).toBeTruthy();
  });

  it("clears redo history after creating a new edit from an undone state", async () => {
    const user = userEvent.setup();

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);

    const resultsList = screen.getByRole("listbox", {
      name: /strength search results/i,
    });
    await user.click(
      within(resultsList).getByRole("button", {
        name: /split squat/i,
      }),
    );
    await user.click(
      within(resultsList).getByRole("button", {
        name: /bench press/i,
      }),
    );

    const undoButton = screen.getByRole("button", { name: /^undo$/i });
    const redoButton = screen.getByRole("button", { name: /^redo$/i });

    await user.click(undoButton);
    expect(
      within(
        screen.getByRole("list", { name: /selected strength exercises/i }),
      ).queryByText("Bench Press"),
    ).toBeNull();

    await user.click(
      within(resultsList).getByRole("button", {
        name: /bench press/i,
      }),
    );

    expect(
      within(
        screen.getByRole("list", { name: /selected strength exercises/i }),
      ).getAllByText("Bench Press"),
    ).toHaveLength(1);
    expect((redoButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("does not apply history shortcuts when the event was already prevented", async () => {
    const user = userEvent.setup();

    render(<RoutineCreationFlow />);

    await screen.findByText(/Showing 2 matches\./i);

    const resultsList = screen.getByRole("listbox", {
      name: /strength search results/i,
    });
    await user.click(
      within(resultsList).getByRole("button", {
        name: /split squat/i,
      }),
    );

    const selectedStrengthList = screen.getByRole("list", {
      name: /selected strength exercises/i,
    });
    expect(within(selectedStrengthList).getByText("Split Squat")).toBeTruthy();

    function preventHistoryShortcut(event: KeyboardEvent) {
      event.preventDefault();
    }

    window.addEventListener("keydown", preventHistoryShortcut, {
      capture: true,
      once: true,
    });
    fireEvent.keyDown(document.body, {
      key: "z",
      ctrlKey: true,
    });

    expect(
      within(
        screen.getByRole("list", {
          name: /selected strength exercises/i,
        }),
      ).getByText("Split Squat"),
    ).toBeTruthy();
  });
});
