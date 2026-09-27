// ---------------------------------------------------------------------------
// M5 (6.13, C-26/C-28) — the minimal product run receipt.
//
// A campaign run used to leave an owner-local checkpoint and a result document,
// and nothing that answered the operator's first three questions: did the
// provider actually answer, did any approved sibling repository change while
// the run was happening, and what did the run persist? The receipt answers
// exactly those, from mechanical observations:
//
//   provider health + attribution   (the M5 termination class and per-class
//                                    failure tally)
//   sibling identity BEFORE/AFTER   (HEAD sha, porcelain digest, diff digest,
//                                    for EVERY approved repository)
//   leak scan                       (bounded sentinel screening of the run's own
//                                    result text; counts only, never values)
//   persisted admission record ids  (the durable agent-finding records)
//
// The receipt is written next to the D-7 run artifacts (manifest.json and
// summary.json) so a later reader can find both the run identity and the
// mechanical facts. Node fs authority only: no network, child process, or AI.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';

import { RunRecorder } from '../evidence/runRecorder';
import type { RepoSnapshotRecord } from '../evidence/types';
import { containsPrivatePayloadShape, containsSecretOrSentinelShape } from '../policy/privateScreening';
import {
  siblingIdentityStable,
  snapshotSiblingIdentity,
  type SiblingIdentityObservation,
} from '../ownerLocalReproduction/provider';
import type { ProviderFailureAttribution, ProviderTerminationClass } from './providerAttribution';

export const PRODUCT_RUN_RECEIPT_VERSION = 'nightwatch.product-run-receipt.v1' as const;

/** Bounded leak-scan input: the run's own result text, never raw evidence. */
export const LEAK_SCAN_MAX_CHARS = 512_000;

export interface ProductRunSiblingIdentity {
  readonly repository: string;
  readonly headSha: string;
  readonly statusDigest: string;
  /** Digest of `git diff HEAD --stat` for the same repository. */
  readonly diffDigest: string;
}

export interface ProductRunReceipt {
  readonly schemaVersion: typeof PRODUCT_RUN_RECEIPT_VERSION;
  readonly campaignId: string;
  readonly generatedAt: string;
  readonly terminationReason: string;
  readonly terminationClass: ProviderTerminationClass;
  readonly providerHealth: {
    readonly totalCalls: number;
    readonly completedCalls: number;
    readonly failures: number;
    readonly byClass: Readonly<Record<string, number>>;
  };
  readonly siblingsBefore: readonly ProductRunSiblingIdentity[];
  readonly siblingsAfter: readonly ProductRunSiblingIdentity[];
  /**
   * True when any approved repository's HEAD, porcelain digest or diff digest
   * changed between the two observations.
   */
  readonly siblingIdentityChanged: boolean;
  readonly leakScan: {
    readonly result: 'CLEAN' | 'LEAKS_FOUND';
    readonly findings: number;
    readonly scannedChars: number;
  };
  readonly persistedAdmissionIds: readonly string[];
  readonly reproductionCount: number;
  readonly toolActionCount: number;
}

export interface ProductRunReceiptInput {
  readonly root: string;
  readonly campaignId: string;
  readonly result: {
    readonly terminationReason: string;
    readonly providerAttribution: ProviderFailureAttribution;
    readonly persistedFindings: readonly { readonly dossierId: string }[];
    readonly reproductionCount: number;
    readonly toolActionCount: number;
    readonly investigationScope?: readonly string[] | undefined;
  };
  /** Approved repository ids (`org/repo`) whose identity is observed. */
  readonly repositoryIds: readonly string[];
  /** Observations taken BEFORE the run (same order as `repositoryIds`). */
  readonly before: readonly SiblingIdentityObservation[];
  readonly siblingRoot?: string;
  readonly now?: () => Date;
  readonly scanText?: string;
}

export interface EmittedProductRunReceipt {
  readonly runId: string;
  readonly dir: string;
  readonly manifestFile: string;
  readonly summaryFile: string;
  readonly receiptFile: string;
  readonly receipt: ProductRunReceipt;
}

function identityOf(observation: SiblingIdentityObservation): ProductRunSiblingIdentity {
  return Object.freeze({
    repository: observation.repository,
    headSha: observation.headSha,
    statusDigest: observation.statusDigest,
    diffDigest: observation.diffDigest ?? '',
  });
}

function sameIdentity(
  before: readonly ProductRunSiblingIdentity[],
  after: readonly ProductRunSiblingIdentity[],
): boolean {
  if (before.length !== after.length) return false;
  const key = (entry: ProductRunSiblingIdentity): string =>
    `${entry.repository}\u0000${entry.headSha}\u0000${entry.statusDigest}\u0000${entry.diffDigest}`;
  const beforeKeys = before.map(key).sort();
  const afterKeys = after.map(key).sort();
  return beforeKeys.every((value, index) => value === afterKeys[index]);
}

/**
 * Bounded sentinel screening over the run's own result text. Counts only: the
 * scan never records or echoes the matched value.
 */
export function scanForLeaks(text: string): { readonly result: 'CLEAN' | 'LEAKS_FOUND'; readonly findings: number; readonly scannedChars: number } {
  const bounded = typeof text === 'string' ? text.slice(0, LEAK_SCAN_MAX_CHARS) : '';
  const shape = containsPrivatePayloadShape(bounded) ? 1 : 0;
  const sentinel = containsSecretOrSentinelShape(bounded) ? 1 : 0;
  const findings = shape + sentinel;
  return Object.freeze({
    result: findings === 0 ? 'CLEAN' : 'LEAKS_FOUND',
    findings,
    scannedChars: bounded.length,
  });
}

export function buildProductRunReceipt(input: {
  readonly campaignId: string;
  readonly generatedAt: string;
  readonly result: ProductRunReceiptInput['result'];
  readonly before: readonly SiblingIdentityObservation[];
  readonly after: readonly SiblingIdentityObservation[];
  readonly leakScan: ProductRunReceipt['leakScan'];
}): ProductRunReceipt {
  const before = input.before.map(identityOf);
  const after = input.after.map(identityOf);
  const attribution = input.result.providerAttribution;
  return Object.freeze({
    schemaVersion: PRODUCT_RUN_RECEIPT_VERSION,
    campaignId: input.campaignId,
    generatedAt: input.generatedAt,
    terminationReason: input.result.terminationReason,
    terminationClass: attribution.terminationClass,
    providerHealth: Object.freeze({
      totalCalls: attribution.totalCalls,
      completedCalls: attribution.completedCalls,
      failures: attribution.failures,
      byClass: attribution.byClass,
    }),
    siblingsBefore: Object.freeze(before),
    siblingsAfter: Object.freeze(after),
    siblingIdentityChanged: !sameIdentity(before, after),
    leakScan: input.leakScan,
    persistedAdmissionIds: Object.freeze(
      input.result.persistedFindings.map((entry) => entry.dossierId).sort((a, b) => a.localeCompare(b)),
    ),
    reproductionCount: input.result.reproductionCount,
    toolActionCount: input.result.toolActionCount,
  });
}

export interface ValidateProductRunReceiptResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

/** Strict, fail-closed validation of a persisted receipt. */
export function validateProductRunReceipt(value: unknown): ValidateProductRunReceiptResult {
  const errors: string[] = [];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, errors: ['receipt is not an object'] };
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== PRODUCT_RUN_RECEIPT_VERSION) errors.push('schemaVersion');
  if (typeof record.campaignId !== 'string' || record.campaignId.length === 0) errors.push('campaignId');
  if (typeof record.generatedAt !== 'string' || Number.isNaN(Date.parse(record.generatedAt))) errors.push('generatedAt');
  if (typeof record.terminationReason !== 'string') errors.push('terminationReason');
  if (record.terminationClass !== 'VALID_PROVIDER_RUN'
    && record.terminationClass !== 'PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION'
    && record.terminationClass !== 'PROVIDER_DEGRADED') {
    errors.push('terminationClass');
  }
  const health = record.providerHealth;
  if (typeof health !== 'object' || health === null) {
    errors.push('providerHealth');
  } else {
    const healthRecord = health as Record<string, unknown>;
    for (const field of ['totalCalls', 'completedCalls', 'failures'] as const) {
      const entry = healthRecord[field];
      if (typeof entry !== 'number' || !Number.isInteger(entry) || entry < 0) errors.push(`providerHealth.${field}`);
    }
    if (typeof healthRecord.byClass !== 'object' || healthRecord.byClass === null || Array.isArray(healthRecord.byClass)) {
      errors.push('providerHealth.byClass');
    }
  }
  for (const field of ['siblingsBefore', 'siblingsAfter'] as const) {
    const entries = record[field];
    if (!Array.isArray(entries)) {
      errors.push(field);
      continue;
    }
    for (const [index, entry] of entries.entries()) {
      if (typeof entry !== 'object' || entry === null) {
        errors.push(`${field}[${index}]`);
        continue;
      }
      const item = entry as Record<string, unknown>;
      if (typeof item.repository !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(item.repository)) {
        errors.push(`${field}[${index}].repository`);
      }
      if (typeof item.headSha !== 'string' || !/^[0-9a-f]{40}$/.test(item.headSha)) errors.push(`${field}[${index}].headSha`);
      if (typeof item.statusDigest !== 'string' || item.statusDigest.length === 0) errors.push(`${field}[${index}].statusDigest`);
      if (typeof item.diffDigest !== 'string') errors.push(`${field}[${index}].diffDigest`);
    }
  }
  if (typeof record.siblingIdentityChanged !== 'boolean') errors.push('siblingIdentityChanged');
  // Both lists are produced from the SAME approved repository order, so they
  // must carry the same repositories in the same order. A receipt that drops
  // one side is not a weaker observation, it is a different claim.
  if (Array.isArray(record.siblingsBefore) && Array.isArray(record.siblingsAfter)) {
    const before = record.siblingsBefore as readonly { readonly repository?: unknown }[];
    const after = record.siblingsAfter as readonly { readonly repository?: unknown }[];
    if (before.length !== after.length) {
      errors.push('siblingsAfter.length');
    } else {
      for (const [index, entry] of before.entries()) {
        if (entry?.repository !== after[index]?.repository) errors.push(`siblingsAfter[${index}].repository`);
      }
    }
  }
  const leak = record.leakScan;
  if (typeof leak !== 'object' || leak === null) {
    errors.push('leakScan');
  } else {
    const leakRecord = leak as Record<string, unknown>;
    if (leakRecord.result !== 'CLEAN' && leakRecord.result !== 'LEAKS_FOUND') errors.push('leakScan.result');
    if (typeof leakRecord.findings !== 'number' || !Number.isInteger(leakRecord.findings) || leakRecord.findings < 0) {
      errors.push('leakScan.findings');
    }
  }
  if (!Array.isArray(record.persistedAdmissionIds) || record.persistedAdmissionIds.some((entry) => typeof entry !== 'string')) {
    errors.push('persistedAdmissionIds');
  }
  for (const field of ['reproductionCount', 'toolActionCount'] as const) {
    const entry = record[field];
    if (typeof entry !== 'number' || !Number.isInteger(entry) || entry < 0) errors.push(field);
  }
  return { ok: errors.length === 0, errors };
}

/** Snapshot the identity of every approved repository, in the given order. */
export async function observeSiblings(
  repositoryIds: readonly string[],
  siblingRoot?: string,
): Promise<readonly SiblingIdentityObservation[]> {
  const observations: SiblingIdentityObservation[] = [];
  for (const repository of repositoryIds) {
    const observation = await snapshotSiblingIdentity(
      siblingRoot === undefined ? { repository } : { repository, siblingRoot },
    );
    if (observation !== null) observations.push(observation);
  }
  return Object.freeze(observations);
}

function repoSnapshotRecords(
  observations: readonly SiblingIdentityObservation[],
  at: string,
): RepoSnapshotRecord[] {
  return observations.map((observation) => ({
    path: observation.repository,
    branch: 'HEAD (recorded)',
    headSha: observation.headSha,
    upstream: null,
    aheadBehind: null,
    dirty: true,
    dirtyFileCount: 0,
    lastCommit: at,
    timestamp: at,
    ok: true,
  }));
}

/**
 * Emit the D-7 run artifacts plus the receipt for one campaign run. The run id
 * is unique per emission, so a repeated campaign never collides with a
 * previous run directory.
 */
export async function emitProductRunReceipt(input: ProductRunReceiptInput): Promise<EmittedProductRunReceipt> {
  const now = input.now ?? (() => new Date());
  const at = now().toISOString();
  const after = await observeSiblings(input.repositoryIds, input.siblingRoot);
  const leakScan = scanForLeaks(input.scanText ?? JSON.stringify(input.result));
  const receipt = buildProductRunReceipt({
    campaignId: input.campaignId,
    generatedAt: at,
    result: input.result,
    before: input.before,
    after,
    leakScan,
  });
  const validation = validateProductRunReceipt(receipt);
  if (!validation.ok) {
    throw new Error(`PRODUCT_RUN_RECEIPT_INVALID: ${validation.errors.join(', ')}`);
  }
  const runId = `nightwatch-${input.campaignId.replace(/[^A-Za-z0-9._-]/g, '-')}-${at.replace(/[^0-9]/g, '')}`;
  const recorder = new RunRecorder({
    runId,
    environment: 'local',
    product: 'campaign',
    browser: 'none',
    scenario: input.campaignId,
    artifactsRoot: path.join(input.root, 'artifacts'),
    now,
  });
  recorder.event({
    type: 'env',
    severity: 'info',
    message: 'campaign run completed',
    data: {
      terminationReason: receipt.terminationReason,
      terminationClass: receipt.terminationClass,
      providerFailures: receipt.providerHealth.failures,
      persistedAdmissions: receipt.persistedAdmissionIds.length,
    },
  });
  await recorder.writeRepositories(repoSnapshotRecords([...input.before, ...after], at));
  const summary = await recorder.finalize({
    passed:
      receipt.leakScan.result === 'CLEAN' &&
      !receipt.siblingIdentityChanged &&
      receipt.terminationClass !== 'PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION',
    notes: [
      `siblingIdentityChanged=${String(receipt.siblingIdentityChanged)}`,
      `leakScan=${receipt.leakScan.result}`,
    ],
  });
  void summary;
  const receiptFile = path.join(recorder.dir, 'product-run-receipt.json');
  fs.writeFileSync(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  return Object.freeze({
    runId,
    dir: recorder.dir,
    manifestFile: path.join(recorder.dir, 'manifest.json'),
    summaryFile: path.join(recorder.dir, 'summary.json'),
    receiptFile,
    receipt,
  });
}

export { siblingIdentityStable };
