import { phase22Digest, phase22ReceiptId } from './digest';
import { PHASE22_PREFLIGHT_VERSION, PHASE22_REQUIRED_PREFLIGHT_CHECKS, type Phase22PreflightCheck, type Phase22PreflightReceipt } from './types';

const MANIFEST_DIGEST_RE = /^manifest:sha256:[0-9a-f]{24}$/;
const RECEIPT_DIGEST_RE = /^receipt:sha256:[0-9a-f]{24}$/;

export interface Phase22PreflightFacts {
  readonly environmentDev: boolean;
  readonly productionRejected: boolean;
  readonly nextRejected: boolean;
  readonly l0CdpGuardActive: boolean;
  readonly l1RouteGuardActive: boolean;
  readonly l2WebsocketGuardActive: boolean;
  readonly l3WorkerContainmentActive: boolean;
  readonly l4UnroutedDetectionActive: boolean;
  readonly l5LoopbackProxyActive: boolean;
  readonly quicDisabled: boolean;
  readonly nonProxiedWebrtcDisabled: boolean;
  readonly traceDisabled: boolean;
  readonly screenshotsDisabled: boolean;
  readonly rawResponsePersistenceDisabled: boolean;
  readonly rawDomPersistenceDisabled: boolean;
  readonly mutationRegistryActive: boolean;
  readonly storageStateExternal: boolean;
  readonly storageStateRegularFile: boolean;
  readonly storageStateNoSymlink: boolean;
  readonly storageStateRestrictivePermissions: boolean;
  readonly authStructurallyValid: boolean;
  readonly authUnexpired: boolean;
  readonly authPageReadable: boolean;
  readonly sourceCurrent: boolean;
  readonly expectationResolved: boolean;
  readonly journeyApiAdapterCurrent: boolean;
  readonly ownerPolicyAllows: boolean;
  readonly noDatabaseOrInfraPath: boolean;
  readonly cleanNightwatchGitState: boolean;
  readonly manifestFrozen: boolean;
  readonly dryRunPassed: boolean;
  readonly targetCount: number;
  readonly plannedObservationContexts: number;
  readonly manifestDigest: string;
}

const FACT_TO_CHECK: Readonly<Record<string, keyof Phase22PreflightFacts>> = {
  environment_dev: 'environmentDev',
  production_rejected: 'productionRejected',
  next_rejected: 'nextRejected',
  l0_cdp_guard_active: 'l0CdpGuardActive',
  l1_route_guard_active: 'l1RouteGuardActive',
  l2_websocket_guard_active: 'l2WebsocketGuardActive',
  l3_worker_containment_active: 'l3WorkerContainmentActive',
  l4_unrouted_detection_active: 'l4UnroutedDetectionActive',
  l5_loopback_proxy_active: 'l5LoopbackProxyActive',
  quic_disabled: 'quicDisabled',
  non_proxied_webrtc_disabled: 'nonProxiedWebrtcDisabled',
  trace_disabled: 'traceDisabled',
  screenshots_disabled: 'screenshotsDisabled',
  raw_response_persistence_disabled: 'rawResponsePersistenceDisabled',
  raw_dom_persistence_disabled: 'rawDomPersistenceDisabled',
  mutation_registry_active: 'mutationRegistryActive',
  storage_state_external: 'storageStateExternal',
  storage_state_regular_file: 'storageStateRegularFile',
  storage_state_no_symlink: 'storageStateNoSymlink',
  storage_state_restrictive_permissions: 'storageStateRestrictivePermissions',
  auth_structurally_valid: 'authStructurallyValid',
  auth_unexpired: 'authUnexpired',
  auth_page_readable: 'authPageReadable',
  source_current: 'sourceCurrent',
  expectation_resolved: 'expectationResolved',
  journey_api_adapter_current: 'journeyApiAdapterCurrent',
  owner_policy_allows: 'ownerPolicyAllows',
  no_database_or_infra_path: 'noDatabaseOrInfraPath',
  clean_nightwatch_git_state: 'cleanNightwatchGitState',
  manifest_frozen: 'manifestFrozen',
  dry_run_passed: 'dryRunPassed',
};

function validateFacts(facts: Phase22PreflightFacts): void {
  if (!Number.isInteger(facts.targetCount) || facts.targetCount < 0 || facts.targetCount > 6) throw new Error('PHASE22_PREFLIGHT_INVALID:target-count');
  if (!Number.isInteger(facts.plannedObservationContexts) || facts.plannedObservationContexts < 0 || facts.plannedObservationContexts > 12) throw new Error('PHASE22_PREFLIGHT_INVALID:context-count');
  if (!MANIFEST_DIGEST_RE.test(facts.manifestDigest)) throw new Error('PHASE22_PREFLIGHT_INVALID:manifest-digest');
  for (const key of PHASE22_REQUIRED_PREFLIGHT_CHECKS) {
    const field = FACT_TO_CHECK[key];
    if (field === undefined || typeof facts[field] !== 'boolean') throw new Error(`PHASE22_PREFLIGHT_INVALID:${key}`);
  }
}

export function evaluatePhase22Preflight(facts: Phase22PreflightFacts): { readonly passed: boolean; readonly checks: readonly Phase22PreflightCheck[] } {
  validateFacts(facts);
  const checks = PHASE22_REQUIRED_PREFLIGHT_CHECKS.map((id) => ({
    id,
    passed: facts[FACT_TO_CHECK[id]!] as boolean,
    required: true as const,
  }));
  return { passed: checks.every((check) => check.passed), checks };
}

export function createPhase22PreflightReceipt(facts: Phase22PreflightFacts): Phase22PreflightReceipt {
  const evaluation = evaluatePhase22Preflight(facts);
  const core = {
    schemaVersion: PHASE22_PREFLIGHT_VERSION,
    environment: 'DEV' as const,
    passed: evaluation.passed,
    checks: evaluation.checks,
    targetCount: facts.targetCount,
    plannedObservationContexts: facts.plannedObservationContexts,
    manifestDigest: facts.manifestDigest,
  };
  const receiptId = phase22ReceiptId(core);
  const receipt: Phase22PreflightReceipt = {
    ...core,
    receiptId,
    deterministicDigest: phase22Digest({ ...core, receiptId }, 'preflight:sha256:'),
  };
  validatePhase22PreflightReceipt(receipt);
  return receipt;
}

export function validatePhase22PreflightReceipt(receipt: Phase22PreflightReceipt): void {
  if (receipt.schemaVersion !== PHASE22_PREFLIGHT_VERSION || receipt.environment !== 'DEV') throw new Error('PHASE22_PREFLIGHT_INVALID:header');
  if (!RECEIPT_DIGEST_RE.test(receipt.receiptId) || !/^preflight:sha256:[0-9a-f]{24}$/.test(receipt.deterministicDigest)) throw new Error('PHASE22_PREFLIGHT_INVALID:identity');
  if (!MANIFEST_DIGEST_RE.test(receipt.manifestDigest)) throw new Error('PHASE22_PREFLIGHT_INVALID:manifest');
  if (!Number.isInteger(receipt.targetCount) || receipt.targetCount < 0 || receipt.targetCount > 6 || !Number.isInteger(receipt.plannedObservationContexts) || receipt.plannedObservationContexts < 0 || receipt.plannedObservationContexts > 12) throw new Error('PHASE22_PREFLIGHT_INVALID:bounds');
  if (receipt.checks.length !== PHASE22_REQUIRED_PREFLIGHT_CHECKS.length) throw new Error('PHASE22_PREFLIGHT_INVALID:check-count');
  const actualIds = receipt.checks.map((check) => check.id);
  if (JSON.stringify(actualIds) !== JSON.stringify(PHASE22_REQUIRED_PREFLIGHT_CHECKS)) throw new Error('PHASE22_PREFLIGHT_INVALID:check-order');
  if (receipt.checks.some((check) => check.required !== true || typeof check.passed !== 'boolean')) throw new Error('PHASE22_PREFLIGHT_INVALID:checks');
  if (receipt.passed !== receipt.checks.every((check) => check.passed)) throw new Error('PHASE22_PREFLIGHT_INVALID:passed');
  const core = {
    schemaVersion: receipt.schemaVersion,
    environment: receipt.environment,
    passed: receipt.passed,
    checks: receipt.checks,
    targetCount: receipt.targetCount,
    plannedObservationContexts: receipt.plannedObservationContexts,
    manifestDigest: receipt.manifestDigest,
  };
  if (receipt.receiptId !== phase22ReceiptId(core)) throw new Error('PHASE22_PREFLIGHT_INVALID:receipt-id');
  if (receipt.deterministicDigest !== phase22Digest({ ...core, receiptId: receipt.receiptId }, 'preflight:sha256:')) throw new Error('PHASE22_PREFLIGHT_INVALID:digest');
}
