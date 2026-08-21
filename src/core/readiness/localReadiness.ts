// ---------------------------------------------------------------------------
// Nightwatch Phase 15P A10 — local readiness summarizer (pure core).
//
// `summarizeLocalReadiness` is a pure function over explicit inputs: callers
// supply what to summarize, so this module stays deterministic and testable.
// Both renderers (`renderLocalReadinessJson`, `renderLocalReadinessText`)
// derive from the ONE summary model — never duplicated logic.
//
// Category resolution is deterministic and fail-closed, most severe first:
//   NOT_APPLICABLE            caller marked the surface not applicable
//   BLOCKED_AUTHORITY         AUTHORITY blocker or owner-scope marker drift
//   BLOCKED_SOURCE            SOURCE blocker, structural contract gap,
//                             stale/unavailable currentness
//   BLOCKED_VERSION           VERSION blocker, version drift, or an
//                             INCOMPATIBLE checkpoint
//   BLOCKED_EXTERNAL_CI       EXTERNAL_CI blocker or FAIL/BLOCKED category
//   READY_LOCAL_SYNTHETIC     none of the above
//
// Hardening: no fs, no network, no child processes, no environment access, no
// persistence, no timestamps. Blocker details are privacy-screened and fail
// closed on token-like free text.
// ---------------------------------------------------------------------------

import {
  OWNER_SCOPE_REASON,
  OWNER_SCOPE_STATUS,
  FROZEN_OWNER_OPERATIONS,
} from '../policy/ownerScope';
import {
  LOCAL_READINESS_BLOCKER_KINDS,
  LOCAL_READINESS_CHECKPOINT_COMPATIBILITY_VALUES,
  LOCAL_READINESS_CURRENTNESS_VALUES,
  LOCAL_READINESS_EXTERNAL_CI_VALUES,
  LOCAL_READINESS_MODEL_VERSION,
} from './types';
import type {
  LocalReadinessBlocker,
  LocalReadinessCampaignSummary,
  LocalReadinessCategory,
  LocalReadinessCheckpointCompatibility,
  LocalReadinessContractHealth,
  LocalReadinessCurrentness,
  LocalReadinessExternalCi,
  LocalReadinessInput,
  LocalReadinessSummary,
  LocalReadinessTargetCoverage,
  LocalReadinessTargetCoverageEntry,
} from './types';

/** Canonical owner-scope markers the summary compares against (fail-closed). */
export const EXPECTED_OWNER_SCOPE_STATUS: string = OWNER_SCOPE_STATUS;
export const EXPECTED_OWNER_SCOPE_REASON: string = OWNER_SCOPE_REASON;
export const EXPECTED_FROZEN_OPERATION_COUNT: number = FROZEN_OWNER_OPERATIONS.length;

const BLOCKER_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
/** Bounded categorical detail charset; anything richer fails closed. */
const BLOCKER_DETAIL_PATTERN = /^[A-Za-z0-9 ._:/()-]{0,160}$/;
/** Substrings that must never appear in any carried detail (case-insensitive). */
const BLOCKER_DETAIL_DENYLIST = [
  'bearer',
  'token',
  'cookie',
  'password',
  'secret',
  'credential',
  'authorization',
  'api-key',
  'apikey',
  'private-key',
] as const;

function failClosed(code: string): never {
  throw new Error(code);
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function validateBlocker(blocker: LocalReadinessBlocker, index: number): void {
  if (!LOCAL_READINESS_BLOCKER_KINDS.includes(blocker.kind)) {
    failClosed(`READINESS_INVALID_BLOCKER:kind:${index}:${String(blocker.kind)}`);
  }
  if (typeof blocker.code !== 'string' || !BLOCKER_CODE_PATTERN.test(blocker.code)) {
    failClosed(`READINESS_INVALID_BLOCKER:code:${index}`);
  }
  if (blocker.detail === undefined) return;
  if (typeof blocker.detail !== 'string' || !BLOCKER_DETAIL_PATTERN.test(blocker.detail)) {
    failClosed(`READINESS_PRIVACY_BLOCKED:blocker-detail:${index}`);
  }
  const lowered = blocker.detail.toLowerCase();
  for (const forbidden of BLOCKER_DETAIL_DENYLIST) {
    if (lowered.includes(forbidden)) {
      failClosed(`READINESS_PRIVACY_BLOCKED:blocker-detail:${index}`);
    }
  }
}

function normalizeBlockers(blockers: readonly LocalReadinessBlocker[]): LocalReadinessBlocker[] {
  blockers.forEach(validateBlocker);
  const kindOrder = new Map<string, number>(
    LOCAL_READINESS_BLOCKER_KINDS.map((kind, index) => [kind, index]),
  );
  return [...blockers].sort((a, b) => {
    const kindDelta =
      (kindOrder.get(a.kind) ?? Number.MAX_SAFE_INTEGER) -
      (kindOrder.get(b.kind) ?? Number.MAX_SAFE_INTEGER);
    if (kindDelta !== 0) return kindDelta;
    return compareStrings(a.code, b.code);
  });
}

function summarizeSourceContracts(input: LocalReadinessInput): {
  health: LocalReadinessContractHealth;
  sourceBlocked: boolean;
} {
  const { approvedTargetIds, families, currentnessByTargetId } = input.sourceContracts;

  if (approvedTargetIds.length === 0) {
    failClosed('READINESS_INVALID_TARGETS:empty');
  }
  const seenTargets = new Set<string>();
  for (const targetId of approvedTargetIds) {
    if (targetId === '') failClosed('READINESS_INVALID_TARGETS:empty-id');
    if (seenTargets.has(targetId)) failClosed(`READINESS_INVALID_TARGETS:duplicate-target:${targetId}`);
    seenTargets.add(targetId);
  }

  const seenFamilyIds = new Set<string>();
  for (const [index, family] of families.entries()) {
    if (family.familyId === '' || family.targetId === '') {
      failClosed(`READINESS_INVALID_FAMILIES:empty-identity:${index}`);
    }
    if (seenFamilyIds.has(family.familyId)) {
      failClosed(`READINESS_INVALID_FAMILIES:duplicate-family-id:${family.familyId}`);
    }
    seenFamilyIds.add(family.familyId);
  }

  for (const [targetId, currentness] of Object.entries(currentnessByTargetId)) {
    if (!LOCAL_READINESS_CURRENTNESS_VALUES.includes(currentness)) {
      failClosed(`READINESS_INVALID_CURRENTNESS:${targetId}`);
    }
  }

  const familiesByKind: Record<string, number> = {};
  let activeFamilies = 0;
  let archivedFamilies = 0;
  let campaignEligibleExpectationFamilies = 0;
  const activeByTarget = new Map<string, number>();
  const unknownTargets: string[] = [];
  for (const family of families) {
    familiesByKind[family.kind] = (familiesByKind[family.kind] ?? 0) + 1;
    if (family.historicalImmutable) {
      archivedFamilies += 1;
      continue;
    }
    activeFamilies += 1;
    activeByTarget.set(family.targetId, (activeByTarget.get(family.targetId) ?? 0) + 1);
    if (family.campaignEligible && family.hasExpectationId) {
      campaignEligibleExpectationFamilies += 1;
    }
    if (!seenTargets.has(family.targetId)) unknownTargets.push(family.targetId);
  }

  const targetsMissingActiveFamily = sortedUnique(
    approvedTargetIds.filter((targetId) => !activeByTarget.has(targetId)),
  );

  const currentnessCounts: Record<LocalReadinessCurrentness, number> = {
    CURRENT: 0,
    STALE: 0,
    SOURCE_UNAVAILABLE: 0,
    NOT_EVALUATED: 0,
  };
  const staleTargets: string[] = [];
  const unavailableTargets: string[] = [];
  const unevaluatedTargets: string[] = [];
  for (const targetId of approvedTargetIds) {
    const currentness = currentnessByTargetId[targetId] ?? 'NOT_EVALUATED';
    currentnessCounts[currentness] += 1;
    if (currentness === 'STALE') staleTargets.push(targetId);
    else if (currentness === 'SOURCE_UNAVAILABLE') unavailableTargets.push(targetId);
    else if (currentness === 'NOT_EVALUATED') unevaluatedTargets.push(targetId);
  }

  const health = {
    totalFamilies: families.length,
    activeFamilies,
    archivedFamilies,
    familiesByKind,
    approvedTargets: approvedTargetIds.length,
    targetsWithActiveFamily: approvedTargetIds.length - targetsMissingActiveFamily.length,
    targetsMissingActiveFamily,
    unknownFamilyTargets: sortedUnique(unknownTargets),
    campaignEligibleExpectationFamilies,
    currentnessCounts,
    currentnessUnevaluatedTargets: sortedUnique(unevaluatedTargets),
    staleTargets: [...staleTargets].sort(compareStrings),
    unavailableTargets: [...unavailableTargets].sort(compareStrings),
  };

  const sourceBlocked =
    targetsMissingActiveFamily.length > 0 ||
    unknownTargets.length > 0 ||
    staleTargets.length > 0 ||
    unavailableTargets.length > 0;

  return { health, sourceBlocked };
}

function summarizeCampaign(input: LocalReadinessInput): {
  campaign: LocalReadinessCampaignSummary;
  versionBlocked: boolean;
} {
  const { pinnedVersions, observedVersions } = input.campaign;
  for (const [key, value] of Object.entries(pinnedVersions)) {
    if (key === '' || typeof value !== 'string' || value === '') {
      failClosed(`READINESS_INVALID_VERSIONS:${key === '' ? '<empty-key>' : key}`);
    }
  }

  if (observedVersions === null) {
    return {
      campaign: { category: 'UNMEASURED', comparedKeys: [], driftKeys: [], unmeasured: true },
      versionBlocked: false,
    };
  }

  const comparedKeys = sortedUnique(
    Object.keys(pinnedVersions).filter((key) => Object.prototype.hasOwnProperty.call(observedVersions, key)),
  );
  const driftKeys = comparedKeys.filter((key) => pinnedVersions[key] !== observedVersions[key]);
  return {
    campaign: {
      category: driftKeys.length > 0 ? 'DRIFT_DETECTED' : 'PINNED_CONSISTENT',
      comparedKeys,
      driftKeys,
      unmeasured: false,
    },
    versionBlocked: driftKeys.length > 0,
  };
}

function ownerScopeMatchesMarkers(input: LocalReadinessInput): boolean {
  return (
    input.ownerScope.status === EXPECTED_OWNER_SCOPE_STATUS &&
    input.ownerScope.reason === EXPECTED_OWNER_SCOPE_REASON &&
    input.ownerScope.frozenOperationCount === EXPECTED_FROZEN_OPERATION_COUNT
  );
}

function coverageForTarget(activeCount: number, hasCampaignEligibleExpectation: boolean): LocalReadinessTargetCoverage {
  if (activeCount === 0) return 'MISSING';
  return hasCampaignEligibleExpectation ? 'COVERED' : 'PARTIAL';
}

/**
 * Pure summarizer over explicit inputs. Throws Error('CODE:...') on invalid
 * or privacy-unsafe inputs (fail-closed); never throws on healthy-but-unknown
 * facts (those surface as categories instead).
 */
export function summarizeLocalReadiness(input: LocalReadinessInput): LocalReadinessSummary {
  if (!LOCAL_READINESS_CHECKPOINT_COMPATIBILITY_VALUES.includes(input.checkpointCompatibility)) {
    failClosed(`READINESS_INVALID_CHECKPOINT:${String(input.checkpointCompatibility)}`);
  }
  if (!LOCAL_READINESS_EXTERNAL_CI_VALUES.includes(input.externalCi)) {
    failClosed(`READINESS_INVALID_EXTERNAL_CI:${String(input.externalCi)}`);
  }
  const normalizedBlockers = normalizeBlockers(input.unresolvedBlockers);

  const { health, sourceBlocked } = summarizeSourceContracts(input);
  const { campaign, versionBlocked } = summarizeCampaign(input);
  const matchesFrozenMarkers = ownerScopeMatchesMarkers(input);

  // Approved-target coverage entries (structural only), sorted by targetId.
  const activeCountByTarget = new Map<string, number>();
  const eligibleByTarget = new Set<string>();
  for (const family of input.sourceContracts.families) {
    if (family.historicalImmutable) continue;
    activeCountByTarget.set(family.targetId, (activeCountByTarget.get(family.targetId) ?? 0) + 1);
    if (family.campaignEligible && family.hasExpectationId) eligibleByTarget.add(family.targetId);
  }
  const approvedTargetCoverage: LocalReadinessTargetCoverageEntry[] = input.sourceContracts.approvedTargetIds
    .map((targetId) => ({
      targetId,
      coverage: coverageForTarget(activeCountByTarget.get(targetId) ?? 0, eligibleByTarget.has(targetId)),
      activeFamilies: activeCountByTarget.get(targetId) ?? 0,
      currentness: input.sourceContracts.currentnessByTargetId[targetId] ?? ('NOT_EVALUATED' as LocalReadinessCurrentness),
    }))
    .sort((a, b) => compareStrings(a.targetId, b.targetId));

  const authorityBlocked =
    !matchesFrozenMarkers ||
    normalizedBlockers.some((blocker) => blocker.kind === 'AUTHORITY');
  const externalCiBlocked =
    input.externalCi === 'FAIL' ||
    input.externalCi === 'BLOCKED_EXTERNAL_CI' ||
    normalizedBlockers.some((blocker) => blocker.kind === 'EXTERNAL_CI');
  const checkpointBlocked = input.checkpointCompatibility === 'INCOMPATIBLE';

  let category: LocalReadinessCategory;
  if (!input.applies) {
    category = 'NOT_APPLICABLE';
  } else if (authorityBlocked) {
    category = 'BLOCKED_AUTHORITY';
  } else if (sourceBlocked || normalizedBlockers.some((blocker) => blocker.kind === 'SOURCE')) {
    category = 'BLOCKED_SOURCE';
  } else if (versionBlocked || checkpointBlocked || normalizedBlockers.some((blocker) => blocker.kind === 'VERSION')) {
    category = 'BLOCKED_VERSION';
  } else if (externalCiBlocked) {
    category = 'BLOCKED_EXTERNAL_CI';
  } else {
    category = 'READY_LOCAL_SYNTHETIC';
  }

  return Object.freeze({
    modelVersion: LOCAL_READINESS_MODEL_VERSION,
    scope: 'LOCAL_SYNTHETIC',
    readyClaim: 'LOCAL_SYNTHETIC_ONLY',
    category,
    applies: input.applies,
    sourceContracts: Object.freeze(health),
    approvedTargetCoverage: Object.freeze(approvedTargetCoverage),
    campaign: Object.freeze(campaign),
    checkpointCompatibility: input.checkpointCompatibility,
    unresolvedBlockers: Object.freeze(normalizedBlockers.map((blocker) => Object.freeze({ ...blocker }))),
    externalCi: input.externalCi,
    ownerScope: Object.freeze({
      status: input.ownerScope.status,
      reason: input.ownerScope.reason,
      frozenOperationCount: input.ownerScope.frozenOperationCount,
      matchesFrozenMarkers,
    }),
  });
}

/** Machine-readable rendering of the ONE model. */
export function renderLocalReadinessJson(summary: LocalReadinessSummary): string {
  return `${JSON.stringify(summary, null, 2)}\n`;
}

/** Concise text rendering derived ONLY from the same model. */
export function renderLocalReadinessText(summary: LocalReadinessSummary): string {
  const contracts = summary.sourceContracts;
  const lines: string[] = [
    `nightwatch local readiness ${summary.modelVersion}`,
    `category: ${summary.category}`,
    `scope: ${summary.scope} (ready claim: ${summary.readyClaim}; never DEV/production)`,
    `source-contracts: total=${contracts.totalFamilies} active=${contracts.activeFamilies} archived=${contracts.archivedFamilies}` +
      ` targets-covered=${contractsWithActiveFamily(contracts)}/${contracts.approvedTargets}` +
      ` campaign-eligible-expectations=${contracts.campaignEligibleExpectationFamilies}`,
    `currentness: current=${contracts.currentnessCounts.CURRENT} stale=${contracts.currentnessCounts.STALE}` +
      ` unavailable=${contracts.currentnessCounts.SOURCE_UNAVAILABLE} unevaluated=${contracts.currentnessCounts.NOT_EVALUATED}`,
    `coverage: ${renderCoverageCounts(summary)}`,
    `campaign: ${summary.campaign.category} compared=${summary.campaign.comparedKeys.length} drift=${summary.campaign.driftKeys.length} unmeasured=${summary.campaign.unmeasured}`,
    `checkpoint: ${summary.checkpointCompatibility}`,
    `external-ci: ${summary.externalCi}`,
    `owner-scope: ${summary.ownerScope.status} / ${summary.ownerScope.reason} (frozen=${summary.ownerScope.frozenOperationCount} markers-match=${summary.ownerScope.matchesFrozenMarkers})`,
    `blockers: ${summary.unresolvedBlockers.length}`,
  ];
  for (const blocker of summary.unresolvedBlockers) {
    lines.push(`  - ${blocker.kind} ${blocker.code}${blocker.detail === undefined ? '' : ` (${blocker.detail})`}`);
  }
  return `${lines.join('\n')}\n`;
}

type ContractHealth = LocalReadinessSummary['sourceContracts'];

function contractsWithActiveFamily(contracts: ContractHealth): number {
  return contracts.approvedTargets - contracts.targetsMissingActiveFamily.length;
}

function renderCoverageCounts(summary: LocalReadinessSummary): string {
  const counts: Record<LocalReadinessTargetCoverage, number> = { COVERED: 0, PARTIAL: 0, MISSING: 0 };
  for (const entry of summary.approvedTargetCoverage) counts[entry.coverage] += 1;
  return `covered=${counts.COVERED} partial=${counts.PARTIAL} missing=${counts.MISSING}`;
}
