// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (parallel agent A12) — deterministic project snapshot
// comparison.
//
// EXACT classification vocabulary (see types.ts for the full mapping):
//
//   UNCHANGED           identical manifests.
//   COMPATIBLE_CHANGE   additive versions/entries only (new recipe schema or
//                       derivation version, new lifecycle family, new adopted
//                       case, new replay/dossier plan generation).
//   SEMANTIC_CHANGE     changed semantic contracts: lifecycle family field
//                       drift, registry/analyzer/receipt version replacement,
//                       campaign fingerprint drift.
//   AUTHORITY_CHANGE    owner-scope policy marker change, or ANY change to the
//                       approved read-only target registry (expansion or
//                       revocation is an authority event).
//   INCOMPATIBLE_CHANGE removals, incompatible version downgrades (`.vN` ->
//                       lower `.vM` on the same slot prefix), and snapshot
//                       schema-version mismatch.
//
// Version slots (single current-generation strings) use downgrade detection:
// same `*.v<N>` prefix family with a lower number => INCOMPATIBLE_CHANGE;
// any other change => SEMANTIC_CHANGE. Version sets (supported generations)
// are additive-only compatible: adding a member is COMPATIBLE_CHANGE; removing
// one is INCOMPATIBLE_CHANGE (retirement breaks historical binding).
//
// Precedence when several deltas coexist (highest wins):
//   UNCHANGED < COMPATIBLE_CHANGE < SEMANTIC_CHANGE < INCOMPATIBLE_CHANGE <
//   AUTHORITY_CHANGE
// Rationale: owner/policy authority signals govern the interpretation of all
// technical deltas; structural incompatibility outranks semantic drift;
// semantic drift outranks additive compatibility. Every concrete delta stays
// visible in `findings` regardless of the top-level classification.
//
// Pure: deterministic order, no fs/network/environment access.
// ---------------------------------------------------------------------------

import type {
  CampaignVersionFingerprint,
  ProjectSnapshotContractFamily,
  ProjectSnapshotDiff,
  ProjectSnapshotDiffClassification,
  ProjectSnapshotDiffFinding,
  ProjectSnapshotManifest,
} from './types';

/**
 * Severity order, lowest to highest. Documented contract; tests pin it.
 */
export const PROJECT_SNAPSHOT_CLASSIFICATION_PRECEDENCE: readonly ProjectSnapshotDiffClassification[] =
  Object.freeze([
    'UNCHANGED',
    'COMPATIBLE_CHANGE',
    'SEMANTIC_CHANGE',
    'INCOMPATIBLE_CHANGE',
    'AUTHORITY_CHANGE',
  ]);

const SEVERITY: Readonly<Record<ProjectSnapshotDiffClassification, number>> = {
  UNCHANGED: 0,
  COMPATIBLE_CHANGE: 1,
  SEMANTIC_CHANGE: 2,
  INCOMPATIBLE_CHANGE: 3,
  AUTHORITY_CHANGE: 4,
};

const VERSION_SLOT_RE = /^([^\s].*)\.v([0-9]+)$/;

type SlotDelta = 'NONE' | 'DOWNGRADE' | 'CHANGED';

function slotDelta(previous: string, current: string): SlotDelta {
  if (previous === current) return 'NONE';
  const prevMatch = VERSION_SLOT_RE.exec(previous);
  const currMatch = VERSION_SLOT_RE.exec(current);
  if (
    prevMatch !== null &&
    currMatch !== null &&
    prevMatch[1] !== undefined &&
    currMatch[1] !== undefined &&
    prevMatch[1] === currMatch[1] &&
    prevMatch[2] !== undefined &&
    currMatch[2] !== undefined
  ) {
    return Number(currMatch[2]) < Number(prevMatch[2]) ? 'DOWNGRADE' : 'CHANGED';
  }
  return 'CHANGED';
}

function classifySlot(delta: SlotDelta): ProjectSnapshotDiffClassification {
  if (delta === 'NONE') return 'UNCHANGED';
  if (delta === 'DOWNGRADE') return 'INCOMPATIBLE_CHANGE';
  return 'SEMANTIC_CHANGE';
}

interface SetDelta {
  readonly added: readonly string[];
  readonly removed: readonly string[];
}

function setDelta(previous: readonly string[], current: readonly string[]): SetDelta {
  const previousSet = new Set(previous);
  const currentSet = new Set(current);
  return {
    added: Object.freeze(current.filter((value) => !previousSet.has(value))),
    removed: Object.freeze(previous.filter((value) => !currentSet.has(value))),
  };
}

/** Additive-only compatible: any removal makes the change incompatible. */
function classifySet(delta: SetDelta): ProjectSnapshotDiffClassification {
  if (delta.added.length === 0 && delta.removed.length === 0) return 'UNCHANGED';
  if (delta.removed.length === 0) return 'COMPATIBLE_CHANGE';
  return 'INCOMPATIBLE_CHANGE';
}

function pushSetFindings(
  findings: ProjectSnapshotDiffFinding[],
  section: string,
  delta: SetDelta,
): void {
  const classification = classifySet(delta);
  if (classification === 'UNCHANGED') return;
  for (const value of delta.added) {
    findings.push({ section, kind: 'ADDED', classification, detail: value });
  }
  for (const value of delta.removed) {
    findings.push({ section, kind: 'REMOVED', classification, detail: value });
  }
}

function pushSlotFindings(
  findings: ProjectSnapshotDiffFinding[],
  section: string,
  previous: string,
  current: string,
): void {
  const delta = slotDelta(previous, current);
  if (delta === 'NONE') return;
  findings.push({
    section,
    kind: 'CHANGED',
    classification: classifySlot(delta),
    detail: `${previous} -> ${current}`,
  });
}

const FAMILY_FIELDS = [
  'targetId',
  'kind',
  'scope',
  'expectationId',
  'derivationVersion',
  'evidenceVersion',
  'currentnessRequirement',
  'campaignEligible',
  'predecessorFamilyId',
  'successorFamilyId',
  'historicalImmutable',
] as const;

function pushFamilyFindings(
  findings: ProjectSnapshotDiffFinding[],
  previousFamilies: readonly ProjectSnapshotContractFamily[],
  currentFamilies: readonly ProjectSnapshotContractFamily[],
): void {
  const previousById = new Map(previousFamilies.map((family) => [family.familyId, family]));
  const currentById = new Map(currentFamilies.map((family) => [family.familyId, family]));

  for (const [familyId] of currentById) {
    if (!previousById.has(familyId)) {
      findings.push({
        section: 'contractFamilies',
        kind: 'ADDED',
        classification: 'COMPATIBLE_CHANGE',
        detail: familyId,
      });
    }
  }
  for (const [familyId] of previousById) {
    if (!currentById.has(familyId)) {
      findings.push({
        section: 'contractFamilies',
        kind: 'REMOVED',
        classification: 'INCOMPATIBLE_CHANGE',
        detail: familyId,
      });
    }
  }
  for (const [familyId, currentFamily] of currentById) {
    const previousFamily = previousById.get(familyId);
    if (previousFamily === undefined) continue;
    const changedFields = FAMILY_FIELDS.filter((field) => previousFamily[field] !== currentFamily[field]);
    if (changedFields.length > 0) {
      findings.push({
        section: 'contractFamilies',
        kind: 'CHANGED',
        classification: 'SEMANTIC_CHANGE',
        detail: `${familyId}:${changedFields.join(',')}`,
      });
    }
  }
}

const OWNER_SCOPE_FIELDS = ['policyVersion', 'status', 'reason'] as const;

function pushCampaignFindings(
  findings: ProjectSnapshotDiffFinding[],
  previousVersions: CampaignVersionFingerprint,
  currentVersions: CampaignVersionFingerprint,
): void {
  const keys = Object.keys(previousVersions) as readonly (keyof CampaignVersionFingerprint)[];
  for (const key of [...keys].sort((a, b) => a.localeCompare(b))) {
    const before = previousVersions[key];
    const after = currentVersions[key];
    if (before === after) continue;
    findings.push({
      section: `campaignVersions.${key}`,
      kind: 'CHANGED',
      // The owner-scope policy marker inside the campaign fingerprint is
      // authority state; every other fingerprint field is campaign semantics.
      classification: key === 'ownerScopePolicyVersion' ? 'AUTHORITY_CHANGE' : 'SEMANTIC_CHANGE',
      detail: `${before} -> ${after}`,
    });
  }
}

/**
 * Compare two built manifests. Deterministic finding order; the top-level
 * classification follows the documented precedence. A snapshot schema-version
 * mismatch short-circuits to a single INCOMPATIBLE_CHANGE SCHEMA_MISMATCH
 * finding (other sections are not meaningfully comparable across schemas).
 */
export function compareProjectSnapshots(
  previous: ProjectSnapshotManifest,
  current: ProjectSnapshotManifest,
): ProjectSnapshotDiff {
  const findings: ProjectSnapshotDiffFinding[] = [];

  if (previous.snapshotSchemaVersion !== current.snapshotSchemaVersion) {
    findings.push({
      section: 'snapshotSchemaVersion',
      kind: 'SCHEMA_MISMATCH',
      classification: 'INCOMPATIBLE_CHANGE',
      detail: `${previous.snapshotSchemaVersion} -> ${current.snapshotSchemaVersion}`,
    });
    return finalize(findings);
  }

  for (const field of OWNER_SCOPE_FIELDS) {
    if (previous.ownerScope[field] !== current.ownerScope[field]) {
      findings.push({
        section: `ownerScope.${field}`,
        kind: 'CHANGED',
        classification: 'AUTHORITY_CHANGE',
        detail: `${previous.ownerScope[field]} -> ${current.ownerScope[field]}`,
      });
    }
  }

  // The approved read-only target registry is authority state: expansion AND
  // revocation are AUTHORITY_CHANGE, never merely compatible.
  const targetDelta = setDelta(previous.approvedTargets, current.approvedTargets);
  for (const targetId of targetDelta.added) {
    findings.push({ section: 'approvedTargets', kind: 'ADDED', classification: 'AUTHORITY_CHANGE', detail: targetId });
  }
  for (const targetId of targetDelta.removed) {
    findings.push({ section: 'approvedTargets', kind: 'REMOVED', classification: 'AUTHORITY_CHANGE', detail: targetId });
  }

  pushSlotFindings(findings, 'contractRegistryVersion', previous.contractRegistryVersion, current.contractRegistryVersion);
  pushFamilyFindings(findings, previous.contractFamilies, current.contractFamilies);
  pushSetFindings(findings, 'recipeSchemaVersions', setDelta(previous.recipeSchemaVersions, current.recipeSchemaVersions));
  pushSetFindings(findings, 'derivationVersions', setDelta(previous.derivationVersions, current.derivationVersions));
  pushSlotFindings(findings, 'analyzerVersion', previous.analyzerVersion, current.analyzerVersion);
  pushSetFindings(findings, 'replayPlanVersions', setDelta(previous.replayPlanVersions, current.replayPlanVersions));
  pushSlotFindings(findings, 'semanticReceiptVersion', previous.semanticReceiptVersion, current.semanticReceiptVersion);
  pushSetFindings(findings, 'dossierVersions', setDelta(previous.dossierVersions, current.dossierVersions));
  pushCampaignFindings(findings, previous.campaignVersions, current.campaignVersions);
  pushSetFindings(
    findings,
    'adoptedCaseCatalog.entryDigests',
    setDelta(previous.adoptedCaseCatalog.entryDigests, current.adoptedCaseCatalog.entryDigests),
  );

  return finalize(findings);
}

function finalize(findings: ProjectSnapshotDiffFinding[]): ProjectSnapshotDiff {
  let classification: ProjectSnapshotDiffClassification = 'UNCHANGED';
  for (const finding of findings) {
    if (SEVERITY[finding.classification] > SEVERITY[classification]) {
      classification = finding.classification;
    }
  }
  return { classification, findings: Object.freeze(findings) };
}
