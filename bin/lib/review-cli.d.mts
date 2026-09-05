// Declarations for bin/lib/review-cli.mjs.
//
// A hand-written sibling because `tsc` resolves `./x.mjs` to `x.d.mts` when
// one exists and then reports "no exported member" for anything this file
// omits. An omission is invisible at runtime and a compile error in the
// importing test, which is the right way round.

export interface ReviewCliExitCodes {
  readonly OK: 0;
  readonly USAGE: 1;
  readonly STORE_UNAVAILABLE: 2;
  readonly CORRUPTION_PRESENT: 3;
  readonly NOT_FOUND: 4;
  readonly INTERNAL: 5;
}

export const REVIEW_CLI_EXIT: ReviewCliExitCodes;
export const REVIEW_CLI_COMMANDS: readonly string[];
export const REVIEW_CLI_USAGE: string;

export interface ParsedReviewCliArgs {
  readonly command: 'inventory' | 'history' | 'inspect' | 'filing' | 'help';
  readonly findingId: string | null;
  readonly json: boolean;
  readonly shallow: boolean;
  readonly limit: number;
  readonly offset: number;
}

export function parseReviewCliArgs(argv: readonly string[]): ParsedReviewCliArgs;
export function inventoryStatusToken(classification: string): string;
export function inventoryExitCode(classification: string): number;
export function renderInventoryText(inventory: unknown): string;
export function renderHistoryText(history: unknown): string;
export function renderInspectText(projection: unknown): string;
