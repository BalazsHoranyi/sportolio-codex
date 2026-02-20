import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const requiredArtifacts = [
  "tests/ui-evidence/home-desktop-after.png",
  "tests/ui-evidence/home-mobile-after.png",
  "tests/ui-evidence/persona-diego-desktop.png",
  "tests/ui-evidence/persona-diego-mobile.png",
  "tests/ui-evidence/persona-evan-desktop.png",
  "tests/ui-evidence/persona-evan-mobile.png",
  "tests/ui-evidence/persona-hybrid-desktop.png",
  "tests/ui-evidence/persona-hybrid-mobile.png",
  "tests/ui-evidence/persona-lena-desktop.png",
  "tests/ui-evidence/persona-lena-mobile.png",
  "tests/ui-evidence/persona-nora-desktop.png",
  "tests/ui-evidence/persona-nora-mobile.png",
  "tests/ui-evidence/persona-priya-desktop.png",
  "tests/ui-evidence/persona-priya-mobile.png",
];

export const checklistRelativePath =
  "specs/001-define-sportolo-v1/checklists/ui-browser-verification.md";

export const requiredChecklistReferences = requiredArtifacts.map((artifactPath) =>
  path.basename(artifactPath),
);

function defaultRoots() {
  const scriptPath = fileURLToPath(import.meta.url);
  const scriptsDir = path.dirname(scriptPath);
  const frontendRoot = path.resolve(scriptsDir, "..");
  const repoRoot = path.resolve(frontendRoot, "..");
  return { frontendRoot, repoRoot };
}

export function validateChecklistContent(checklistPath) {
  if (!fs.existsSync(checklistPath)) {
    return [...requiredChecklistReferences];
  }

  const content = fs.readFileSync(checklistPath, "utf8");
  return requiredChecklistReferences.filter(
    (reference) => !content.includes(reference),
  );
}

export function collectMissingArtifacts(options = {}) {
  const roots = defaultRoots();
  const frontendRoot = options.frontendRoot ?? roots.frontendRoot;
  const repoRoot = options.repoRoot ?? roots.repoRoot;

  const missing = [];

  for (const artifact of requiredArtifacts) {
    const artifactPath = path.join(frontendRoot, artifact);
    if (!fs.existsSync(artifactPath)) {
      missing.push(path.posix.join("frontend", artifact));
    }
  }

  const checklistPath = path.join(repoRoot, checklistRelativePath);
  if (!fs.existsSync(checklistPath)) {
    missing.push(checklistRelativePath);
    return missing;
  }

  const missingChecklistReferences = validateChecklistContent(checklistPath);
  for (const reference of missingChecklistReferences) {
    missing.push(`${checklistRelativePath} (missing reference: ${reference})`);
  }

  return missing;
}

function formatMissingList(items) {
  return items.map((item) => ` - ${item}`).join("\n");
}

function main() {
  const missing = collectMissingArtifacts();
  if (missing.length > 0) {
    console.error(
      "UI verification evidence is incomplete. Missing required artifacts:\n" +
        formatMissingList(missing),
    );
    process.exitCode = 1;
    return;
  }

  console.log("UI verification evidence check passed.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
