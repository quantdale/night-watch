import { prefixedDigest24 } from '../../core/identity/canonicalDigest';
import type { BugDossier } from '../../core/triage/types';
import type { BugDossierV2 } from '../../core/triage/dossierV2';
import type { FindingsDossierMetadata } from '../authorities/findingsAuthority';
import { reduceFindingsSourceCurrentness } from '../authorities/findingsCurrentness';
import { asSafeControlCenterDigest } from '../contracts/common';
import type { ControlCenterFindingsDto, ControlCenterFindingSummaryDto } from '../contracts/findings';
import { CONTROL_CENTER_FINDINGS_SCHEMA_VERSION } from '../contracts/findings';
import { sanitizeFindingSummary } from '../contracts/sanitize';
import { boundedCollection, boundedCount, safePublicId } from './common';

export interface FindingsAuthorityInput {
  readonly dossiers: readonly (BugDossier | BugDossierV2 | FindingsDossierMetadata)[];
  readonly available?: boolean;
  readonly state?: ControlCenterFindingsDto['state'];
}

function isMetadata(dossier: BugDossier | BugDossierV2 | FindingsDossierMetadata): dossier is FindingsDossierMetadata {
  return !('privacy' in dossier);
}

function safeDossier(dossier: BugDossier | BugDossierV2 | FindingsDossierMetadata): ControlCenterFindingSummaryDto | null {
  if (!isMetadata(dossier) && (
    dossier.privacy.rawBodiesPersisted ||
    dossier.privacy.customerValuesPersisted ||
    dossier.privacy.credentialsPersisted ||
    dossier.privacy.screenshotsPersisted ||
    dossier.privacy.authenticatedTracesPersisted ||
    dossier.l4Datastore !== 'OUT_OF_SCOPE_BY_OWNER'
  )) {
    return null;
  }
  const currentness = isMetadata(dossier)
    ? dossier.sourceCurrentness
    : reduceFindingsSourceCurrentness(dossier.sourceChangeCandidates.map((candidate) => candidate.sourceFreshness));
  const dossierStatus: ControlCenterFindingSummaryDto['dossierStatus'] = dossier.status === 'READY' ? 'READY' : 'INCOMPLETE';
  const findingId = safePublicId(dossier.candidateId, 'cc-finding');
  const provenanceDigest = asSafeControlCenterDigest(prefixedDigest24('cc-finding', {
    candidateId: findingId,
    dossierStatus,
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
    dossierStatus,
    firstObservedAt: dossier.firstObserved,
    lastObservedAt: dossier.lastObserved,
    categoryCode: isMetadata(dossier) ? dossier.semanticFinding ? 'SEMANTIC_FINDING' : 'PROTOCOL_FINDING' : dossier.semanticEvidence === null || dossier.semanticEvidence === undefined ? 'PROTOCOL_FINDING' : 'SEMANTIC_FINDING',
    provenanceDigest,
  });
}

export function projectFindings(input: FindingsAuthorityInput, requestedLimit?: unknown, cursor?: unknown): ControlCenterFindingsDto {
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
  const collection = boundedCollection(rows, requestedLimit, cursor);
  return {
    schemaVersion: CONTROL_CENTER_FINDINGS_SCHEMA_VERSION,
    state: input.state ?? (rows.length === 0 ? 'EMPTY' : 'AVAILABLE'),
    ...collection,
  };
}
