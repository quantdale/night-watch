// Types for the certification producers (`bin/lib/certify-producers.mjs`).
export interface CiObservation { runId: string; conclusion: string }
export interface ProducerIo {
  git(args: string[]): string | null;
  projectVerdict(): Record<string, unknown> | null;
  runCommand(argv: readonly string[]): { status: number | null };
  observeCi(sha: string): CiObservation | null;
}
export interface ProducerResult { ok: boolean; code: string; receipt: Record<string, unknown> | null }
export function commandDigest(argv: readonly string[]): string;
export function produceCertificationReceipt(input: { subject: string; io: ProducerIo }): ProducerResult;
export function selectCiObservation(runs: unknown, sha: string): CiObservation | null;
