// Machine-readable execution accounting for one validation shard.
//
// This module is pure: it has no filesystem, process, environment, or network
// authority. The Playwright reporter produces the receipt; the shard runner
// parses and classifies it. Human-readable test summaries are deliberately not
// an input to PASS/FAIL decisions.

export const SHARD_EXECUTION_RECEIPT_SCHEMA = 'nightwatch.shard-execution-receipt.v1' as const;
export const MAX_SHARD_EXECUTION_RECEIPT_BYTES = 64 * 1024;
export const MAX_SHARD_TEST_COUNT = 1_000_000;

const SAFE_SHARD_ID = /^[A-Za-z0-9._-]{1,128}$/;
const RECEIPT_KEYS = [
  'schemaVersion',
  'shardId',
  'playwrightStatus',
  'planned',
  'executed',
  'passed',
  'failed',
  'skipped',
  'didNotRun',
  'unknown',
] as const;
const COUNT_KEYS = ['planned', 'executed', 'passed', 'failed', 'skipped', 'didNotRun', 'unknown'] as const;

export type ShardPlaywrightStatus = 'passed' | 'failed' | 'timedOut' | 'interrupted';
export type ShardExecutionDisposition =
  | 'PASS'
  | 'ALL_SKIPPED'
  | 'NO_TESTS_EXECUTED'
  | 'TESTS_FAILED'
  | 'UNKNOWN';

export interface ShardExecutionCounts {
  readonly planned: number;
  readonly executed: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly didNotRun: number;
  readonly unknown: number;
}

export interface ShardExecutionReceipt {
  readonly schemaVersion: typeof SHARD_EXECUTION_RECEIPT_SCHEMA;
  readonly shardId: string;
  readonly playwrightStatus: ShardPlaywrightStatus;
  readonly planned: number;
  readonly executed: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly didNotRun: number;
  readonly unknown: number;
}

export type ShardReceiptParseCode =
  | 'SHARD_RECEIPT_MISSING'
  | 'SHARD_RECEIPT_UNREADABLE'
  | 'SHARD_RECEIPT_TOO_LARGE'
  | 'SHARD_RECEIPT_MALFORMED'
  | 'SHARD_RECEIPT_INVALID'
  | 'SHARD_RECEIPT_INCONSISTENT'
  | 'SHARD_RECEIPT_SHARD_MISMATCH';

export type ShardReceiptParseResult =
  | { readonly ok: true; readonly receipt: ShardExecutionReceipt; readonly disposition: ShardExecutionDisposition }
  | { readonly ok: false; readonly code: ShardReceiptParseCode };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= MAX_SHARD_TEST_COUNT;
}

function isPlaywrightStatus(value: unknown): value is ShardPlaywrightStatus {
  return value === 'passed' || value === 'failed' || value === 'timedOut' || value === 'interrupted';
}

function hasExactKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value).sort();
  const expected = [...RECEIPT_KEYS].sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function validateReceipt(value: unknown, expectedShardId?: string): ShardReceiptParseResult {
  if (!isRecord(value) || !hasExactKeys(value)) return { ok: false, code: 'SHARD_RECEIPT_INVALID' };
  if (value.schemaVersion !== SHARD_EXECUTION_RECEIPT_SCHEMA) return { ok: false, code: 'SHARD_RECEIPT_MALFORMED' };
  if (typeof value.shardId !== 'string' || !SAFE_SHARD_ID.test(value.shardId)) return { ok: false, code: 'SHARD_RECEIPT_INVALID' };
  if (expectedShardId !== undefined && value.shardId !== expectedShardId) return { ok: false, code: 'SHARD_RECEIPT_SHARD_MISMATCH' };
  if (!isPlaywrightStatus(value.playwrightStatus)) return { ok: false, code: 'SHARD_RECEIPT_INVALID' };
  for (const key of COUNT_KEYS) {
    if (!isCount(value[key])) return { ok: false, code: 'SHARD_RECEIPT_INVALID' };
  }
  const receipt: ShardExecutionReceipt = {
    schemaVersion: SHARD_EXECUTION_RECEIPT_SCHEMA,
    shardId: value.shardId,
    playwrightStatus: value.playwrightStatus,
    planned: value.planned as number,
    executed: value.executed as number,
    passed: value.passed as number,
    failed: value.failed as number,
    skipped: value.skipped as number,
    didNotRun: value.didNotRun as number,
    unknown: value.unknown as number,
  };
  if (receipt.executed !== receipt.passed + receipt.failed + receipt.skipped + receipt.unknown
    || receipt.planned !== receipt.executed + receipt.didNotRun) {
    return { ok: false, code: 'SHARD_RECEIPT_INCONSISTENT' };
  }
  return { ok: true, receipt, disposition: dispositionFor(receipt) };
}

export function dispositionFor(receipt: ShardExecutionReceipt): ShardExecutionDisposition {
  if (receipt.unknown > 0) return 'UNKNOWN';
  if (receipt.didNotRun > 0) return 'TESTS_FAILED';
  if (receipt.planned === 0 || receipt.executed === 0) return 'NO_TESTS_EXECUTED';
  if (receipt.passed === 0 && receipt.skipped === receipt.executed) return 'ALL_SKIPPED';
  if (receipt.failed > 0 || receipt.playwrightStatus !== 'passed') return 'TESTS_FAILED';
  return 'PASS';
}

export function createShardExecutionReceipt(input: {
  readonly shardId: string;
  readonly playwrightStatus: ShardPlaywrightStatus;
  readonly planned: number;
  readonly executed: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly didNotRun: number;
  readonly unknown: number;
}): ShardExecutionReceipt {
  const receipt: ShardExecutionReceipt = {
    schemaVersion: SHARD_EXECUTION_RECEIPT_SCHEMA,
    shardId: input.shardId,
    playwrightStatus: input.playwrightStatus,
    planned: input.planned,
    executed: input.executed,
    passed: input.passed,
    failed: input.failed,
    skipped: input.skipped,
    didNotRun: input.didNotRun,
    unknown: input.unknown,
  };
  const result = validateReceipt(receipt, input.shardId);
  if (!result.ok) throw new Error(result.code);
  return receipt;
}

export function serializeShardExecutionReceipt(receipt: ShardExecutionReceipt): string {
  const serialized = `${JSON.stringify(receipt)}\n`;
  if (Buffer.byteLength(serialized, 'utf8') > MAX_SHARD_EXECUTION_RECEIPT_BYTES) throw new Error('SHARD_RECEIPT_TOO_LARGE');
  return serialized;
}

export function parseShardExecutionReceipt(serialized: string, expectedShardId?: string): ShardReceiptParseResult {
  if (Buffer.byteLength(serialized, 'utf8') > MAX_SHARD_EXECUTION_RECEIPT_BYTES) return { ok: false, code: 'SHARD_RECEIPT_TOO_LARGE' };
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return { ok: false, code: 'SHARD_RECEIPT_MALFORMED' };
  }
  return validateReceipt(value, expectedShardId);
}
