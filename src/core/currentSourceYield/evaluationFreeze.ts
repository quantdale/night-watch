// ---------------------------------------------------------------------------
// W13 evaluation freeze integrity (Phase B, task 12.x). LOCAL only.
//
// The freeze is committed before the first investigative call. Its canonical
// fingerprint covers every bound dimension; a mutation changes the
// fingerprint and a resume whose run identity or scope leaves the frozen
// matrix fails closed. Pure/data-only: no I/O or provider authority.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';

import { checkRuntimeBudgetEnvelope, type RuntimeBudgetEnvelope } from '../agentRuntime/runtimeBudgetEnvelope';

export const EVALUATION_FREEZE_SCHEMA_VERSION = 'nightwatch.w13-evaluation-freeze.v1' as const;

export class EvaluationFreezeError extends Error {
  readonly code: string;
  readonly fields: readonly string[];
  constructor(code: string, detail: string, fields: readonly string[] = []) {
    super(`${code}: ${detail}`);
    this.name = 'EvaluationFreezeError';
    this.code = code;
    this.fields = fields;
  }
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}

export function evaluationFreezePayload(freeze: Record<string, unknown>): string {
  const copy: Record<string, unknown> = { ...freeze };
  delete copy.freezeFingerprint;
  return canonical(copy);
}

export function computeEvaluationFreezeFingerprint(freeze: Record<string, unknown>): string {
  return `sha256:${crypto.createHash('sha256').update(evaluationFreezePayload(freeze)).digest('hex').slice(0, 24)}`;
}

export function collectFreezeFieldPaths(left: unknown, right: unknown, prefix = ''): string[] {
  if (left === right) return [];
  if (Array.isArray(left) && Array.isArray(right)) {
    const paths: string[] = [];
    if (left.length !== right.length) paths.push(`${prefix}.length`);
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      paths.push(...collectFreezeFieldPaths(left[index], right[index], `${prefix}[${index}]`));
    }
    return paths.length > 0 ? paths : prefix === '' ? [] : [prefix];
  }
  if (left !== null && right !== null && typeof left === 'object' && typeof right === 'object' && !Array.isArray(left) && !Array.isArray(right)) {
    const paths: string[] = [];
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of [...keys].sort()) {
      const childPrefix = prefix === '' ? key : `${prefix}.${key}`;
      paths.push(...collectFreezeFieldPaths((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key], childPrefix));
    }
    return paths;
  }
  return prefix === '' ? ['freeze'] : [prefix];
}

export function assertEvaluationFreezeUnchanged(committed: {
  readonly freezeFingerprint: string;
  readonly freeze: Record<string, unknown>;
}, current: Record<string, unknown>): void {
  const recomputed = computeEvaluationFreezeFingerprint(current);
  if (recomputed === committed.freezeFingerprint) return;
  const changed = collectFreezeFieldPaths(committed.freeze, current).filter((path) => path !== 'freezeFingerprint');
  throw new EvaluationFreezeError(
    'EVALUATION_FREEZE_FINGERPRINT_MISMATCH',
    `committed ${committed.freezeFingerprint} != recomputed ${recomputed}; changed fields: ${changed.length > 0 ? changed.join(', ') : 'unknown'}`,
    changed,
  );
}

export interface FrozenMatrixEntry {
  readonly runId: string;
  readonly kind: 'BROAD_ALL_REPOSITORIES' | 'REPOSITORY_SCOPED';
  readonly repositoryScope: string | null;
  readonly wallClockCeilingMs: number;
}

/**
 * A resume may only continue a frozen run under exactly its frozen scope. A
 * widened scope (null requested for a scoped run, a different repository, or
 * an unknown run id) fails closed before any provider call.
 */
export function assertResumeWithinFrozenMatrix(matrix: readonly FrozenMatrixEntry[], request: {
  readonly runId: string;
  readonly repositoryScope: string | null;
}): FrozenMatrixEntry {
  const frozen = matrix.find((entry) => entry.runId === request.runId);
  if (frozen === undefined) {
    throw new EvaluationFreezeError('EVALUATION_FREEZE_UNKNOWN_RUN', `run ${request.runId} is not in the frozen matrix`, ['runId']);
  }
  if (frozen.repositoryScope !== request.repositoryScope) {
    throw new EvaluationFreezeError(
      'EVALUATION_FREEZE_WIDENED_RESUME',
      `run ${request.runId} was frozen at scope ${frozen.repositoryScope ?? 'ALL_APPROVED'}; resume requested ${request.repositoryScope ?? 'ALL_APPROVED'}`,
      ['repositoryScope'],
    );
  }
  return frozen;
}

export function validateEvaluationFreeze(freeze: unknown, options: { readonly derivedBudgetEnvelope?: RuntimeBudgetEnvelope } = {}): {
  readonly ok: true;
} | { readonly ok: false; readonly violations: readonly string[] } {
  const violations: string[] = [];
  if (freeze === null || typeof freeze !== 'object' || Array.isArray(freeze)) {
    return { ok: false, violations: ['freeze is not an object'] };
  }
  const record = freeze as Record<string, unknown>;
  if (record.schemaVersion !== EVALUATION_FREEZE_SCHEMA_VERSION) {
    return { ok: false, violations: [`schemaVersion must be ${EVALUATION_FREEZE_SCHEMA_VERSION}`] };
  }
  const matrix = Array.isArray(record.matrix) ? record.matrix : null;
  let broadRuns = 0;
  let scopedRuns = 0;
  if (matrix === null || matrix.length !== 9) {
    violations.push('matrix must contain exactly nine runs (one broad plus eight scoped)');
  } else {
    const runIds = new Set<string>();
    for (const entry of matrix) {
      const item = entry as Record<string, unknown>;
      if (typeof item.runId !== 'string' || item.runId.length === 0) violations.push('matrix entry without runId');
      else if (runIds.has(item.runId)) violations.push(`duplicate runId ${item.runId}`);
      else runIds.add(item.runId);
      if (typeof item.wallClockCeilingMs !== 'number' || !Number.isSafeInteger(item.wallClockCeilingMs) || item.wallClockCeilingMs <= 0) {
        violations.push(`run ${String(item.runId)} has no positive wall-clock ceiling`);
      }
      if (item.kind === 'BROAD_ALL_REPOSITORIES') {
        broadRuns += 1;
        if (item.repositoryScope !== null) violations.push(`broad run ${String(item.runId)} must have repositoryScope null`);
      } else if (item.kind === 'REPOSITORY_SCOPED') {
        scopedRuns += 1;
        if (typeof item.repositoryScope !== 'string' || item.repositoryScope.length === 0) {
          violations.push(`scoped run ${String(item.runId)} must have a repository scope`);
        }
      } else {
        violations.push(`run ${String(item.runId)} has an unknown kind ${String(item.kind)}`);
      }
    }
    if (broadRuns !== 1) violations.push(`matrix must contain exactly one broad run (found ${broadRuns})`);
    if (scopedRuns !== 8) violations.push(`matrix must contain exactly eight scoped runs (found ${scopedRuns})`);
  }
  const universe = record.universe as Record<string, unknown> | undefined;
  if (universe === undefined || !Array.isArray(universe.repositoryOrder) || universe.repositoryOrder.length !== 8) {
    violations.push('universe.repositoryOrder must name exactly eight repositories');
  } else if (matrix !== null && Array.isArray(matrix)) {
    const order = universe.repositoryOrder as string[];
    const scopedScopes = matrix
      .map((entry) => (entry as Record<string, unknown>).repositoryScope)
      .filter((scope): scope is string => typeof scope === 'string');
    for (const repository of order) {
      if (!scopedScopes.includes(repository)) violations.push(`repository ${repository} has no frozen scoped run`);
    }
  }
  if (record.frozenBeforeInvestigativeCall !== true) violations.push('frozenBeforeInvestigativeCall must be true');
  if (record.providerExhaustionBehavior !== 'PROVIDER_BLOCKED') violations.push('providerExhaustionBehavior must be PROVIDER_BLOCKED');
  if (options.derivedBudgetEnvelope !== undefined) {
    const checked = checkRuntimeBudgetEnvelope(record.runtimeBudgetEnvelope, options.derivedBudgetEnvelope);
    if (!checked.ok) violations.push(checked.code === 'RUNTIME_BUDGET_ENVELOPE_MISMATCH'
      ? `runtimeBudgetEnvelope disagrees with the engine on ${checked.mismatches.map((item) => item.field).join(', ')}`
      : checked.detail);
  }
  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}
