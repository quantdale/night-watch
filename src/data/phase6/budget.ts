import crypto from 'node:crypto';
import type { QueryBudgetSnapshot, RuntimeDataScope, ValidatedReadPlan } from './types';

export const PHASE6_REAL_QUERY_MAX = 6;
export const PHASE6_REAL_ROW_MAX = 3000;
export const PHASE6_REAL_BYTE_MAX = 16 * 1024 * 1024;

export interface QueryPermit {
  readonly permitId: string;
  readonly oracleId: string;
  readonly planId: string;
  readonly phase: 'FIRST' | 'FRESH_REPLAY';
  readonly scopeFingerprint: string;
}

function scopeFingerprint(scope: RuntimeDataScope, plan: ValidatedReadPlan): string {
  const values = plan.plan.scopeRoles.map((role) => [role, scope[role] ?? ''] as const);
  return crypto.createHash('sha256').update(JSON.stringify(values), 'utf8').digest('hex').slice(0, 24);
}

export class QueryBudgetManager {
  private usedQueries = 0;
  private usedRows = 0;
  private usedBytes = 0;
  private readonly seen = new Set<string>();

  constructor(
    private readonly maxQueries = PHASE6_REAL_QUERY_MAX,
    private readonly maxRows = PHASE6_REAL_ROW_MAX,
    private readonly maxBytes = PHASE6_REAL_BYTE_MAX,
  ) {}

  begin(oracleId: string, plan: ValidatedReadPlan, scope: RuntimeDataScope, phase: QueryPermit['phase'], estimatedBytes = 0): QueryPermit {
    const scopeKey = scopeFingerprint(scope, plan);
    const dedupeKey = `${oracleId}|${plan.plan.planId}|${phase}|${scopeKey}`;
    if (this.seen.has(dedupeKey)) throw new Error('QUERY_DUPLICATE_WITHIN_RUN');
    if (this.usedQueries >= this.maxQueries) throw new Error('QUERY_BUDGET_EXCEEDED');
    if (!Number.isInteger(estimatedBytes) || estimatedBytes < 0 || estimatedBytes > this.maxBytes) throw new Error('QUERY_COST_BUDGET_EXCEEDED');
    this.seen.add(dedupeKey);
    this.usedQueries += 1;
    return {
      permitId: `phase6-permit-${this.usedQueries}`,
      oracleId,
      planId: plan.plan.planId,
      phase,
      scopeFingerprint: scopeKey,
    };
  }

  complete(_permit: QueryPermit, rows: number, bytes: number): void {
    if (!Number.isInteger(rows) || rows < 0 || rows > this.maxRows) throw new Error('QUERY_CARDINALITY_EXCEEDED_EXPECTATION');
    if (!Number.isInteger(bytes) || bytes < 0 || bytes > this.maxBytes) throw new Error('QUERY_RESULT_BYTES_EXCEEDED');
    this.usedRows += rows;
    this.usedBytes += bytes;
    if (this.usedRows > this.maxRows || this.usedBytes > this.maxBytes) throw new Error('QUERY_RUN_BUDGET_EXCEEDED');
  }

  snapshot(): QueryBudgetSnapshot {
    return {
      maxQueries: this.maxQueries,
      usedQueries: this.usedQueries,
      remainingQueries: this.maxQueries - this.usedQueries,
      maxRows: this.maxRows,
      usedRows: this.usedRows,
      maxBytes: this.maxBytes,
      usedBytes: this.usedBytes,
    };
  }
}
