// Types for the behavioural mutation harness (`bin/lib/hardening/mutation-harness.mjs`).
export interface FocusedTest { readonly file: string; readonly grep: string | null }
export interface Mutant {
  readonly id: string;
  readonly finding: string;
  readonly guard: string;
  readonly ops: ReadonlyArray<{ file: string; search: string; replace: string }>;
  readonly focusedTests: readonly FocusedTest[];
}
export interface Invocation { readonly command: string; readonly args: readonly string[] }
export function validateMutantRegistry(
  registry: unknown,
  isTracked: (file: string) => boolean,
  readFile: (file: string) => string | null,
): { errors: string[]; mutants: Mutant[]; requirements: string[] };
export function runMutationHarness(options?: {
  root?: string;
  registryPath?: string;
  onlyMutant?: string;
  testInvocation?: (tests: FocusedTest[]) => Invocation;
  hardeningInvocation?: () => Invocation;
  trackedFiles?: string[];
  environment?: NodeJS.ProcessEnv;
  log?: (line: string) => void;
}): Promise<{ ok: boolean; mutants: number; detected: number; survived: string[]; errors: string[] }>;
export function createScratch(root: string, files: string[]): string;
