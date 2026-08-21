// ---------------------------------------------------------------------------
// Nightwatch Phase 13A — real campaign semantic observer wiring (plumbing).
//
// Connects the existing `semanticOracle` / NetworkObserver seam to the real
// campaign path for fixed already-approved mappings only. The real campaign
// MUST NOT invent semantic authority: a resolver is supplied by an external
// read-only source discoverer (or left undefined for protocol-only runs), and
// the oracle is injected only when the work item maps to an approved target.
//
// Pure-adjacent: this module performs no network, browser, filesystem, child
// process, DB, or AI work. It adapts a resolver function into the observer
// seam and derives sanitized categorical control metadata from a frozen
// SemanticCampaignBundle.
// ---------------------------------------------------------------------------

import type { SemanticResponseOracle } from '../../browser/observers/networkObserver';
import type { RealSourceResolution } from '../../oracles/expectations/resolver';
import { validateSemanticCampaignBundle, type SemanticCampaignBundle } from '../source/semanticCampaignBundle';
import { resolveApprovedCampaignSemanticTarget } from '../../oracles/semantic/campaignTargetMapping';

// ---------------------------------------------------------------------------
// Phase 15 Session 2 (Workstream C) — frozen-bundle registry for promotion.
//
// CampaignSemanticEvidence carries only the bundle ID, so the promotion path
// needs a lookup from bundleId back to the frozen bundle to prove coherence.
// Bundles are supplied by the external read-only freshness producer, validated
// strictly at registration, and never mutated afterwards. The registry is a
// process-local data map: no fs/network authority, deterministic reads.
// ---------------------------------------------------------------------------

const campaignSemanticBundles = new Map<string, SemanticCampaignBundle>();

/** Register frozen bundles for the current process; invalid bundles fail closed. */
export function registerCampaignSemanticBundles(bundles: readonly SemanticCampaignBundle[]): void {
  for (const bundle of bundles) {
    validateSemanticCampaignBundle(bundle);
    campaignSemanticBundles.set(bundle.bundleId, bundle);
  }
}

/** Frozen-bundle lookup by the identity carried in CampaignSemanticEvidence. */
export function campaignSemanticBundleById(bundleId: string): SemanticCampaignBundle | undefined {
  return campaignSemanticBundles.get(bundleId);
}

/** Test/process isolation hook; real adapters never need to clear. */
export function clearCampaignSemanticBundles(): void {
  campaignSemanticBundles.clear();
}

export interface SanitizedSemanticControlMetadata {
  readonly expectationId: string;
  readonly targetId: string;
  readonly resolverState: SemanticCampaignBundle['resolverState'];
  readonly sourceEvidenceDigest: string;
  readonly sourceDerivationVersion: string;
  readonly collectionAdmissionVersion: string;
  readonly devReachability: SemanticCampaignBundle['devReachability'];
  readonly deploymentStatusUnresolved: true;
}

/**
 * Adapt a resolver function (supplied by a read-only source discoverer) into
 * the observer seam's `SemanticResponseOracle` contract. Unknown/unsupported
 * targetIds must resolve to NO_EXPECTATION by the underlying resolver, so this
 * wrapper never grants invented semantic authority.
 */
export function buildCampaignSemanticOracle(resolve: (targetId: string) => RealSourceResolution): SemanticResponseOracle {
  return {
    resolve(input: { targetId?: string; url?: string; method?: string }): RealSourceResolution {
      const targetId = input.targetId;
      if (targetId === undefined) return { kind: 'NO_EXPECTATION' };
      return resolve(targetId);
    },
  };
}

/** True when the frozen bundle authorizes semantic observation for targetId. */
export function bundleSupportsTarget(bundle: SemanticCampaignBundle, targetId: string): boolean {
  return bundle.approvedMapping.targetId === targetId && bundle.resolverState === 'RESOLVED';
}

/** Safe categorical control metadata derived from a frozen bundle (no raw values). */
export function bundleControlMetadata(bundle: SemanticCampaignBundle): SanitizedSemanticControlMetadata {
  return {
    expectationId: bundle.expectationId,
    targetId: bundle.targetId,
    resolverState: bundle.resolverState,
    sourceEvidenceDigest: bundle.sourceEvidenceDigest,
    sourceDerivationVersion: bundle.sourceDerivationVersion,
    collectionAdmissionVersion: bundle.collectionAdmissionVersion,
    devReachability: bundle.devReachability,
    deploymentStatusUnresolved: true,
  };
}

/**
 * Decide whether the real campaign path may wire the semantic observer seam
 * for a given journey/operation. Returns the fixed mapping when approved and
 * the bundle is current, otherwise null (caller must stay protocol-only).
 */
export function campaignSemanticObservationFor(
  bundle: SemanticCampaignBundle | null | undefined,
  journeyOrOperationId: string,
): { readonly approved: boolean; readonly current: boolean; readonly targetId: string | null } {
  const mapping = resolveApprovedCampaignSemanticTarget(journeyOrOperationId);
  if (mapping === null) return { approved: false, current: false, targetId: null };
  const current = bundle !== null && bundle !== undefined && bundleSupportsTarget(bundle, mapping.targetId);
  return { approved: true, current, targetId: mapping.targetId };
}
