// Types for the canonical claim journal (`bin/lib/claim-journal.mjs`).
export const CLAIM_JOURNAL_PATH: string;
export const CLAIM_JOURNAL_PROTOCOL: string;
export interface Correction { claimId: string; oldLineSha256: string; reason: string; line: number }
export interface Claim { claimId: string; role: string; task: string; created: string; released: string; base: string; tip: string; rawLine: string }
export interface ParsedJournal { protocol: string | null; eraStartSha: string | null; gaps: Array<{ sha: string; reason: string }>; claims: Claim[]; corrections: Correction[]; errors: string[] }
export function claimLineDigest(line: string): string;
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
export function evaluateJournalAppendOnly(
  previous: string,
  next: string,
  corrections?: readonly Correction[],
): string[];
