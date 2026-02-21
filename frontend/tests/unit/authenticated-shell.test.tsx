/* @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";

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
        }
      }
    },
  );
});
