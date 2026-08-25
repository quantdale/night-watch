import { prefixedDigest24 } from '../../core/identity/canonicalDigest';
import type { BugDossier, SourceFreshness } from '../../core/triage/types';
import { asSafeControlCenterDigest } from '../contracts/common';
import type { ControlCenterFindingsDto, ControlCenterFindingSummaryDto } from '../contracts/findings';
import { CONTROL_CENTER_FINDINGS_SCHEMA_VERSION } from '../contracts/findings';
import { sanitizeFindingSummary } from '../contracts/sanitize';
import { boundedCollection, boundedCount, safePublicId } from './common';

export interface FindingsAuthorityInput {
  readonly dossiers: readonly BugDossier[];
  readonly available?: boolean;
}

function sourceCurrentness(dossier: BugDossier): 'CURRENT' | 'SOURCE_STALE' | 'SOURCE_UNAVAILABLE' {
  const freshness: readonly SourceFreshness[] = dossier.sourceChangeCandidates.map((candidate) => candidate.sourceFreshness);
  if (freshness.some((value) => value === 'SOURCE_CURRENT_LOCALLY' || value === 'REMOTE_FRESHNESS_CONFIRMED')) return 'CURRENT';
  if (freshness.some((value) => value === 'LOCAL_TRACKING_REF_ONLY')) return 'SOURCE_STALE';
  return 'SOURCE_UNAVAILABLE';
}

function safeDossier(dossier: BugDossier): ControlCenterFindingSummaryDto | null {
  if (
    dossier.privacy.rawBodiesPersisted ||
    dossier.privacy.customerValuesPersisted ||
    dossier.privacy.credentialsPersisted ||
    dossier.privacy.screenshotsPersisted ||
    dossier.privacy.authenticatedTracesPersisted ||
    dossier.l4Datastore !== 'OUT_OF_SCOPE_BY_OWNER'
  ) {
    return null;
  }
  const currentness = sourceCurrentness(dossier);
  const findingId = safePublicId(dossier.candidateId, 'cc-finding');
  const provenanceDigest = asSafeControlCenterDigest(prefixedDigest24('cc-finding', {
    candidateId: findingId,
    dossierStatus: dossier.status,
    fingerprint: dossier.oracleFingerprint,
    currentness,
    evidenceLevel: dossier.evidenceLevel,
  }));
  return sanitizeFindingSummary({
    findingId,
    fingerprint: dossier.oracleFingerprint,
    clusterId: null,
    title: dossier.title,
    product: null,
    surface: dossier.routeClass,
    severity: dossier.technicalSeverity,
    confidence: dossier.confidence.level,
    evidenceLevel: dossier.evidenceLevel,
    reproduction: dossier.reproduction.result,
    reproductionCount: dossier.reproduction.count,
    minimized: dossier.reproduction.minimalityGuarantee !== 'NONE',
    sourceCurrentness: currentness,
    dossierStatus: dossier.status,
    firstObservedAt: dossier.firstObserved,
    lastObservedAt: dossier.lastObserved,
    categoryCode: dossier.semanticEvidence === null ? 'PROTOCOL_FINDING' : 'SEMANTIC_FINDING',
    provenanceDigest,
  });
}

export function projectFindings(input: FindingsAuthorityInput, requestedLimit?: unknown): ControlCenterFindingsDto {
  if (input.available === false) {
    return {
      schemaVersion: CONTROL_CENTER_FINDINGS_SCHEMA_VERSION,
      state: 'UNAVAILABLE',
      items: [],
      page: { limit: 0, nextCursor: null, truncated: false },
    };
  }
  const rows = input.dossiers
    .map(safeDossier)
    .filter((row): row is ControlCenterFindingSummaryDto => row !== null)
    .sort((left, right) => left.findingId.localeCompare(right.findingId));
  const collection = boundedCollection(rows, requestedLimit);
  return {
    schemaVersion: CONTROL_CENTER_FINDINGS_SCHEMA_VERSION,
    state: rows.length === 0 ? 'EMPTY' : 'AVAILABLE',
    ...collection,
  };
}
