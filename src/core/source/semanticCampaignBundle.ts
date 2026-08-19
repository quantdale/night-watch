// ---------------------------------------------------------------------------
// Nightwatch Phase 13A — strict frozen semantic campaign source bundle.
//
// A SemanticCampaignBundle binds a future real campaign to the semantic
// authority it is allowed to use, frozen from read-only source metadata. It is
// built outside pure campaign consumers (a read-only freshness producer) and
// then consumed as data. It never contains raw customer values, credentials,
// runtime bodies, source code text, or deployment claims.
//
// DEPLOYMENT_STATUS_UNRESOLVED is always true because Phase 6 is frozen.
// The pure core has no browser, network, filesystem, child-process, DB, or AI
// authority. A read-only source-discoverer may build this object from a
// validated resolver result + disposable snapshot; it must never mutate a
// canonical sibling or auto-rebind when remote source moves later.
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';

export const SEMANTIC_CAMPAIGN_BUNDLE_VERSION = 'nightwatch.semantic-campaign-bundle.private.v1' as const;

export type SemanticBundleResolverState = 'RESOLVED' | 'NO_EXPECTATION' | 'SOURCE_STALE' | 'SOURCE_UNAVAILABLE';
export type SemanticBundleDevReachability = 'DEV_REACHABLE' | 'LOCAL_ONLY' | 'UNKNOWN';
export type SemanticBundleExpectationClass = 'HISTORICAL' | 'COLLECTION';

export interface SemanticCampaignBundleApprovedMapping {
  readonly journeyOrOperationId: string;
  readonly targetId: string;
  readonly expectationId: string;
  readonly expectationClass: SemanticBundleExpectationClass;
  readonly browserObservationAvailable: boolean;
  readonly apiObservationAvailable: boolean;
}

export interface SemanticCampaignBundle {
  readonly schemaVersion: typeof SEMANTIC_CAMPAIGN_BUNDLE_VERSION;
  readonly bundleId: string;
  readonly sourceRepoId: string;
  readonly sourceBranchRef: string;
  readonly freshnessApprovedSourceSha: string;
  readonly expectationId: string;
  readonly targetId: string;
  readonly sourceEvidenceDigest: string;
  readonly sourceDerivationVersion: string;
  readonly collectionAdmissionVersion: string;
  readonly resolverState: SemanticBundleResolverState;
  readonly devReachability: SemanticBundleDevReachability;
  readonly approvedMapping: SemanticCampaignBundleApprovedMapping;
  readonly deploymentStatusUnresolved: true;
}

export type SemanticCampaignBundleInput = Omit<SemanticCampaignBundle, 'bundleId' | 'schemaVersion' | 'deploymentStatusUnresolved'> & {
  readonly bundleId?: string;
};

const SAFE_ID_RE = /^[A-Za-z0-9._:/-]{1,200}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const EVIDENCE_DIGEST_RE = /^ev:sha256:[0-9a-f]{24}$/;
const GENERIC_VERSION_RE = /^[A-Za-z0-9._~:@%/-]{1,200}$/;
const SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

const ALLOWED_KEYS = new Set<string>([
  'schemaVersion',
  'bundleId',
  'sourceRepoId',
  'sourceBranchRef',
  'freshnessApprovedSourceSha',
  'expectationId',
  'targetId',
  'sourceEvidenceDigest',
  'sourceDerivationVersion',
  'collectionAdmissionVersion',
  'resolverState',
  'devReachability',
  'approvedMapping',
  'deploymentStatusUnresolved',
]);

const VALID_RESOLVER_STATES = new Set<string>(['RESOLVED', 'NO_EXPECTATION', 'SOURCE_STALE', 'SOURCE_UNAVAILABLE']);
const VALID_DEV_REACHABILITY = new Set<string>(['DEV_REACHABLE', 'LOCAL_ONLY', 'UNKNOWN']);
const VALID_EXPECTATION_CLASS = new Set<string>(['HISTORICAL', 'COLLECTION']);

function canonical(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(String(value));
}

function safeId(value: string, field: string): string {
  if (!SAFE_ID_RE.test(value) || SENTINEL_RE.test(value)) throw new Error(`SEMANTIC_BUNDLE_${field.toUpperCase()}_UNSAFE`);
  return value;
}

function deterministicBundleId(input: Omit<SemanticCampaignBundle, 'bundleId'>): string {
  const payload = {
    schemaVersion: input.schemaVersion,
    sourceRepoId: input.sourceRepoId,
    sourceBranchRef: input.sourceBranchRef,
    freshnessApprovedSourceSha: input.freshnessApprovedSourceSha,
    expectationId: input.expectationId,
    targetId: input.targetId,
    sourceEvidenceDigest: input.sourceEvidenceDigest,
    sourceDerivationVersion: input.sourceDerivationVersion,
    collectionAdmissionVersion: input.collectionAdmissionVersion,
    resolverState: input.resolverState,
    devReachability: input.devReachability,
    approvedMapping: {
      journeyOrOperationId: input.approvedMapping.journeyOrOperationId,
      targetId: input.approvedMapping.targetId,
      expectationId: input.approvedMapping.expectationId,
      expectationClass: input.approvedMapping.expectationClass,
      browserObservationAvailable: input.approvedMapping.browserObservationAvailable,
      apiObservationAvailable: input.approvedMapping.apiObservationAvailable,
    },
  };
  const hash = createHash('sha256').update(canonical(payload), 'utf8').digest('hex').slice(0, 24);
  return `scb:sha256:${hash}`;
}

export function validateSemanticCampaignBundle(bundle: SemanticCampaignBundle): void {
  if (bundle.schemaVersion !== SEMANTIC_CAMPAIGN_BUNDLE_VERSION) throw new Error('SEMANTIC_BUNDLE_VERSION_INVALID');
  for (const key of Object.keys(bundle)) {
    if (!ALLOWED_KEYS.has(key)) throw new Error(`SEMANTIC_BUNDLE_UNKNOWN_FIELD:${key}`);
  }
  safeId(bundle.sourceRepoId, 'SOURCE_REPO_ID');
  safeId(bundle.sourceBranchRef, 'SOURCE_BRANCH_REF');
  if (!SHA_RE.test(bundle.freshnessApprovedSourceSha)) throw new Error('SEMANTIC_BUNDLE_SOURCE_SHA_INVALID');
  safeId(bundle.expectationId, 'EXPECTATION_ID');
  safeId(bundle.targetId, 'TARGET_ID');
  if (!EVIDENCE_DIGEST_RE.test(bundle.sourceEvidenceDigest)) throw new Error('SEMANTIC_BUNDLE_EVIDENCE_DIGEST_INVALID');
  safeId(bundle.sourceDerivationVersion, 'DERIVATION_VERSION');
  safeId(bundle.collectionAdmissionVersion, 'COLLECTION_ADMISSION_VERSION');
  if (!VALID_RESOLVER_STATES.has(bundle.resolverState)) throw new Error('SEMANTIC_BUNDLE_RESOLVER_STATE_INVALID');
  if (!VALID_DEV_REACHABILITY.has(bundle.devReachability)) throw new Error('SEMANTIC_BUNDLE_DEV_REACHABILITY_INVALID');
  if (bundle.deploymentStatusUnresolved !== true) throw new Error('SEMANTIC_BUNDLE_DEPLOYMENT_STATUS_MUST_BE_UNRESOLVED');
  const m = bundle.approvedMapping;
  safeId(m.journeyOrOperationId, 'MAPPING_JOURNEY_OR_OPERATION_ID');
  safeId(m.targetId, 'MAPPING_TARGET_ID');
  safeId(m.expectationId, 'MAPPING_EXPECTATION_ID');
  if (!VALID_EXPECTATION_CLASS.has(m.expectationClass)) throw new Error('SEMANTIC_BUNDLE_EXPECTATION_CLASS_INVALID');
  // Identity recomputation must agree (fail closed on tampered/ambiguous bundle).
  const expected = deterministicBundleId(bundle as Omit<SemanticCampaignBundle, 'bundleId'>);
  if (bundle.bundleId !== expected) throw new Error('SEMANTIC_BUNDLE_ID_MISMATCH');
}

export function createSemanticCampaignBundle(input: SemanticCampaignBundleInput): SemanticCampaignBundle {
  const bundle: SemanticCampaignBundle = {
    schemaVersion: SEMANTIC_CAMPAIGN_BUNDLE_VERSION,
    sourceRepoId: safeId(input.sourceRepoId, 'SOURCE_REPO_ID'),
    sourceBranchRef: safeId(input.sourceBranchRef, 'SOURCE_BRANCH_REF'),
    freshnessApprovedSourceSha: input.freshnessApprovedSourceSha,
    expectationId: safeId(input.expectationId, 'EXPECTATION_ID'),
    targetId: safeId(input.targetId, 'TARGET_ID'),
    sourceEvidenceDigest: input.sourceEvidenceDigest,
    sourceDerivationVersion: safeId(input.sourceDerivationVersion, 'DERIVATION_VERSION'),
    collectionAdmissionVersion: safeId(input.collectionAdmissionVersion, 'COLLECTION_ADMISSION_VERSION'),
    resolverState: input.resolverState,
    devReachability: input.devReachability,
    approvedMapping: {
      journeyOrOperationId: safeId(input.approvedMapping.journeyOrOperationId, 'MAPPING_JOURNEY_OR_OPERATION_ID'),
      targetId: safeId(input.approvedMapping.targetId, 'MAPPING_TARGET_ID'),
      expectationId: safeId(input.approvedMapping.expectationId, 'MAPPING_EXPECTATION_ID'),
      expectationClass: input.approvedMapping.expectationClass,
      browserObservationAvailable: input.approvedMapping.browserObservationAvailable,
      apiObservationAvailable: input.approvedMapping.apiObservationAvailable,
    },
    deploymentStatusUnresolved: true,
    ...(input.bundleId === undefined ? {} : { bundleId: input.bundleId }),
  } as SemanticCampaignBundle;
  const bundleId = deterministicBundleId(bundle as Omit<SemanticCampaignBundle, 'bundleId'>);
  const finalized: SemanticCampaignBundle = { ...bundle, bundleId };
  validateSemanticCampaignBundle(finalized);
  return finalized;
}

export function semanticCampaignBundleIdentity(bundle: SemanticCampaignBundle): string {
  return deterministicBundleId(bundle as Omit<SemanticCampaignBundle, 'bundleId'>);
}
