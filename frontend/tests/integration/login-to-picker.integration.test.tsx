/* @vitest-environment jsdom */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { SearchableExerciseCatalogItem } from "../../src/features/exercise-picker/state";

const { pushMock, refreshMock, loadExerciseCatalogMock } = vi.hoisted(() => ({
  pushMock: vi.fn<(destination: string) => void>(),
  refreshMock: vi.fn<() => void>(),
  loadExerciseCatalogMock:
    vi.fn<() => Promise<SearchableExerciseCatalogItem[]>>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("../../src/features/exercise-picker/api", () => ({
  loadExerciseCatalog: loadExerciseCatalogMock,
}));

import { LoginForm } from "../../src/features/auth/login-form";
import { StrengthExercisePicker } from "../../src/features/exercise-picker/strength-exercise-picker";

const catalogFixture: SearchableExerciseCatalogItem[] = [
  {
    id: "global-split-squat",
    canonicalName: "Split Squat",
    aliases: ["Barbell Split Squat", "DB Split Squat"],
    regionTags: ["glutes", "hamstrings", "quads"],
    equipmentOptions: ["barbell", "dumbbell", "kettlebell"],
  },
];

describe("login to picker integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadExerciseCatalogMock.mockResolvedValue(catalogFixture);

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ redirectTo: "/" }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits login and then supports keyboard-based picker selection", async () => {
    const user = userEvent.setup();

    render(
      <>
        <LoginForm
          nextPath="/"
          demoEmail="diego.tri@axis.test"
          demoPassword="axis-demo-diego"
        />
        <StrengthExercisePicker />
      </>,
    );

    const emailInput = screen.getByRole("textbox", { name: /email/i });
    await user.clear(emailInput);
    await user.type(emailInput, "diego.tri@axis.test");
    await user.type(screen.getByLabelText(/password/i), "axis-demo-diego");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
      expect(refreshMock).toHaveBeenCalled();
    });

    const searchInput = await screen.findByRole("combobox", {
      name: /exercise search/i,
    });
    await user.type(searchInput, "splt sqaut");
    await user.keyboard("{ArrowDown}{Enter}");

    const dslPreview = screen.getByLabelText(/workout dsl preview/i);
    expect(dslPreview.textContent).toContain(
      '"exerciseId": "global-split-squat"',
    );

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
