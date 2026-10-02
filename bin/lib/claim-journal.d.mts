// Types for the canonical claim journal (`bin/lib/claim-journal.mjs`).
export const CLAIM_JOURNAL_PATH: string;
export const CLAIM_JOURNAL_PROTOCOL: string;
export interface Claim { claimId: string; role: string; task: string; created: string; released: string; base: string; tip: string }
export interface ParsedJournal { protocol: string | null; eraStartSha: string | null; gaps: Array<{ sha: string; reason: string }>; claims: Claim[]; errors: string[] }
export function parseClaimJournal(text: string): ParsedJournal;
export function validateClaimJournalStructure(parsed: ParsedJournal): string[];
export function evaluateClaimCoverage(
  parsed: ParsedJournal,
  chain: ReadonlyArray<{ sha: string; journalOnly: () => boolean }>,
  positionOf: (sha: string) => number,
): { errors: string[]; uncovered: string[]; openWindow: string | null };
export function inspectClaimJournal(input: {
  readText: (relative: string) => string | null;
  git: (args: string[]) => { status: number | null; stdout: string };
}): { errors: string[]; warnings: string[]; info: string[] };
export function evaluateJournalAppendOnly(previous: string, next: string): string[];
