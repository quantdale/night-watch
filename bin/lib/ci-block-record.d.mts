// Types for group 3's exact-head CI authority judgement
// (`bin/lib/ci-block-record.mjs`). Pure: caller supplies the record and date.

export interface CiDiagnostic {
  readonly code: string;
  readonly detail: string;
}

export interface CiBlockStaleFinding {
  readonly code: string;
  readonly detail: string;
  readonly ownerAction: string | null;
}

export interface CiExecutionClassification {
  readonly classification: string;
  readonly canSetCiExecutedSha: boolean;
  readonly reason: string;
}

export interface CiExecutionField {
  ciObservedSha: string | null;
  ciExecutedSha: string | null;
  ciStatus: string | null;
}

export interface CiExecutionApplication {
  readonly field: CiExecutionField;
  readonly changed: boolean;
  readonly refused: boolean;
  readonly code: string | null;
  readonly classification: string;
}

export interface CiCertificationInput {
  readonly completionStatus?: string | null;
  readonly certifiedCheckpointSha?: string | null;
  readonly releaseCheckpointSha?: string | null;
  readonly ciObservedSha?: string | null;
  readonly ciExecutedSha?: string | null;
  readonly ciStatus?: string | null;
}

export interface CiCertificationJudgement {
  readonly ok: boolean;
  readonly errors: readonly CiDiagnostic[];
}

export interface CiRouteCandidate {
  readonly routeId: string;
  readonly summary: string;
  readonly command: string;
  readonly source?: string;
  readonly provesGitHubExecution?: boolean;
  readonly canSetCiExecutedSha?: boolean;
  readonly tradeOffs?: readonly string[];
  readonly [key: string]: unknown;
}

export interface CiRouteJudgement {
  readonly ok: boolean;
  readonly routes: readonly CiRouteCandidate[];
  readonly errors: readonly CiDiagnostic[];
}

export const CI_BLOCK_RECORD_SCHEMA: 'nightwatch.ci-block-record.v1';
export const CI_BLOCK_CLASSES: readonly string[];
export const CI_CERTIFIED_COMPLETION_STATUSES: readonly string[];
export const CI_EXECUTION_EVIDENCE_SOURCES: readonly string[];

export function validateCiBlockRecord(record: unknown): { readonly ok: boolean; readonly errors: readonly CiDiagnostic[] };
export function collectCiBlockStale(record: unknown, todayIso: string): readonly CiBlockStaleFinding[];
export function classifyCiExecutionEvidence(evidence: unknown): CiExecutionClassification;
export function applyCiExecutionEvidence(field: CiExecutionField, evidence: unknown): CiExecutionApplication;
export function evaluateCiCertification(input: CiCertificationInput): CiCertificationJudgement;
export function validateCiRouteCandidates(record: unknown): CiRouteJudgement;
