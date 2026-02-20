export const requiredArtifacts: string[];
export const checklistRelativePath: string;
export const requiredChecklistReferences: string[];

export function validateChecklistContent(checklistPath: string): string[];

export function collectMissingArtifacts(options?: {
  frontendRoot?: string;
  repoRoot?: string;
}): string[];
