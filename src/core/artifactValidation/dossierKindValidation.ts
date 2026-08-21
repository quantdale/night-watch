// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A11) — dossier artifact kind validation.
//
// Dispatches on the persisted schemaVersion/status and composes the owning
// modules' validators verbatim:
// - nightwatch.bug-dossier.private.v1 READY  -> triage/dossier.validateBugDossier
// - nightwatch.bug-dossier.private.v1 INCOMPLETE -> strict shape check below
//   (the persisted incomplete stub produced by triage/dossier.createIncompleteDossier)
// - nightwatch.bug-dossier.private.v2        -> triage/dossierV2.parseBugDossierV2
//
// The v1 READY path additionally enforces exact top-level keys (the frozen
// BugDossier interface); the module validator itself checks content, safety,
// privacy, sentinels, and nested semantic evidence.
//
// Read-only and pure: no fs/network/child-process/DB/AI authority.
// ---------------------------------------------------------------------------

import { DOSSIER_VERSION, type BugDossier } from '../triage/types';
import { validateBugDossier } from '../triage/dossier';
import { DOSSIER_VERSION_V2, parseBugDossierV2 } from '../triage/dossierV2';
import {
  assertExactKeys,
  assertString,
  assertUniqueStrings,
  isRuntimeRecord,
  requireRuntimeArray,
  requireRuntimeRecord,
} from '../campaign/runtimeValidation';

const BUG_DOSSIER_V1_KEYS = [
  'schemaVersion', 'status', 'candidateId', 'title', 'firstObserved', 'lastObserved',
  'journeys', 'seeds', 'minimalSequence', 'routeClass', 'apiOperationFamily',
  'oracleFingerprint', 'evidenceLevel', 'l4Datastore', 'reproduction',
  'browserApiDifferential', 'sourceChangeCandidates', 'likelyFaultBoundary',
  'confidence', 'technicalSeverity', 'triagePriority', 'knownNightwatchDefect',
  'alternativesRuledOut', 'missingEvidence', 'semanticEvidence',
  'humanReproductionRecipe', 'aiReady', 'safety', 'privacy',
] as const;

const INCOMPLETE_DOSSIER_KEYS = ['schemaVersion', 'status', 'candidateId', 'missingSections', 'privacy'] as const;

const CANDIDATE_ID_RE = /^candidate:sha256:[0-9a-f]{24}$/;

function invalid(reason: string): never {
  throw new Error(`ARTIFACT_DOSSIER_INVALID:${reason}`);
}

/** Strict shape check for the persisted INCOMPLETE dossier stub. Field-level
 *  coherence mirrors `createIncompleteDossier`: deduped + sorted missing
 *  sections and a PASS/unconfirmed privacy stub. */
function validateIncompleteDossierStub(value: Record<string, unknown>): void {
  assertExactKeys(value, INCOMPLETE_DOSSIER_KEYS, 'ARTIFACT_DOSSIER_INVALID');
  if (value.schemaVersion !== DOSSIER_VERSION) invalid('INCOMPLETE_SCHEMA_VERSION');
  if (value.status !== 'INCOMPLETE') invalid('INCOMPLETE_STATUS');
  assertString(value.candidateId, 'ARTIFACT_DOSSIER_INVALID:CANDIDATE_ID');
  if (!CANDIDATE_ID_RE.test(value.candidateId)) invalid('CANDIDATE_ID_PATTERN');
  const missing = requireRuntimeArray(value.missingSections, 'ARTIFACT_DOSSIER_INVALID:MISSING_SECTIONS');
  assertUniqueStrings(missing, 'ARTIFACT_DOSSIER_INVALID:MISSING_SECTIONS');
  for (const section of missing) {
    assertString(section, 'ARTIFACT_DOSSIER_INVALID:MISSING_SECTION');
    if (section.length === 0) invalid('EMPTY_MISSING_SECTION');
  }
  const ordered = missing as readonly string[];
  if (ordered.some((section, index) => index > 0 && section < ordered[index - 1]!)) {
    invalid('MISSING_SECTIONS_NOT_SORTED');
  }
  const privacy = requireRuntimeRecord(value.privacy, 'ARTIFACT_DOSSIER_INVALID:PRIVACY_OBJECT_REQUIRED');
  assertExactKeys(privacy, ['result', 'confirmed'], 'ARTIFACT_DOSSIER_INVALID:PRIVACY');
  if (privacy.result !== 'PASS' || privacy.confirmed !== false) invalid('INCOMPLETE_PRIVACY_STUB');
}

/**
 * Validate one persisted dossier artifact of either historical major version.
 * Throws ARTIFACT_DOSSIER_INVALID:* / DOSSIER_* on any violation.
 */
export function validateDossierArtifact(value: unknown): void {
  if (!isRuntimeRecord(value)) invalid('OBJECT_REQUIRED');
  const schemaVersion = value.schemaVersion;
  if (schemaVersion === DOSSIER_VERSION) {
    if (value.status === 'INCOMPLETE') {
      validateIncompleteDossierStub(value);
      return;
    }
    // Exact-key gate over the frozen v1 interface, then the module validator
    // (content, safety, privacy, sentinel, semantic-evidence checks).
    assertExactKeys(value, BUG_DOSSIER_V1_KEYS, 'ARTIFACT_DOSSIER_INVALID');
    validateBugDossier(value as unknown as BugDossier);
    return;
  }
  if (schemaVersion === DOSSIER_VERSION_V2) {
    parseBugDossierV2(value);
    return;
  }
  invalid(`SCHEMA_VERSION_UNSUPPORTED:${String(schemaVersion)}`);
}
