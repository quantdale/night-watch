// Types for the semantic skip-identity policy
// (`bin/lib/semantic-skip-policy.mjs`).

export interface SkippedIdentity {
  readonly file: string;
  readonly line: number | null;
  readonly titlePath: readonly string[];
  readonly reason: string;
}

export interface SkipIdentityReport {
  readonly schemaVersion: 'nightwatch.skip-identity-report.v2';
  readonly skips: readonly SkippedIdentity[];
}

export type SemanticSkipPolicyResult =
  | 'PASS'
  | 'UNDECLARED_SKIP'
  | 'SKIP_POLICY_UNCONFIGURED'
  | 'SKIP_REPORT_MISSING'
  | 'SKIP_REPORT_INVALID';

export const SEMANTIC_SKIP_POLICY_VERSION: string;
export const SKIP_IDENTITY_REPORT_SCHEMA: string;

export function evaluateSemanticSkipIdentityReport(input: {
  readonly report?: unknown;
  readonly canonicalSkipIdentities?: unknown;
  readonly expectedSkipPolicy?: unknown;
}): {
  readonly result: SemanticSkipPolicyResult;
  readonly skipped: number;
  readonly declared?: number;
  readonly undeclared: readonly unknown[];
  readonly detail?: string;
};

export function evaluateSemanticSkipPolicyIdentities(input: {
  readonly identities?: readonly unknown[];
  readonly canonicalSkipIdentities?: unknown;
  readonly expectedSkipPolicy?: unknown;
}): {
  readonly result: SemanticSkipPolicyResult;
  readonly skipped: number;
  readonly declared?: number;
  readonly undeclared: readonly unknown[];
  readonly detail?: string;
};

export function skipCountDisagreement(
  reporterSkipped: number | null | undefined,
  identityReportSkipped: number | null | undefined,
): null | 'SKIP_COUNT_MISMATCH' | 'SKIP_COUNT_UNVERIFIABLE';
