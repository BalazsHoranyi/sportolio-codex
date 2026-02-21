import fs from "node:fs";

const globalsCssPath = new URL("../../src/app/globals.css", import.meta.url);

function readGlobalsCss(): string {
  return fs.readFileSync(globalsCssPath, "utf8");
}

function readRootBlock(css: string): string {
  const rootBlock = css.match(/:root\s*{([\s\S]*?)\n}/);
  if (!rootBlock) {
    throw new Error("Missing :root declaration block");
  }
  return rootBlock[1];
}

function readThemeInlineBlock(css: string): string {
  const themeInlineBlock = css.match(/@theme inline\s*{([\s\S]*?)\n}/);
  if (!themeInlineBlock) {
    throw new Error("Missing @theme inline declaration block");
  }
  return themeInlineBlock[1];
}

function findBlockBounds(
  css: string,
  selectorWithBrace: string,
): [number, number] {
  const selectorIndex = css.indexOf(selectorWithBrace);
  if (selectorIndex === -1) {
    throw new Error(`Missing ${selectorWithBrace} declaration block`);
  }

  const blockStart = selectorIndex + selectorWithBrace.length - 1;
  if (blockStart === -1) {
    throw new Error(`Missing opening brace for ${selectorWithBrace}`);
  }

  let depth = 0;
  for (let index = blockStart; index < css.length; index += 1) {
    const char = css[index];
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return [selectorIndex, index + 1];
      }
    }
  }

  throw new Error(`Missing closing brace for ${selectorWithBrace}`);
}

function stripTokenDeclarationBlocks(css: string): string {
  const blocks = [
    findBlockBounds(css, ":root {"),
    findBlockBounds(css, ".dark {"),
  ].sort((a, b) => b[0] - a[0]);

  let stripped = css;
  for (const [start, end] of blocks) {
    stripped = stripped.slice(0, start) + stripped.slice(end);
  }

  return stripped;
}

describe("midnight bloom token contract", () => {
  it("defines standardized shadcn theme variables in :root", () => {
    const rootCss = readRootBlock(readGlobalsCss());

    expect(rootCss).toMatch(/--background:/);
    expect(rootCss).toMatch(/--foreground:/);
    expect(rootCss).toMatch(/--card:/);
    expect(rootCss).toMatch(/--popover:/);
    expect(rootCss).toMatch(/--primary:/);
    expect(rootCss).toMatch(/--secondary:/);
    expect(rootCss).toMatch(/--muted:/);
    expect(rootCss).toMatch(/--accent:/);
    expect(rootCss).toMatch(/--border:/);
    expect(rootCss).toMatch(/--ring:/);
  });

  it("maps app semantic tokens to standardized shadcn variables", () => {
    const css = readGlobalsCss();

    expect(css).toMatch(/--bg-page:\s*var\(--background\)/);
    expect(css).toMatch(/--bg-panel:\s*var\(--card\)/);
    expect(css).toMatch(/--ink-strong:\s*var\(--foreground\)/);
    expect(css).toMatch(/--ink-muted:\s*var\(--muted-foreground\)/);
    expect(css).toMatch(/--line:\s*var\(--border\)/);
  });

  it("avoids self-referential token declarations in @theme inline", () => {
    const themeInline = readThemeInlineBlock(readGlobalsCss());

    const lines = themeInline
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("--"));

    for (const line of lines) {
      const match = line.match(/^--([\w-]+)\s*:\s*var\(--([\w-]+)\)/);
      if (!match) {
        continue;
      }

      const [, targetToken, sourceToken] = match;
      expect(sourceToken).not.toBe(targetToken);
    }
  });

  it("keeps oklch literals confined to token declaration blocks", () => {
    const css = readGlobalsCss();
    const nonTokenCss = stripTokenDeclarationBlocks(css);

    expect(nonTokenCss).not.toMatch(/oklch\(/);
  });
});
