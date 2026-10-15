// Types for the certification producers (`bin/lib/certify-producers.mjs`).
export interface CiObservation { runId: string; conclusion: string }
export interface MeasurementRun { status: number | null; preVerified: boolean }
export interface MeasurementExpectation { head: string; tree: string }
export interface MeasurementRoot {
  root: string;
  realpath: string | null;
  rootIsSymlink: boolean;
  topLevel: string | null;
  git(args: string[]): string | null;
  runCommand(argv: readonly string[], expect: MeasurementExpectation): MeasurementRun;
}
export interface ProducerIo {
  git(args: string[]): string | null;
  projectVerdict(): Record<string, unknown> | null;
  observeCi(sha: string): CiObservation | null;
  checkpointRangeClass(from: string, to: string): string | null;
  measurement: MeasurementRoot | null;
}
export interface ProducerResult { ok: boolean; code: string; receipt: Record<string, unknown> | null }
export function commandDigest(argv: readonly string[]): string;
export function produceCertificationReceipt(input: { subject: string; io: ProducerIo }): ProducerResult;
export function selectCiObservation(runs: unknown, sha: string): CiObservation | null;
export const ALLOWED_IGNORED_INPUTS: readonly string[];
