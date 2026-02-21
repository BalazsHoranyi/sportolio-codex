import fs from "node:fs";

const globalsCssPath = new URL("../../src/app/globals.css", import.meta.url);

function readGlobalsCss(): string {
  return fs.readFileSync(globalsCssPath, "utf8");
}

describe("midnight bloom token contract", () => {
  it("defines standardized shadcn theme variables in :root", () => {
    const css = readGlobalsCss();

    expect(css).toMatch(/--background:/);
    expect(css).toMatch(/--foreground:/);
    expect(css).toMatch(/--card:/);
    expect(css).toMatch(/--popover:/);
    expect(css).toMatch(/--primary:/);
    expect(css).toMatch(/--secondary:/);
    expect(css).toMatch(/--muted:/);
    expect(css).toMatch(/--accent:/);
    expect(css).toMatch(/--border:/);
    expect(css).toMatch(/--ring:/);
  });

  it("maps app semantic tokens to standardized shadcn variables", () => {
    const css = readGlobalsCss();

    expect(css).toMatch(/--bg-page:\s*var\(--background\)/);
    expect(css).toMatch(/--bg-panel:\s*var\(--card\)/);
    expect(css).toMatch(/--ink-strong:\s*var\(--foreground\)/);
    expect(css).toMatch(/--ink-muted:\s*var\(--muted-foreground\)/);
    expect(css).toMatch(/--line:\s*var\(--border\)/);
  });
});
