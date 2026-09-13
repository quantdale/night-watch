// Types for the pure validation-classification rules
// (`bin/lib/validation-classification.mjs`).

export const VALIDATION_CLASSIFICATION_VERSION: string;

export function globToRegExp(glob: string): RegExp;
export function extractTestMatchGlobs(playwrightConfigSource: string): string[];
export function matchesDefaultTestMatch(file: string, globs: readonly string[]): boolean;
export function npmRunScripts(text: string): string[];
export function classifyValidationTruth(input?: Record<string, unknown>): {
  readonly errors: ReadonlyArray<{ readonly code: string; readonly detail: string }>;
};
