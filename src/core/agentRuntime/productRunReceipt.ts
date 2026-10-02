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

/**
 * CF-03 / VD-03: what KIND of campaign produced a receipt. Only a run through
 * the provider print adapter is a yield campaign; a custom reasoner script (the
 * deterministic smoke and test path) is honest local evidence that the launcher
 * works, never a yield result.
 */
export const CAMPAIGN_KINDS = ['PRINT_CLI_PROVIDER', 'CUSTOM_REASONER_SCRIPT'] as const;
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number];

/**
 * R3-06 / corrections task 8.5 — the campaign-level termination class. G12
 * accepts only COMPLETED_SUCCESSFULLY; a PAUSED, budget-exhausted, reasoner-
 * failed, cancelled, safety-blocked or no-progress run is never a yield
 * result even when its provider attribution is VALID_PROVIDER_RUN.
 */
export const CAMPAIGN_TERMINATIONS = [
  'COMPLETED_SUCCESSFULLY',
  'PAUSED',
  'BUDGET_EXHAUSTED',
  'REASONER_FAILURE',
  'CANCELLED',
  'SAFETY_BLOCKED',
  'NO_PROGRESS',
  'UNKNOWN',
] as const;
export type CampaignTermination = (typeof CAMPAIGN_TERMINATIONS)[number];

/** Map an agent termination reason to the campaign-level class. */
export function campaignTerminationOf(reason: unknown): CampaignTermination {
  if (reason === 'COMPLETE_WITH_FINDING' || reason === 'COMPLETE_NO_FINDING') return 'COMPLETED_SUCCESSFULLY';
  if (typeof reason === 'string' && (CAMPAIGN_TERMINATIONS as readonly string[]).includes(reason)) {
    return reason as CampaignTermination;
  }
  return 'UNKNOWN';
}

/**
 * R3-06 / corrections task 8.5 — the recorded reasoner identity. `kind` is
 * derived from the RESOLVED adapter (a print-adapter path), never from an
 * environment flag; the identity digest is the runtime's own `rid:` digest.
 */
export interface ProductRunReasonerIdentity {
  readonly kind: CampaignKind;
  readonly identityDigest: string | null;
  readonly printCliDigest: string | null;
  /** R5-15: the provider and model LABELS the run was attributed to (the `rid:` digest covers them). */
  readonly provider?: string | null;
  readonly model?: string | null;
}

/** The Nightwatch repository identity a run executed at (design D3 binding). */
export interface ProductRunNightwatchIdentity {
  readonly sha: string;
  readonly treeClean: boolean;
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
  /** CF-03: the Nightwatch HEAD the run executed at (absent on legacy receipts). */
  readonly nightwatchSha?: string;
  /** CF-03: whether the Nightwatch tree was clean when the run executed. */
  readonly nightwatchTreeClean?: boolean;
  /** CF-03: provider print adapter vs custom reasoner script. */
  readonly campaignKind?: CampaignKind;
  /** R3-06: the campaign-level termination class (absent on legacy receipts). */
  readonly campaignTermination?: CampaignTermination;
  /** R3-06: the resolved reasoner identity the run executed with. */
  readonly reasonerIdentity?: ProductRunReasonerIdentity | null;
  /** R3-06: per-reason termination counts, so a campaign's cases are named. */
  readonly caseTerminationCounts?: Readonly<Record<string, number>>;
}

export interface ProductRunReceiptInput {
  readonly root: string;
  readonly campaignId: string;
  readonly result: {
    readonly terminationReason: string;
    readonly terminationCounts?: Readonly<Record<string, number>> | undefined;
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
  /** CF-03: the Nightwatch repository identity at run time. */
  readonly nightwatchIdentity?: ProductRunNightwatchIdentity;
  /** CF-03: provider print adapter vs custom reasoner script. */
  readonly campaignKind?: CampaignKind;
  /** R3-06: the resolved reasoner identity (from the runtime, not the env). */
  readonly reasonerIdentity?: ProductRunReasonerIdentity | null;
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
  readonly nightwatchIdentity?: ProductRunNightwatchIdentity;
  readonly campaignKind?: CampaignKind;
  readonly reasonerIdentity?: ProductRunReasonerIdentity | null;
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
    ...(input.nightwatchIdentity === undefined
      ? {}
      : { nightwatchSha: input.nightwatchIdentity.sha, nightwatchTreeClean: input.nightwatchIdentity.treeClean }),
    ...(input.campaignKind === undefined ? {} : { campaignKind: input.campaignKind }),
    campaignTermination: campaignTerminationOf(input.result.terminationReason),
    ...(input.reasonerIdentity === undefined ? {} : { reasonerIdentity: input.reasonerIdentity }),
    caseTerminationCounts: Object.freeze(
      Object.fromEntries(
        Object.entries(input.result.terminationCounts ?? {})
          .filter(([, count]) => typeof count === 'number' && Number.isInteger(count) && count >= 0)
          .sort(([left], [right]) => left.localeCompare(right)),
      ),
    ),
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
  if (record.campaignTermination !== undefined
    && !(CAMPAIGN_TERMINATIONS as readonly string[]).includes(record.campaignTermination as string)) {
    errors.push('campaignTermination');
  }
  if (record.reasonerIdentity !== undefined && record.reasonerIdentity !== null) {
    const identity = record.reasonerIdentity as Record<string, unknown>;
    if (!(CAMPAIGN_KINDS as readonly string[]).includes(identity.kind as string)) errors.push('reasonerIdentity.kind');
    if (identity.identityDigest !== null && (typeof identity.identityDigest !== 'string' || !/^rid:sha256:[0-9a-f]{24,64}$/.test(identity.identityDigest))) {
      errors.push('reasonerIdentity.identityDigest');
    }
    if (identity.printCliDigest !== null && (typeof identity.printCliDigest !== 'string' || !/^sha256:[0-9a-f]{24,64}$/.test(identity.printCliDigest))) {
      errors.push('reasonerIdentity.printCliDigest');
    }
    for (const label of ['provider', 'model'] as const) {
      const value = identity[label];
      if (value !== undefined && value !== null && (typeof value !== 'string' || !/^[A-Za-z0-9._:/-]{1,128}$/.test(value))) {
        errors.push(`reasonerIdentity.${label}`);
      }
    }
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
  // CF-03 additive fields: optional (legacy receipts predate them), but when
  // present they must be well-formed so a malformed binding never reads as one.
  if (record.nightwatchSha !== undefined && (typeof record.nightwatchSha !== 'string' || !/^[0-9a-f]{40}$/.test(record.nightwatchSha))) {
    errors.push('nightwatchSha');
  }
  if (record.nightwatchTreeClean !== undefined && typeof record.nightwatchTreeClean !== 'boolean') errors.push('nightwatchTreeClean');
  if (record.campaignKind !== undefined && !(CAMPAIGN_KINDS as readonly unknown[]).includes(record.campaignKind)) errors.push('campaignKind');
  return { ok: errors.length === 0, errors };
}

export interface YieldCampaignEvaluation {
  readonly ok: boolean;
  readonly errors: readonly string[];
  /** BOUND: the run executed at the certified checkpoint. */
  readonly relation: 'BOUND' | 'BOUND_TO_OTHER' | 'INVALID';
  readonly summary: {
    readonly sha: string;
    readonly runId: string;
    readonly completedCalls: number;
    readonly reproductionCount: number;
    readonly admissions: number;
    readonly siblingsObserved: number;
  } | null;
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * R5-15 / review-5 task B4.1 — the record of the SINGLE authorized paid provider run (the parent's
 * task 12.3). A yield receipt qualifies only against a GRANTED record whose declared print-CLI
 * digest, provider and model it carries; a NOT_GRANTED record (the repository default) makes the
 * yield condition unreachable by any run. `declared` is all-null exactly when NOT_GRANTED.
 */
export const YIELD_RUN_AUTHORIZATION_VERSION = 'nightwatch.yield-run-authorization.v1' as const;
export interface YieldRunAuthorization {
  readonly grantId: string;
  readonly state: 'NOT_GRANTED' | 'GRANTED';
  readonly maxQualifyingRuns: number;
  readonly declared: {
    readonly printCliDigest: string | null;
    readonly provider: string | null;
    readonly model: string | null;
  };
}

/** Strict, closed-schema parse of the authorization record. */
export function parseYieldRunAuthorization(raw: unknown): { readonly ok: boolean; readonly errors: readonly string[]; readonly authorization: YieldRunAuthorization | null } {
  const errors: string[] = [];
  if (!isRecordValue(raw)) return { ok: false, errors: ['YIELD_AUTH_NOT_AN_OBJECT'], authorization: null };
  const allowed = ['schemaVersion', 'note', 'grantId', 'state', 'maxQualifyingRuns', 'declared'];
  for (const key of Object.keys(raw)) if (!allowed.includes(key)) errors.push(`YIELD_AUTH_UNKNOWN_KEY:${key.slice(0, 40)}`);
  if (raw.schemaVersion !== YIELD_RUN_AUTHORIZATION_VERSION) errors.push('YIELD_AUTH_SCHEMA_MISMATCH');
  if (typeof raw.grantId !== 'string' || !/^[a-z0-9._-]{1,40}$/.test(raw.grantId)) errors.push('YIELD_AUTH_GRANT_ID_INVALID');
  if (raw.state !== 'NOT_GRANTED' && raw.state !== 'GRANTED') errors.push('YIELD_AUTH_STATE_INVALID');
  if (typeof raw.maxQualifyingRuns !== 'number' || !Number.isInteger(raw.maxQualifyingRuns) || raw.maxQualifyingRuns < 1 || raw.maxQualifyingRuns > 3) errors.push('YIELD_AUTH_BUDGET_INVALID');
  const declared = raw.declared;
  let printCliDigest: string | null = null;
  let provider: string | null = null;
  let model: string | null = null;
  if (!isRecordValue(declared)) {
    errors.push('YIELD_AUTH_DECLARED_INVALID');
  } else {
    for (const key of Object.keys(declared)) if (!['printCliDigest', 'provider', 'model'].includes(key)) errors.push(`YIELD_AUTH_DECLARED_UNKNOWN_KEY:${key.slice(0, 40)}`);
    const digest = declared.printCliDigest;
    const label = (value: unknown) => (value === null || (typeof value === 'string' && /^[A-Za-z0-9._:/-]{1,128}$/.test(value)) ? (value as string | null) : undefined);
    if (digest !== null && (typeof digest !== 'string' || !/^sha256:[0-9a-f]{24,64}$/.test(digest))) errors.push('YIELD_AUTH_DECLARED_DIGEST_INVALID');
    else printCliDigest = digest as string | null;
    const declaredProvider = label(declared.provider);
    const declaredModel = label(declared.model);
    if (declaredProvider === undefined) errors.push('YIELD_AUTH_DECLARED_PROVIDER_INVALID'); else provider = declaredProvider;
    if (declaredModel === undefined) errors.push('YIELD_AUTH_DECLARED_MODEL_INVALID'); else model = declaredModel;
    const present = [printCliDigest, provider, model].filter((value) => value !== null).length;
    if (raw.state === 'GRANTED' && present !== 3) errors.push('YIELD_AUTH_GRANTED_WITHOUT_FULL_IDENTITY');
    if (raw.state === 'NOT_GRANTED' && present !== 0) errors.push('YIELD_AUTH_NOT_GRANTED_WITH_IDENTITY');
  }
  if (errors.length > 0) return { ok: false, errors, authorization: null };
  return {
    ok: true,
    errors: [],
    authorization: {
      grantId: raw.grantId as string,
      state: raw.state as 'NOT_GRANTED' | 'GRANTED',
      maxQualifyingRuns: raw.maxQualifyingRuns as number,
      declared: { printCliDigest, provider, model },
    },
  };
}

/**
 * VD-03 / CF-03 (design D3): the ONLY route to a G12 pass. A yield-campaign
 * receipt is the D-7 manifest + summary + product-run receipt of a run that
 * passed, executed at a recorded clean Nightwatch commit, through the provider
 * print adapter, with at least one completed provider call, a valid provider
 * class, an unchanged sibling identity and a clean leak scan. A smoke run, a
 * blocked provider, a dirty tree or a missing binding never qualifies. Zero
 * admissions are acceptable (a run may honestly find nothing); zero executed
 * calls are not. This function is pure.
 */
export function evaluateYieldCampaignEvidence(
  evidence: { readonly manifest: unknown; readonly summary: unknown; readonly receipt: unknown },
  certifiedCheckpointSha: string | null,
  authorization: YieldRunAuthorization | null,
): YieldCampaignEvaluation {
  const errors: string[] = [];
  const invalid = (): YieldCampaignEvaluation => ({ ok: false, errors, relation: 'INVALID', summary: null });
  if (!isRecordValue(evidence.manifest) || !isRecordValue(evidence.summary)) {
    errors.push('YIELD_RECEIPT_RUN_ARTIFACTS_MISSING');
    return invalid();
  }
  const validation = validateProductRunReceipt(evidence.receipt);
  if (!validation.ok) {
    errors.push(...validation.errors.slice(0, 3).map((code) => `YIELD_RECEIPT_INVALID:${code}`));
    return invalid();
  }
  const receipt = evidence.receipt as ProductRunReceipt;
  if (evidence.manifest.product !== 'campaign') errors.push('YIELD_RECEIPT_NOT_A_CAMPAIGN_RUN');
  if (evidence.summary.passed !== true) errors.push('YIELD_RECEIPT_RUN_NOT_PASSED');
  if (receipt.campaignKind !== 'PRINT_CLI_PROVIDER') errors.push(`YIELD_RECEIPT_NOT_A_PROVIDER_CAMPAIGN:${receipt.campaignKind ?? 'ABSENT'}`);
  // R3-06 / corrections task 8.5: a terminated-successfully campaign, proven
  // by the RECORDED reasoner identity (a print-adapter kind plus its runtime
  // identity digest), not by an environment flag.
  if (receipt.campaignTermination !== 'COMPLETED_SUCCESSFULLY') {
    errors.push(`YIELD_RECEIPT_CAMPAIGN_NOT_COMPLETED:${receipt.campaignTermination ?? 'ABSENT'}`);
  } else {
    // R3-06 / corrections task 8.5: a completed campaign must name its
    // per-case reasons — at least one case must have completed.
    const counts = receipt.caseTerminationCounts ?? {};
    const completedCases = (counts['COMPLETE_WITH_FINDING'] ?? 0) + (counts['COMPLETE_NO_FINDING'] ?? 0);
    if (completedCases < 1) errors.push('YIELD_RECEIPT_NO_COMPLETED_CASE');
  }
  const reasoner = receipt.reasonerIdentity;
  if (reasoner === undefined || reasoner === null) {
    errors.push('YIELD_RECEIPT_REASONER_IDENTITY_ABSENT');
  } else if (reasoner.kind !== 'PRINT_CLI_PROVIDER') {
    errors.push(`YIELD_RECEIPT_REASONER_NOT_PROVIDER:${reasoner.kind}`);
  } else if (typeof reasoner.identityDigest !== 'string' || !/^rid:sha256:[0-9a-f]{24,64}$/.test(reasoner.identityDigest)) {
    errors.push('YIELD_RECEIPT_REASONER_IDENTITY_INVALID');
  }
  // R5-15: a run qualifies only against the GRANTED record of the single authorized paid run, and
  // only when it carries the exact print CLI, provider and model that record declares. Any print
  // CLI (an arbitrary absolute executable) was enough before; an unrecorded or different one is not.
  if (authorization === null || authorization.state !== 'GRANTED') {
    errors.push('YIELD_RECEIPT_RUN_NOT_AUTHORIZED');
  } else if (reasoner !== undefined && reasoner !== null) {
    if (reasoner.printCliDigest === null || reasoner.printCliDigest !== authorization.declared.printCliDigest) errors.push('YIELD_RECEIPT_PRINT_CLI_NOT_AUTHORIZED');
    if (reasoner.provider === undefined || reasoner.provider === null || reasoner.provider !== authorization.declared.provider
      || reasoner.model === undefined || reasoner.model === null || reasoner.model !== authorization.declared.model) {
      errors.push('YIELD_RECEIPT_MODEL_NOT_AUTHORIZED');
    }
  }
  const manifestSha = evidence.manifest.nightwatchSha;
  if (typeof manifestSha !== 'string' || !/^[0-9a-f]{40}$/i.test(manifestSha)) errors.push('YIELD_RECEIPT_SHA_ABSENT');
  else if (receipt.nightwatchSha === undefined || receipt.nightwatchSha !== manifestSha.toLowerCase()) errors.push('YIELD_RECEIPT_SHA_DISAGREES');
  if (receipt.nightwatchTreeClean !== true) errors.push('YIELD_RECEIPT_TREE_NOT_CLEAN');
  if (receipt.terminationClass !== 'VALID_PROVIDER_RUN') errors.push(`YIELD_RECEIPT_PROVIDER_NOT_VALID:${receipt.terminationClass}`);
  if (receipt.providerHealth.completedCalls < 1) errors.push('YIELD_RECEIPT_NO_COMPLETED_PROVIDER_CALL');
  if (receipt.siblingIdentityChanged) errors.push('YIELD_RECEIPT_SIBLING_IDENTITY_CHANGED');
  if (receipt.siblingsBefore.length < 1) errors.push('YIELD_RECEIPT_NO_SIBLING_OBSERVATION');
  if (receipt.leakScan.result !== 'CLEAN') errors.push('YIELD_RECEIPT_LEAK_SCAN_NOT_CLEAN');
  if (errors.length > 0) return invalid();
  const sha = String(receipt.nightwatchSha);
  const relation = typeof certifiedCheckpointSha === 'string' && /^[0-9a-f]{40}$/i.test(certifiedCheckpointSha)
    && certifiedCheckpointSha.toLowerCase() === sha
    ? 'BOUND'
    : 'BOUND_TO_OTHER';
  return {
    ok: true,
    errors: [],
    relation,
    summary: {
      sha,
      runId: typeof evidence.manifest.runId === 'string' ? evidence.manifest.runId : receipt.campaignId,
      completedCalls: receipt.providerHealth.completedCalls,
      reproductionCount: receipt.reproductionCount,
      admissions: receipt.persistedAdmissionIds.length,
      siblingsObserved: receipt.siblingsBefore.length,
    },
  };
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
    ...(input.nightwatchIdentity === undefined ? {} : { nightwatchIdentity: input.nightwatchIdentity }),
    ...(input.campaignKind === undefined ? {} : { campaignKind: input.campaignKind }),
    ...(input.reasonerIdentity === undefined ? {} : { reasonerIdentity: input.reasonerIdentity }),
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
    ...(input.nightwatchIdentity === undefined ? {} : { nightwatchSha: input.nightwatchIdentity.sha }),
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
