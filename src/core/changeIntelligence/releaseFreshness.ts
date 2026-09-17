// ---------------------------------------------------------------------------
// NW-HIST-008 — RELEASE_BRANCH_FRESHNESS: a pure, injected-oracle classifier.
//
// Scope boundary (permanent): this state answers ONE question — is a declared
// fix commit an ancestor of the declared local refs? It is NOT a deployment
// detector. The executable vocabulary below cannot express DEPLOYED, RELEASED
// or IN_PRODUCTION; the report carries freshness LOCAL_TRACKING_REF_ONLY and
// deploymentClaim NONE, and no field is derived from CI, network or cloud.
//
// Purity: no fs/child_process/network/env/clock/randomness. Observations and
// the ancestry oracle are injected; `bin/release-freshness.mjs` owns the
// fixed-argv read-only Git spawns, and `bin/frontier-determinism.mjs` proves
// this core's output identity across fresh processes.
//
// Exact verdict sequence (owner-frozen):
//   1 inventory invalid                 -> INVENTORY_INVALID (no oracle calls)
//   2 fix SHA missing locally           -> PIN_UNAVAILABLE
//   3 integration ref missing           -> REF_UNAVAILABLE
//   4 fix not ancestor of integration   -> FIX_NOT_ON_INTEGRATION
//   5 applicable release ref missing    -> REF_UNAVAILABLE (never STALE)
//   6 deployFromIntegration declared    -> NOT_APPLICABLE_DECLARED
//   7 cherryPickModel declared          -> NOT_APPLICABLE_DECLARED
//   8 all applicable refs contain fix   -> RELEASE_BRANCH_FRESH
//   9 integration contains fix, every applicable ref resolves locally, and
//     >= 1 applicable ref lacks it     -> RELEASE_BRANCH_STALE
//
// "Applicable" means declared in `releaseRefs` and not named in `exclusions`.
// SERVICE_PATH_MISSING is the non-escalating validation state for a row with
// no declared service path (a path-silent row cannot be judged); it is
// checked after the declared model modes and before ancestry evaluation.
// Patch-id / cherry-pick EQUIVALENCE is never inferred; it must be declared.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import {
  validateReleaseRefInventory,
  validateReleaseRefRow,
  type ReleaseRefRow,
} from './releaseFreshnessInventory';

export const RELEASE_FRESHNESS_SCHEMA = 'nightwatch.release-freshness-report.v1' as const;

export const RELEASE_FRESHNESS_VERDICTS = [
  'RELEASE_BRANCH_FRESH',
  'RELEASE_BRANCH_STALE',
  'REF_UNAVAILABLE',
  'PIN_UNAVAILABLE',
  'FIX_NOT_ON_INTEGRATION',
  'NOT_APPLICABLE_DECLARED',
  'INVENTORY_INVALID',
  'GIT_ERROR',
  'SERVICE_PATH_MISSING',
] as const;
export type ReleaseFreshnessVerdict = (typeof RELEASE_FRESHNESS_VERDICTS)[number];

/** Closed reason-code vocabulary. Additions require a test in the same change. */
export const RELEASE_FRESHNESS_REASON_CODES = ['MISSING_FROM_RELEASE_REF'] as const;
export type ReleaseFreshnessReasonCode = (typeof RELEASE_FRESHNESS_REASON_CODES)[number];

/** One local observation: a commit object, a ref, or a bounded spawn error. */
export type LocalCommit = { readonly state: 'AVAILABLE'; readonly sha: string } | { readonly state: 'UNAVAILABLE' | 'ERROR' };

/**
 * Injected observation boundary. A production implementation spawns fixed-argv
 * read-only Git; a test injects a deterministic stub. Nothing else may supply
 * ancestry answers to this module.
 */
export interface ReleaseAncestryOracle {
  /** Does the declared fix commit resolve in the repository object database? */
  pin(repoId: string, sha: string): LocalCommit;
  /** Does the declared ref resolve locally, and to which commit? */
  ref(repoId: string, ref: string): LocalCommit;
  /** Is the fix commit an ancestor of the resolved ref tip? */
  ancestor(repoId: string, fixSha: string, refTipSha: string): 'CONTAINED' | 'NOT_CONTAINED' | 'ERROR';
}

export type ReleaseContainmentState = 'CONTAINED' | 'NOT_CONTAINED' | 'UNAVAILABLE' | 'ERROR' | 'NOT_CHECKED';

export interface ReleaseContainmentObservation {
  readonly ref: string;
  readonly sha: string | null;
  readonly state: ReleaseContainmentState;
}

export interface ReleaseFreshnessRow {
  readonly rowId: string | null;
  readonly repoId: string | null;
  readonly fixSha: string | null;
  readonly integrationRef: string | null;
  readonly releaseRefs: readonly string[];
  readonly servicePaths: readonly string[];
  readonly containment: readonly ReleaseContainmentObservation[];
  readonly verdict: ReleaseFreshnessVerdict;
  readonly reasonCodes: readonly ReleaseFreshnessReasonCode[];
}

export interface ReleaseFreshnessReport {
  readonly schemaVersion: typeof RELEASE_FRESHNESS_SCHEMA;
  readonly freshness: 'LOCAL_TRACKING_REF_ONLY';
  readonly deploymentClaim: 'NONE';
  readonly inventoryDigest: string | null;
  readonly rows: readonly ReleaseFreshnessRow[];
  readonly reportDigest: string;
}

function isAvailable(value: LocalCommit): value is { readonly state: 'AVAILABLE'; readonly sha: string } {
  return value.state === 'AVAILABLE' && /^[0-9a-f]{40}$/.test(value.sha);
}

function normalizedRow(input: ReleaseRefRow): ReleaseRefRow {
  return {
    ...input,
    releaseRefs: [...input.releaseRefs].sort(),
    servicePaths: [...input.servicePaths].sort(),
    exclusions: [...input.exclusions].sort(),
  };
}

function invalidRow(): ReleaseFreshnessRow {
  return {
    rowId: null,
    repoId: null,
    fixSha: null,
    integrationRef: null,
    releaseRefs: [],
    servicePaths: [],
    containment: [],
    verdict: 'INVENTORY_INVALID',
    reasonCodes: [],
  };
}

/**
 * Classify one declared row. An invalid row is refused before any oracle call,
 * so an invalid inventory performs zero Git work by construction.
 */
export function classifyReleaseFreshness(input: unknown, oracle: ReleaseAncestryOracle): ReleaseFreshnessRow {
  if (!validateReleaseRefRow(input)) return invalidRow();
  const row = normalizedRow(input);
  const containment: ReleaseContainmentObservation[] = [];
  const result = (
    verdict: ReleaseFreshnessVerdict,
    reasonCodes: readonly ReleaseFreshnessReasonCode[] = [],
  ): ReleaseFreshnessRow => ({
    rowId: row.rowId,
    repoId: row.repoId,
    fixSha: row.fixSha,
    integrationRef: row.integrationRef,
    releaseRefs: row.releaseRefs,
    servicePaths: row.servicePaths,
    containment: [...containment],
    verdict,
    reasonCodes,
  });

  try {
    const pin = oracle.pin(row.repoId, row.fixSha);
    if (pin.state === 'ERROR') return result('GIT_ERROR');
    if (!isAvailable(pin)) return result('PIN_UNAVAILABLE');

    const integration = oracle.ref(row.repoId, row.integrationRef);
    if (integration.state === 'ERROR') return result('GIT_ERROR');
    if (!isAvailable(integration)) return result('REF_UNAVAILABLE');
    const integrationState = oracle.ancestor(row.repoId, row.fixSha, integration.sha);
    containment.push({ ref: row.integrationRef, sha: integration.sha, state: integrationState });
    if (integrationState === 'ERROR') return result('GIT_ERROR');
    if (integrationState === 'NOT_CONTAINED') return result('FIX_NOT_ON_INTEGRATION');

    const applicable = row.releaseRefs.filter((ref) => !row.exclusions.includes(ref));
    const resolutions = applicable.map((ref) => ({ ref, observation: oracle.ref(row.repoId, ref) }));
    for (const entry of resolutions) {
      containment.push({
        ref: entry.ref,
        sha: isAvailable(entry.observation) ? entry.observation.sha : null,
        state: entry.observation.state === 'UNAVAILABLE' ? 'UNAVAILABLE' : isAvailable(entry.observation) ? 'NOT_CHECKED' : 'ERROR',
      });
    }
    if (resolutions.some((entry) => entry.observation.state === 'ERROR' || (entry.observation.state === 'AVAILABLE' && !isAvailable(entry.observation)))) {
      return result('GIT_ERROR');
    }
    if (resolutions.some((entry) => entry.observation.state === 'UNAVAILABLE')) return result('REF_UNAVAILABLE');

    if (row.deployFromIntegration || row.cherryPickModel || applicable.length === 0) return result('NOT_APPLICABLE_DECLARED');
    if (row.servicePaths.length === 0) return result('SERVICE_PATH_MISSING');

    for (const entry of containment.slice(1)) {
      if (entry.sha === null) return result('GIT_ERROR');
      const state = oracle.ancestor(row.repoId, row.fixSha, entry.sha);
      (entry as { state: ReleaseContainmentState }).state = state;
      if (state === 'ERROR') return result('GIT_ERROR');
    }
    return containment.some((entry) => entry.state === 'NOT_CONTAINED')
      ? result('RELEASE_BRANCH_STALE', ['MISSING_FROM_RELEASE_REF'])
      : result('RELEASE_BRANCH_FRESH');
  } catch {
    return result('GIT_ERROR');
  }
}

/**
 * Deterministic report over the declared inventory. No timestamp, no
 * environment read, no locale-sensitive sorting: the same inventory and the
 * same observations always produce the same `rfr:` digest.
 */
export function releaseFreshnessReport(input: unknown, oracle: ReleaseAncestryOracle): ReleaseFreshnessReport {
  const validation = validateReleaseRefInventory(input);
  const rows: readonly ReleaseFreshnessRow[] = validation.ok
    ? validation.config.rows.map((row) => classifyReleaseFreshness(row, oracle))
    : [invalidRow()];
  const report = {
    schemaVersion: RELEASE_FRESHNESS_SCHEMA,
    freshness: 'LOCAL_TRACKING_REF_ONLY' as const,
    deploymentClaim: 'NONE' as const,
    inventoryDigest: validation.ok ? validation.inventoryDigest : null,
    rows,
  };
  return { ...report, reportDigest: prefixedDigest24('rfr', report) };
}
