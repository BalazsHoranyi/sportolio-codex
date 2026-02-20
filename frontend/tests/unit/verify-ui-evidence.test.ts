import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  collectMissingArtifacts,
  requiredArtifacts,
  requiredChecklistReferences,
  validateChecklistContent,
} from "../../scripts/verify-ui-evidence.mjs";

function createTempProject(): string {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "sportolo-ui-evidence-"),
  );
  fs.mkdirSync(path.join(tempDir, "frontend", "tests", "ui-evidence"), {
    recursive: true,
  });
  fs.mkdirSync(
    path.join(tempDir, "specs", "001-define-sportolo-v1", "checklists"),
    { recursive: true },
  );
  return tempDir;
}

describe("verify-ui-evidence", () => {
  it("reports missing artifacts when files are absent", () => {
    const tempDir = createTempProject();

    const missing = collectMissingArtifacts({
      frontendRoot: path.join(tempDir, "frontend"),
      repoRoot: tempDir,
    });

    expect(missing).toHaveLength(requiredArtifacts.length + 1);
    expect(missing).toContain(
      "specs/001-define-sportolo-v1/checklists/ui-browser-verification.md",
    );
  });

  it("passes when artifacts and checklist references exist", () => {
    const tempDir = createTempProject();
    const frontendRoot = path.join(tempDir, "frontend");

    for (const artifact of requiredArtifacts) {
      const absolutePath = path.join(frontendRoot, artifact);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, "ok");
    }

    const checklistPath = path.join(
      tempDir,
      "specs",
      "001-define-sportolo-v1",
      "checklists",
      "ui-browser-verification.md",
    );

    fs.writeFileSync(
      checklistPath,
      ["# UI Browser Verification", "", ...requiredChecklistReferences].join(
        "\n",
      ),
    );

    expect(validateChecklistContent(checklistPath)).toEqual([]);

    const missing = collectMissingArtifacts({
      frontendRoot,
      repoRoot: tempDir,
    });
    expect(missing).toEqual([]);
  });
});
