/**
 * Phase 23 pre-DEV authority evaluation.
 *
 * This is a pure, receipt-producing gate. It does not inspect credentials,
 * contact a product, or turn a local result into external CI authority.
 */

import crypto from 'node:crypto';
import type { ExternalCiClassificationResult } from './externalCi';

export const PREDEV_RECEIPT_SCHEMA = 'nightwatch.pre-dev-authority-receipt.v3' as const;
export const PREDEV_CATEGORIES = [
  'LOCAL_GATE',
  'CLEAN_CHECKOUT_GATE',
  'EXTERNAL_CI_GATE',
  'SOURCE_CURRENTNESS',
  'AUTH_READINESS',
  'MANIFEST_CURRENTNESS',
  'CONTAINMENT',
] as const;
export const PREDEV_STATES = [
  'READY_FOR_DEV',
  'BLOCKED_EXTERNAL_CI',
  'BLOCKED_LOCAL_GATE',
  'BLOCKED_SOURCE_DRIFT',
  'BLOCKED_AUTH',
  'BLOCKED_MANIFEST',
  'BLOCKED_CONTAINMENT',
  'BLOCKED_UNKNOWN',
] as const;

export type PreDevCategory = typeof PREDEV_CATEGORIES[number];
export type PreDevState = typeof PREDEV_STATES[number];

export interface GateReceiptEvidence {
  readonly passed: boolean;
  readonly gitHead: string | null;
  readonly gateDefinitionDigest: string | null;
  readonly requiredGroups: readonly { readonly id: string; readonly status: string }[];
}

export interface ManifestCurrentnessEvidence {
  readonly passed: boolean;
  readonly schemaVersion: string;
  readonly manifestId: string;
  readonly deterministicDigest: string;
  readonly nightwatchSha: string;
  readonly gateDefinitionDigest: string;
  readonly targetCount: number;
  readonly plannedObservationContexts: number;
}

export interface ContainmentEvidence {
  readonly environment: string;
  readonly dryRunPassed: boolean;
  readonly externalContactCount: number;
  readonly mutationCount: number;
  readonly rawPersistenceCount: number;
  readonly privacyPassed: boolean;
  readonly ownerPolicyAllows: boolean;
}

export interface PreDevFacts {
  readonly currentHead: string;
  readonly expectedGateDefinitionDigest: string;
  readonly requiredGroupIds: readonly string[];
  readonly localGate: GateReceiptEvidence;
  readonly cleanCheckoutGate: GateReceiptEvidence;
  readonly externalCi: ExternalCiClassificationResult;
  readonly sourceCurrent: boolean;
  readonly authReady: boolean;
  readonly manifest: ManifestCurrentnessEvidence;
  readonly containment: ContainmentEvidence;
}

export interface PreDevCategoryResult {
  readonly id: PreDevCategory;
  readonly required: true;
  readonly passed: boolean;
  readonly code: string;
}

export interface PreDevAuthorityReceipt {
  readonly schemaVersion: typeof PREDEV_RECEIPT_SCHEMA;
  readonly state: PreDevState;
  readonly currentHead: string;
  readonly gateDefinitionDigest: string;
  readonly externalCiClassification: ExternalCiClassificationResult['classification'];
  readonly externalCiRunId: string | null;
  readonly manifestId: string;
  readonly manifestDigest: string;
  readonly categories: readonly PreDevCategoryResult[];
  readonly receiptDigest: string;
}

const SHA_RE = /^[0-9a-f]{40}$/;
const GATE_DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
const MANIFEST_ID_RE = /^manifest:sha256:[0-9a-f]{24}$/;

function digest(value: unknown): string {
  return `predev-receipt:sha256:${crypto.createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex').slice(0, 24)}`;
}

function groupEvidencePass(
  evidence: GateReceiptEvidence,
  facts: PreDevFacts,
): boolean {
  if (evidence.passed !== true || evidence.gitHead !== facts.currentHead || evidence.gateDefinitionDigest !== facts.expectedGateDefinitionDigest) return false;
  const groups = new Map(evidence.requiredGroups.map((group) => [group.id, group.status]));
  return new Set(facts.requiredGroupIds).size === facts.requiredGroupIds.length
    && facts.requiredGroupIds.every((id) => groups.get(id) === 'PASS');
}

function manifestPass(manifest: ManifestCurrentnessEvidence, facts: PreDevFacts): boolean {
  return manifest.passed === true
    && manifest.schemaVersion === 'nightwatch.dev-semantic-acceptance-manifest.v2'
    && MANIFEST_ID_RE.test(manifest.manifestId)
    && MANIFEST_ID_RE.test(manifest.deterministicDigest)
    && SHA_RE.test(manifest.nightwatchSha)
    && manifest.nightwatchSha === facts.currentHead
    && manifest.gateDefinitionDigest === facts.expectedGateDefinitionDigest
    && Number.isInteger(manifest.targetCount)
    && manifest.targetCount >= 1
    && manifest.targetCount <= 3
    && Number.isInteger(manifest.plannedObservationContexts)
    && manifest.plannedObservationContexts >= 1
    && manifest.plannedObservationContexts <= 6;
}

function containmentPass(containment: ContainmentEvidence): boolean {
  return containment.environment === 'DEV'
    && containment.dryRunPassed === true
    && containment.externalContactCount === 0
    && containment.mutationCount === 0
    && containment.rawPersistenceCount === 0
    && containment.privacyPassed === true
    && containment.ownerPolicyAllows === true;
}

/** Evaluate all mandatory pre-DEV categories and produce a safe receipt. */
export function evaluatePreDevAuthority(facts: PreDevFacts): PreDevAuthorityReceipt {
  const localPass = SHA_RE.test(facts.currentHead) && GATE_DIGEST_RE.test(facts.expectedGateDefinitionDigest)
    && groupEvidencePass(facts.localGate, facts);
  const cleanPass = SHA_RE.test(facts.currentHead) && GATE_DIGEST_RE.test(facts.expectedGateDefinitionDigest)
    && groupEvidencePass(facts.cleanCheckoutGate, facts);
  const externalPass = facts.externalCi.classification === 'EXECUTED_GREEN' && facts.externalCi.exactHead;
  const sourcePass = facts.sourceCurrent === true;
  const authPass = facts.authReady === true;
  const currentManifestPass = manifestPass(facts.manifest, facts);
  const safeContainmentPass = containmentPass(facts.containment);

  const categories: readonly PreDevCategoryResult[] = [
    { id: 'LOCAL_GATE', required: true, passed: localPass, code: localPass ? 'LOCAL_GATE_PASS' : 'LOCAL_GATE_NOT_AUTHORITATIVE' },
    { id: 'CLEAN_CHECKOUT_GATE', required: true, passed: cleanPass, code: cleanPass ? 'CLEAN_CHECKOUT_PASS' : 'CLEAN_CHECKOUT_NOT_AUTHORITATIVE' },
    { id: 'EXTERNAL_CI_GATE', required: true, passed: externalPass, code: externalPass ? 'EXACT_EXTERNAL_GREEN' : `EXTERNAL_${facts.externalCi.classification}` },
    { id: 'SOURCE_CURRENTNESS', required: true, passed: sourcePass, code: sourcePass ? 'SOURCE_CURRENT' : 'SOURCE_NOT_CURRENT' },
    { id: 'AUTH_READINESS', required: true, passed: authPass, code: authPass ? 'AUTH_READY' : 'AUTH_NOT_READY' },
    { id: 'MANIFEST_CURRENTNESS', required: true, passed: currentManifestPass, code: currentManifestPass ? 'FRESH_MANIFEST_CURRENT' : 'MANIFEST_NOT_CURRENT' },
    { id: 'CONTAINMENT', required: true, passed: safeContainmentPass, code: safeContainmentPass ? 'CONTAINMENT_PASS' : 'CONTAINMENT_REJECTED' },
  ];

  let state: PreDevState = 'READY_FOR_DEV';
  if (!localPass || !cleanPass) state = 'BLOCKED_LOCAL_GATE';
  else if (!externalPass) state = 'BLOCKED_EXTERNAL_CI';
  else if (!sourcePass) state = 'BLOCKED_SOURCE_DRIFT';
  else if (!authPass) state = 'BLOCKED_AUTH';
  else if (!currentManifestPass) state = 'BLOCKED_MANIFEST';
  else if (!safeContainmentPass) state = 'BLOCKED_CONTAINMENT';
  else if (categories.some((category) => !category.passed)) state = 'BLOCKED_UNKNOWN';

  const core = {
    schemaVersion: PREDEV_RECEIPT_SCHEMA,
    state,
    currentHead: facts.currentHead,
    gateDefinitionDigest: facts.expectedGateDefinitionDigest,
    externalCiClassification: facts.externalCi.classification,
    externalCiRunId: facts.externalCi.runId,
    manifestId: facts.manifest.manifestId,
    manifestDigest: facts.manifest.deterministicDigest,
    categories,
  };
  return { ...core, receiptDigest: digest(core) };
}
