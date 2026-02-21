/* @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";

import { AuthenticatedAppShell } from "../../src/components/navigation/authenticated-app-shell";

describe("AuthenticatedAppShell", () => {
  it("marks only the active route link with aria-current", () => {
    render(
      <AuthenticatedAppShell
        activeItem="planner"
        title="Planner"
        description="Cycle planning and block design context."
      >
        <div>Planner content</div>
      </AuthenticatedAppShell>,
    );

    for (const link of screen.getAllByRole("link", { name: "Planner" })) {
      expect(link.getAttribute("aria-current")).toBe("page");
    }

    for (const link of screen.getAllByRole("link", { name: "Today" })) {
      expect(link.getAttribute("aria-current")).toBeNull();
    }

    for (const link of screen.getAllByRole("link", { name: "Calendar" })) {
      expect(link.getAttribute("aria-current")).toBeNull();
    }
  });
});
