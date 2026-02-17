import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const evidenceDir = new URL("../verification", import.meta.url);
const path = evidenceDir.pathname;

if (!existsSync(path)) {
  console.error("UI verification folder is missing: frontend/verification");
  process.exit(1);
}

const files = readdirSync(path)
  .map((entry) => join(path, entry))
  .filter((entry) => statSync(entry).isFile())
  .filter((entry) => entry.endsWith(".md") || entry.endsWith(".png") || entry.endsWith(".jpg"));

if (files.length === 0) {
  console.error("No browser verification artifacts found in frontend/verification.");
  console.error("Run agent-browser + chrome-devtools-mcp and save evidence before release.");
  process.exit(1);
}

console.log(`UI verification evidence found (${files.length} file(s)).`);
