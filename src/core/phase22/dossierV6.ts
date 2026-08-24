import { phase22Digest, phase22DossierId } from './digest';
import { assertPhase22NoRawArtifactFields } from './privacy';
import { PHASE22_DOSSIER_VERSION, PHASE22_REPLAY_OUTCOMES, type Phase22Confidence, type Phase22DifferentialOutcome, type Phase22ManifestTarget, type Phase22ReplayOutcome, type Phase22SourceIdentity } from './types';

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const EVIDENCE_RE = /^ev:sha256:[0-9a-f]{24}$/;
const RECEIPT_RE = /^receipt:sha256:[0-9a-f]{24}$/;
const DOSSIER_RE = /^dossier:sha256:[0-9a-f]{24}$/;
const SAFE_CODE_RE = /^[A-Z][A-Z0-9_:-]{0,96}$/;

export type Phase22DossierMode = 'REAL_FINDING' | 'CAMPAIGN_ACCEPTANCE_SUMMARY';
export type Phase22DossierFirstResult = 'PASS' | 'ANOMALY' | 'PARTIAL' | 'NOT_APPLICABLE' | 'INTERNAL_ERROR';
export type Phase22DossierRelation = 'APPLICATION_ERROR_ENVELOPE' | 'COLLECTION_CONTRACT' | 'MEMBERSHIP_CONTRACT' | 'RELATIONAL_CONTRACT' | 'DIFFERENTIAL_CONTRACT' | 'SHAPE_CONTRACT' | 'PROTOCOL_CONTRACT';

export interface Phase22RealAcceptanceDossier {
  readonly schemaVersion: typeof PHASE22_DOSSIER_VERSION;
  readonly dossierId: string;
  readonly mode: Phase22DossierMode;
  readonly targetId: string;
  readonly expectationId: string;
  readonly source: Phase22SourceIdentity;
  readonly productSurfaceId: string;
  readonly semanticRelation: Phase22DossierRelation;
  readonly firstResult: Phase22DossierFirstResult;
  readonly replayResult: Phase22ReplayOutcome;
  readonly differentialResult: Phase22DifferentialOutcome | null;
  readonly coverage: 'FULL' | 'PARTIAL' | 'NOT_APPLICABLE';
  readonly confidence: Phase22Confidence;
  readonly findingCount: number;
  readonly privacyReceiptId: string;
  readonly limitations: readonly string[];
  readonly recommendedHumanFollowUp: string;
  readonly deterministicDigest: string;
}

function invalid(reason: string): never {
  throw new Error(`PHASE22_DOSSIER_INVALID:${reason}`);
}

function source(source: Phase22SourceIdentity): void {
  if (!SAFE_ID_RE.test(source.repoId) || !SHA_RE.test(source.sha) || !EVIDENCE_RE.test(source.evidenceDigest)) invalid('SOURCE');
}

function target(target: Phase22ManifestTarget): void {
  if (!SAFE_ID_RE.test(target.targetId) || !SAFE_ID_RE.test(target.expectationId)) invalid('TARGET');
}

export function createPhase22RealAcceptanceDossier(input: {
  readonly target: Phase22ManifestTarget;
  readonly source: Phase22SourceIdentity;
  readonly productSurfaceId: string;
  readonly semanticRelation: Phase22DossierRelation;
  readonly firstResult: Phase22DossierFirstResult;
  readonly replayResult: Phase22ReplayOutcome;
  readonly differentialResult: Phase22DifferentialOutcome | null;
  readonly coverage: 'FULL' | 'PARTIAL' | 'NOT_APPLICABLE';
  readonly confidence: Phase22Confidence;
  readonly findingCount: number;
  readonly privacyReceiptId: string;
  readonly limitations: readonly string[];
  readonly recommendedHumanFollowUp: string;
}): Phase22RealAcceptanceDossier {
  target(input.target);
  source(input.source);
  if (!SAFE_ID_RE.test(input.productSurfaceId) || !['APPLICATION_ERROR_ENVELOPE', 'COLLECTION_CONTRACT', 'MEMBERSHIP_CONTRACT', 'RELATIONAL_CONTRACT', 'DIFFERENTIAL_CONTRACT', 'SHAPE_CONTRACT', 'PROTOCOL_CONTRACT'].includes(input.semanticRelation)) invalid('RELATION');
  if (!['PASS', 'ANOMALY', 'PARTIAL', 'NOT_APPLICABLE', 'INTERNAL_ERROR'].includes(input.firstResult) || !PHASE22_REPLAY_OUTCOMES.includes(input.replayResult)) invalid('RESULT');
  if (input.differentialResult !== null && !['EXACT_EQUIVALENT', 'SEMANTICALLY_EQUIVALENT', 'EXPECTED_DIFFERENCE', 'CONTRACT_VIOLATION', 'NOT_APPLICABLE', 'UNKNOWN'].includes(input.differentialResult)) invalid('DIFFERENTIAL');
  if (!['FULL', 'PARTIAL', 'NOT_APPLICABLE'].includes(input.coverage) || !['HIGH', 'MEDIUM', 'LOW', 'UNCONFIRMED'].includes(input.confidence)) invalid('CLASS');
  if (!Number.isInteger(input.findingCount) || input.findingCount < 0 || input.findingCount > 128) invalid('FINDING_COUNT');
  if (!RECEIPT_RE.test(input.privacyReceiptId)) invalid('PRIVACY_RECEIPT');
  if (!input.limitations.every((value) => SAFE_CODE_RE.test(value)) || !SAFE_CODE_RE.test(input.recommendedHumanFollowUp)) invalid('LIMITATION');
  if (input.findingCount === 0 && input.firstResult === 'ANOMALY') invalid('ANOMALY_WITHOUT_FINDING');
  const core = {
    schemaVersion: PHASE22_DOSSIER_VERSION,
    mode: input.findingCount > 0 ? 'REAL_FINDING' as const : 'CAMPAIGN_ACCEPTANCE_SUMMARY' as const,
    targetId: input.target.targetId,
    expectationId: input.target.expectationId,
    source: input.source,
    productSurfaceId: input.productSurfaceId,
    semanticRelation: input.semanticRelation,
    firstResult: input.firstResult,
    replayResult: input.replayResult,
    differentialResult: input.differentialResult,
    coverage: input.coverage,
    confidence: input.confidence,
    findingCount: input.findingCount,
    privacyReceiptId: input.privacyReceiptId,
    limitations: [...input.limitations].sort(),
    recommendedHumanFollowUp: input.recommendedHumanFollowUp,
  };
  const dossierId = phase22DossierId(core);
  const dossier: Phase22RealAcceptanceDossier = {
    ...core,
    dossierId,
    deterministicDigest: phase22Digest({ ...core, dossierId }, 'dossier:sha256:'),
  };
  validatePhase22RealAcceptanceDossier(dossier);
  return dossier;
}

export function validatePhase22RealAcceptanceDossier(dossier: Phase22RealAcceptanceDossier): void {
  if (dossier.schemaVersion !== PHASE22_DOSSIER_VERSION || !DOSSIER_RE.test(dossier.dossierId) || !/^dossier:sha256:[0-9a-f]{24}$/.test(dossier.deterministicDigest)) invalid('HEADER');
  if (!['REAL_FINDING', 'CAMPAIGN_ACCEPTANCE_SUMMARY'].includes(dossier.mode) || !SAFE_ID_RE.test(dossier.targetId) || !SAFE_ID_RE.test(dossier.expectationId)) invalid('IDENTITY');
  source(dossier.source);
  if (!SAFE_ID_RE.test(dossier.productSurfaceId) || !['APPLICATION_ERROR_ENVELOPE', 'COLLECTION_CONTRACT', 'MEMBERSHIP_CONTRACT', 'RELATIONAL_CONTRACT', 'DIFFERENTIAL_CONTRACT', 'SHAPE_CONTRACT', 'PROTOCOL_CONTRACT'].includes(dossier.semanticRelation)) invalid('RELATION');
  if (!['PASS', 'ANOMALY', 'PARTIAL', 'NOT_APPLICABLE', 'INTERNAL_ERROR'].includes(dossier.firstResult) || !PHASE22_REPLAY_OUTCOMES.includes(dossier.replayResult)) invalid('RESULT');
  if (dossier.differentialResult !== null && !['EXACT_EQUIVALENT', 'SEMANTICALLY_EQUIVALENT', 'EXPECTED_DIFFERENCE', 'CONTRACT_VIOLATION', 'NOT_APPLICABLE', 'UNKNOWN'].includes(dossier.differentialResult)) invalid('DIFFERENTIAL');
  if (!['FULL', 'PARTIAL', 'NOT_APPLICABLE'].includes(dossier.coverage) || !['HIGH', 'MEDIUM', 'LOW', 'UNCONFIRMED'].includes(dossier.confidence)) invalid('CLASS');
  if (!Number.isInteger(dossier.findingCount) || dossier.findingCount < 0 || dossier.findingCount > 128 || !RECEIPT_RE.test(dossier.privacyReceiptId)) invalid('COUNT');
  if (!dossier.limitations.every((value) => SAFE_CODE_RE.test(value)) || !SAFE_CODE_RE.test(dossier.recommendedHumanFollowUp)) invalid('LIMITATION');
  if ((dossier.mode === 'REAL_FINDING') !== (dossier.findingCount > 0)) invalid('MODE');
  const core = {
    schemaVersion: dossier.schemaVersion,
    mode: dossier.mode,
    targetId: dossier.targetId,
    expectationId: dossier.expectationId,
    source: dossier.source,
    productSurfaceId: dossier.productSurfaceId,
    semanticRelation: dossier.semanticRelation,
    firstResult: dossier.firstResult,
    replayResult: dossier.replayResult,
    differentialResult: dossier.differentialResult,
    coverage: dossier.coverage,
    confidence: dossier.confidence,
    findingCount: dossier.findingCount,
    privacyReceiptId: dossier.privacyReceiptId,
    limitations: dossier.limitations,
    recommendedHumanFollowUp: dossier.recommendedHumanFollowUp,
  };
  if (dossier.dossierId !== phase22DossierId(core)) invalid('ID_DIGEST');
  if (dossier.deterministicDigest !== phase22Digest({ ...core, dossierId: dossier.dossierId }, 'dossier:sha256:')) invalid('DIGEST');
  assertPhase22NoRawArtifactFields(dossier);
}
