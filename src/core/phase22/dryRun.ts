import { phase22Digest } from './digest';
import { validatePhase22Manifest } from './manifest';
import { createPhase22PrivacyReceipt } from './privacy';
import { validatePhase22ObservationBudget } from './replay';
import { PHASE22_DRY_RUN_VERSION, type Phase22DevAcceptanceManifest, type Phase22DryRunResult } from './types';

/**
 * Exercise the frozen manifest shape without an adapter, browser, network,
 * filesystem, auth state or persistence.  The dry run deliberately models
 * the maximum allowed FIRST/replay accounting rather than pretending to have
 * observed a product.
 */
export function simulatePhase22DevAcceptance(manifest: Phase22DevAcceptanceManifest): Phase22DryRunResult {
  validatePhase22Manifest(manifest);
  const targetCount = manifest.targets.length;
  const budget = {
    targetCount,
    firstObservationCount: targetCount,
    replayObservationCount: targetCount,
    observationContextCount: targetCount * 2,
    dynamicTargetDiscovery: false as const,
    retryCount: 0 as const,
  };
  validatePhase22ObservationBudget(budget);
  const privacyReceipt = createPhase22PrivacyReceipt({ approvedCategoryCount: targetCount, rejectedEventCount: 0 });
  const core = {
    schemaVersion: PHASE22_DRY_RUN_VERSION,
    manifestDigest: manifest.deterministicDigest,
    targetCount,
    firstObservationCount: targetCount,
    replayObservationCount: targetCount,
    observationContextCount: targetCount * 2,
    externalContact: false as const,
    mutationCount: 0 as const,
    privacyReceipt,
    preflightPassed: true as const,
  };
  return { ...core, deterministicDigest: phase22Digest(core, 'dry-run:sha256:') };
}
