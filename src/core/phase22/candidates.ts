import { phase22Digest } from './digest';
import { classifyPhase22DifferentialEligibility, classifyPhase22Eligibility, classifyPhase22SourceFreshness, type Phase22DifferentialDecision, type Phase22EligibilityDecision, type Phase22SourceFreshnessDecision } from './eligibility';
import { PHASE22_REQUIRED_PREFLIGHT_CHECKS, type Phase22ManifestTarget, type Phase22SemanticMaterialClass, type Phase22SourceIdentity } from './types';
import type { Phase22ManifestCandidate } from './manifest';

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const EVIDENCE_RE = /^ev:sha256:[0-9a-f]{24}$/;

function invalid(reason: string): never {
  throw new Error(`PHASE22_CANDIDATE_INVALID:${reason}`);
}

function safeId(value: string, label: string): void {
  if (!SAFE_ID_RE.test(value)) invalid(label);
}

function safeSource(source: Phase22SourceIdentity): void {
  safeId(source.repoId, 'SOURCE_REPO');
  if (!SHA_RE.test(source.sha) || !EVIDENCE_RE.test(source.evidenceDigest)) invalid('SOURCE_IDENTITY');
}

export interface Phase22CandidateRow {
  readonly targetId: string;
  readonly product: string;
  readonly journeyOrApiAdapter: string;
  readonly semanticContractId: string;
  readonly expectationId: string;
  readonly boundSource: Phase22SourceIdentity | null;
  readonly observedSource: Phase22SourceIdentity | null;
  readonly sourceAvailable: boolean;
  readonly contractPresent: boolean;
  readonly derivationSupported: boolean;
  readonly derivationEvidenceMatches: boolean;
  readonly semanticsUnchanged: boolean;
  readonly runtimeBindingAvailable: boolean;
  readonly runtimeBindingCurrent: boolean;
  readonly projectionAvailable: boolean;
  readonly replaySupported: boolean;
  readonly mutationRequired: boolean;
  readonly devHostAllowlisted: boolean;
  readonly authorityAllowed: boolean;
  readonly targetApprovedReadOnly: boolean;
  readonly projectionIdentity: string;
  readonly differentialPairId: string | null;
  readonly materialClass: Phase22SemanticMaterialClass;
  readonly historicalDevEvidence: boolean;
  readonly anticipatedInvariantCount: number;
  readonly selectionPriority: number;
  readonly differentialSecondSurfacePresent: boolean;
  readonly differentialSecondSurfaceCurrent: boolean;
  readonly differentialEquivalenceProven: boolean;
  readonly differentialLeftProjectionAvailable: boolean;
  readonly differentialRightProjectionAvailable: boolean;
}

export interface Phase22CandidateRecord {
  readonly targetId: string;
  readonly freshness: Phase22SourceFreshnessDecision;
  readonly eligibility: Phase22EligibilityDecision;
  readonly differential: Phase22DifferentialDecision;
  readonly manifestCandidate: Phase22ManifestCandidate | null;
}

export interface Phase22CandidateInventory {
  readonly schemaVersion: 'nightwatch.phase22-candidate-inventory.v1';
  readonly records: readonly Phase22CandidateRecord[];
  readonly consideredCount: number;
  readonly eligibleCount: number;
  readonly deterministicDigest: string;
}

function manifestTarget(row: Phase22CandidateRow, source: Phase22SourceIdentity): Phase22ManifestTarget {
  const target: Phase22ManifestTarget = {
    targetId: row.targetId,
    product: row.product,
    journeyOrApiAdapter: row.journeyOrApiAdapter,
    semanticContractId: row.semanticContractId,
    expectationId: row.expectationId,
    source,
    projectionIdentity: row.projectionIdentity,
    differentialPairId: row.differentialPairId,
    replay: {
      required: true,
      maxAdditionalContexts: 1,
      freshContext: true,
      allowedOutcomes: ['REPRODUCED_EXACT', 'REPRODUCED_SEMANTIC_EQUIVALENT', 'REPRESENTATION_CHANGED_CONTRACT_PRESERVED', 'PRECONDITION_DIVERGENCE', 'OBSERVATION_DIVERGENCE', 'SOURCE_STALE', 'CONTRACT_CHANGED', 'NONDETERMINISTIC', 'NOT_REPRODUCED', 'INVALID'],
    },
    observation: {
      allowedObservationClass: 'READ_ONLY_API_AND_BROWSER',
      mutationAllowed: false,
      maxFirstObservations: 1,
      maxReplayObservations: 1,
      dynamicTargetDiscovery: false,
    },
    anticipatedInvariantCount: row.anticipatedInvariantCount,
    requiredPreflightChecks: PHASE22_REQUIRED_PREFLIGHT_CHECKS,
    materialClass: row.materialClass,
    historicalDevEvidence: row.historicalDevEvidence,
    selectionPriority: row.selectionPriority,
  };
  return target;
}

/**
 * Convert one exact source re-derivation inventory into safe eligibility
 * records.  This is the admission-to-manifest bridge; it never reads source
 * and never silently changes the bound SHA or evidence digest.
 */
export function buildPhase22CandidateInventory(rows: readonly Phase22CandidateRow[]): Phase22CandidateInventory {
  const seen = new Set<string>();
  const records: Phase22CandidateRecord[] = [];
  for (const row of [...rows].sort((left, right) => left.targetId.localeCompare(right.targetId))) {
    safeId(row.targetId, 'TARGET_ID');
    safeId(row.product, 'PRODUCT');
    safeId(row.journeyOrApiAdapter, 'ADAPTER');
    safeId(row.semanticContractId, 'CONTRACT_ID');
    safeId(row.expectationId, 'EXPECTATION_ID');
    if (seen.has(row.targetId)) invalid('DUPLICATE_TARGET');
    seen.add(row.targetId);
    if (row.boundSource !== null) safeSource(row.boundSource);
    if (row.observedSource !== null) safeSource(row.observedSource);
    if (!Number.isInteger(row.anticipatedInvariantCount) || row.anticipatedInvariantCount < 1 || row.anticipatedInvariantCount > 32 || !Number.isInteger(row.selectionPriority) || row.selectionPriority < 1 || row.selectionPriority > 1000) invalid('BOUNDS');
    const freshness = classifyPhase22SourceFreshness({
      targetId: row.targetId,
      evidence: {
        bound: row.boundSource ?? {
          repoId: 'unbound-source',
          sha: '0'.repeat(40),
          evidenceDigest: 'ev:sha256:' + '0'.repeat(24),
        },
        observed: row.observedSource,
        sourceAvailable: row.sourceAvailable,
        contractPresent: row.contractPresent,
        derivationSupported: row.derivationSupported,
        derivationEvidenceMatches: row.derivationEvidenceMatches,
        semanticsUnchanged: row.semanticsUnchanged,
      },
    });
    const eligibility = classifyPhase22Eligibility({
      targetId: row.targetId,
      facts: {
        hasMechanicalRealSourceProof: row.boundSource !== null && row.derivationSupported,
        sourceFreshness: freshness.state,
        runtimeBindingAvailable: row.runtimeBindingAvailable,
        runtimeBindingCurrent: row.runtimeBindingCurrent,
        projectionAvailable: row.projectionAvailable,
        replaySupported: row.replaySupported,
        mutationRequired: row.mutationRequired,
        devHostAllowlisted: row.devHostAllowlisted,
        authorityAllowed: row.authorityAllowed,
        targetApprovedReadOnly: row.targetApprovedReadOnly,
      },
    });
    const differential = classifyPhase22DifferentialEligibility({
      targetId: row.targetId,
      secondSurfacePresent: row.differentialSecondSurfacePresent,
      secondSurfaceCurrent: row.differentialSecondSurfaceCurrent,
      equivalenceMechanicallyProven: row.differentialEquivalenceProven,
      leftProjectionAvailable: row.differentialLeftProjectionAvailable,
      rightProjectionAvailable: row.differentialRightProjectionAvailable,
      authorityAllowed: row.authorityAllowed,
    });
    const source = row.observedSource ?? row.boundSource;
    const manifestCandidate = source === null ? null : { target: manifestTarget(row, source), eligibility };
    records.push({ targetId: row.targetId, freshness, eligibility, differential, manifestCandidate });
  }
  const core = {
    schemaVersion: 'nightwatch.phase22-candidate-inventory.v1' as const,
    records,
    consideredCount: records.length,
    eligibleCount: records.filter((record) => record.eligibility.eligible).length,
  };
  return { ...core, deterministicDigest: phase22Digest(core, 'candidate-inventory:sha256:') };
}
