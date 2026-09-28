// Types for the bin type-check ratchet judgement (bin/lib/typecheck-ratchet.mjs).

export interface RatchetError {
  readonly code: string;
  readonly detail: string;
}

export interface RatchetConfig {
  readonly perFile: ReadonlyMap<string, number>;
  readonly totalCeiling: number | null;
  readonly anyAnnotationBudget: number | null;
}

export function countDiagnosticSilencingAnnotations(
  sources: Iterable<{ file: string; source: string }>,
): number;

export function judgeRatchet(input: {
  perFile: ReadonlyMap<string, number>;
  total?: number | undefined;
  annotations: number;
  config: RatchetConfig;
}): RatchetError[];
