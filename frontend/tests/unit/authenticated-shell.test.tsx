/* @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthenticatedAppShell } from "../../src/components/navigation/authenticated-app-shell";
import { APP_NAV_ITEMS } from "../../src/components/navigation/nav-config";

describe("AuthenticatedAppShell", () => {
  it.each(APP_NAV_ITEMS)(
    "marks only the active route link with aria-current for %s",
    ({ id, label }) => {
      render(
        <AuthenticatedAppShell
          activeItem={id}
          title={label}
          description="Route purpose copy."
        >
          <div>{label} content</div>
        </AuthenticatedAppShell>,
      );

      for (const item of APP_NAV_ITEMS) {
        const expectedCurrent = item.id === id ? "page" : null;
        for (const link of screen.getAllByRole("link", { name: item.label })) {
          expect(link.getAttribute("aria-current")).toBe(expectedCurrent);
          expect(link.getAttribute("data-slot")).toBe("button");
        }
      }
    },
  );

  it("renders shared primitive controls for shell status and auth actions", () => {
    render(
      <AuthenticatedAppShell
        activeItem="today"
        title="Today"
        description="Route purpose copy."
      >
        <div>Today content</div>
      </AuthenticatedAppShell>,
    );

    expect(
      screen
        .getByText("Authenticated session active")
        .getAttribute("data-slot"),
    ).toBe("badge");

    for (const button of screen.getAllByRole("button", { name: /logout/i })) {
      expect(button.getAttribute("data-slot")).toBe("button");
    }
  });

  it("keeps skip link as the first keyboard focus target", async () => {
    const user = userEvent.setup();

    render(
      <AuthenticatedAppShell
        activeItem="today"
        title="Today"
        description="Route purpose copy."
      >
        <div>Today content</div>
      </AuthenticatedAppShell>,
    );

    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("link", { name: /skip to main content/i }),
    );
  });
});
