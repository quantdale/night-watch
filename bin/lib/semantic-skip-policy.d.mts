// Types for the semantic skip-identity policy
// (`bin/lib/semantic-skip-policy.mjs`).

export interface SkippedIdentity {
  readonly file: string;
  readonly line: number | null;
  readonly title: string;
  readonly reason: string;
}

export const SEMANTIC_SKIP_POLICY_VERSION: string;

export function collectSkippedIdentities(report: unknown): SkippedIdentity[];
export function evaluateSemanticSkipPolicy(input: {
  readonly report?: unknown;
  readonly canonicalSkipIdentities?: unknown;
  readonly expectedSkipPolicy?: unknown;
}): {
  readonly result: 'PASS' | 'UNDECLARED_SKIP' | 'SKIP_POLICY_UNCONFIGURED';
  readonly skipped: number;
  readonly declared?: number;
  readonly undeclared: readonly SkippedIdentity[];
  readonly detail?: string;
};
