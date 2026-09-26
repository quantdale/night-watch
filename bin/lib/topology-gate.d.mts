// Types for group 3's CI-topology gate judgement
// (`bin/lib/topology-gate.mjs`). Pure: capabilities, file texts and receipts
// are inputs; only `describeEnvelopePlan` builds an argv array and runs
// nothing.

export interface TopologyAbsence {
  readonly id: string;
  readonly title: string;
  readonly capability: string;
  readonly blockerCodes: readonly string[];
  readonly dependentLanes: readonly string[];
  readonly laneSuites: readonly string[];
  readonly expectedLane: 'PASS' | 'NOT_IN_AUTHORITATIVE_GATE';
  readonly expectedClaim: string;
}

export interface TopologyDiagnostic {
  readonly code: string;
  readonly detail: string;
}

export interface TopologyPathFinding {
  readonly code: string;
  readonly detail: string;
  readonly file: string;
  readonly line: number;
  readonly literal?: string;
  readonly command?: string;
}

export interface ResolvedMaskPath {
  readonly kind: 'file' | 'directory' | 'other' | 'absent';
  readonly path: string | null;
}

export interface EnvelopePlanInput {
  readonly absence: string;
  readonly worktree: string;
  readonly siblingRoot?: string | null;
  readonly chrome?: readonly string[];
  readonly playwrightBrowsersPath?: string | null;
  readonly freshHome?: string | null;
  readonly bwrapCandidates?: readonly string[];
  readonly resolveMaskPath: (candidate: string) => ResolvedMaskPath;
}

export interface TopologyLaneOutcome {
  readonly status: string;
  readonly detail?: string;
  readonly receipts?: Record<string, unknown> | null;
}

export interface AbsenceEvaluationInput {
  readonly absence: TopologyAbsence;
  readonly probe: unknown;
  readonly lane: TopologyLaneOutcome | null;
}

export interface InheritanceClaim {
  readonly lane: string;
  readonly detail: string;
}

export interface TopologyFile {
  readonly path: string;
  readonly text: string;
}

export interface TopologyRegistrationInput {
  readonly packageScripts: Record<string, string>;
  readonly universe: unknown;
  readonly gateManifestFiles: readonly string[];
  readonly binFile: string;
  readonly suiteFiles: readonly string[];
  readonly fileExists: (relative: string) => boolean;
}

export interface ProjectStateCiReads {
  readonly completionStatus: string | null;
  readonly certifiedCheckpointSha: string | null;
  readonly ciObservedSha: string;
  readonly ciExecutedSha: string;
  readonly ciStatus: string;
}

export const TOPOLOGY_GATE_SCHEMA: 'nightwatch.gate-topology-receipt.v1';
export const TOPOLOGY_REGRESSIONS_SCHEMA: 'nightwatch.topology-regressions.v1';
export const TOPOLOGY_ALWAYS_AVAILABLE_BINARIES: readonly string[];
export const TOPOLOGY_CAPABILITY_DECLARATIONS: readonly string[];
export const TOPOLOGY_ABSENCES: readonly TopologyAbsence[];

export function parseSiblingRoot(source: string): string | null;
export function canonicalBwrapCandidates(): readonly string[];
export function chromeCandidates(environment?: NodeJS.ProcessEnv): readonly string[];
export function describeEnvelopePlan(input: EnvelopePlanInput): readonly string[];
export function absenceTookEffect(absence: TopologyAbsence, probe: unknown): { readonly absent: boolean; readonly detail: string };
export function evaluateAbsence(input: AbsenceEvaluationInput): readonly TopologyDiagnostic[];
export function detectInheritanceClaim(absence: TopologyAbsence, receipts: Record<string, unknown> | null): InheritanceClaim | null;
export function scanExternalAbsolutePathDependence(input: {
  readonly files: readonly TopologyFile[];
  readonly declarations?: readonly { readonly file: string; readonly literal: string }[];
  readonly readFile?: (modulePath: string) => string | null;
}): readonly TopologyPathFinding[];
export function scanUndeclaredBinaryInvocation(input: {
  readonly files: readonly TopologyFile[];
  readonly declarations?: readonly { readonly file: string; readonly command: string }[];
}): readonly TopologyPathFinding[];
export function validateTopologyRegistration(input: TopologyRegistrationInput): readonly TopologyDiagnostic[];
export function certificationReadsRecord(block: {
  readonly completionStatus?: string | null;
  readonly certifiedCheckpointSha?: string | null;
  readonly ciObservedSha?: string | null;
  readonly ciExecutedSha?: string | null;
  readonly ciStatus?: string | null;
}): ProjectStateCiReads;
export function topologyReceiptDigest(receipt: unknown, sha256: (value: string) => string): string;
export function containsCredentialShapedToken(text: string): boolean;
