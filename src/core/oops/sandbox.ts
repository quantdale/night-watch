// ---------------------------------------------------------------------------
// Nightwatch Phase 5 — local OOPS sandbox capability probe.
//
// Bubblewrap can create an isolated network namespace on this host, but that
// namespace cannot reach a relay bound in Nightwatch's parent namespace. The
// restricted Phase 5 OOPS path therefore uses the stronger applicable
// control: a fixed loopback relay URL, a catalog-resolved destination, and a
// credential-free OOPS process. The namespace probe is retained as evidence
// rather than pretending it can protect the authenticated relay path.
// ---------------------------------------------------------------------------

import { spawnSync } from 'node:child_process';

export const OOPS_SANDBOX_STATUS_VERSION = 'nightwatch.oops-sandbox-status.v2' as const;
export const L6_RUNTIME_CAPABILITY_VERSION = 'nightwatch.l6-runtime-capability.v1' as const;

export type L6CapabilityStatus = 'PROVEN' | 'UNPROVEN';
export type L6CapabilityReadiness = 'READY' | 'BLOCKED';

/**
 * Machine-readable process-boundary truth. The current implementation is
 * deliberately an explicit blocked record: namespace creation alone does
 * not prove direct-egress denial, relay reachability, or lifecycle cleanup.
 */
export interface L6RuntimeCapability {
  readonly schemaVersion: typeof L6_RUNTIME_CAPABILITY_VERSION;
  readonly runtimeIdentity: 'L6_UNAVAILABLE_RELAY_NAMESPACE_INCOMPATIBLE' | 'L6_PROVEN';
  readonly status: L6CapabilityStatus;
  readonly readiness: L6CapabilityReadiness;
  readonly processIsolation: 'PROVEN' | 'NOT_PROVEN';
  readonly directDnsDenial: 'PROVEN' | 'NOT_PROVEN';
  readonly directTcpDenial: 'PROVEN' | 'NOT_PROVEN';
  readonly directUdpDenial: 'PROVEN' | 'NOT_PROVEN';
  readonly syntheticRelayFlow: 'PROVEN' | 'BLOCKED_PARENT_NAMESPACE';
  readonly startup: 'PROVEN' | 'NOT_PROVEN';
  readonly liveness: 'PROVEN' | 'NOT_PROVEN';
  readonly cleanup: 'PROVEN' | 'NOT_PROVEN';
  readonly completeProcessIsolation: boolean;
  readonly completeNetworkIsolation: boolean;
  readonly blockerCode: 'BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL' | null;
}

const UNSUPPORTED_L6_RUNTIME_CAPABILITY: L6RuntimeCapability = Object.freeze({
  schemaVersion: L6_RUNTIME_CAPABILITY_VERSION,
  runtimeIdentity: 'L6_UNAVAILABLE_RELAY_NAMESPACE_INCOMPATIBLE',
  status: 'UNPROVEN',
  readiness: 'BLOCKED',
  processIsolation: 'NOT_PROVEN',
  directDnsDenial: 'NOT_PROVEN',
  directTcpDenial: 'NOT_PROVEN',
  directUdpDenial: 'NOT_PROVEN',
  syntheticRelayFlow: 'BLOCKED_PARENT_NAMESPACE',
  startup: 'NOT_PROVEN',
  liveness: 'NOT_PROVEN',
  cleanup: 'NOT_PROVEN',
  completeProcessIsolation: false,
  completeNetworkIsolation: false,
  blockerCode: 'BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL',
});

const OOPS_PROBE_ENV: NodeJS.ProcessEnv = {
  PATH: '/usr/local/bin:/usr/bin:/bin',
  HOME: '/nonexistent',
  LANG: 'C',
  LC_ALL: 'C',
};

export interface OopsSandboxStatus {
  schemaVersion: typeof OOPS_SANDBOX_STATUS_VERSION;
  containmentLevel: 'L0_L5';
  tool: 'bubblewrap' | null;
  toolVersion: string | null;
  networkNamespaceProbe: 'PASS' | 'UNAVAILABLE';
  relayCompatible: false;
  authenticatedOopsExecution: 'DISABLED_RELAY_NAMESPACE_INCOMPATIBLE' | 'ENABLED_L6';
  localRestrictedExecution: 'ALLOWED_LOOPBACK_RELAY';
  l6: L6RuntimeCapability;
}

function statusBase(): Pick<OopsSandboxStatus, 'schemaVersion' | 'containmentLevel' | 'relayCompatible' | 'authenticatedOopsExecution' | 'localRestrictedExecution' | 'l6'> {
  return {
    schemaVersion: OOPS_SANDBOX_STATUS_VERSION,
    containmentLevel: 'L0_L5',
    relayCompatible: false,
    authenticatedOopsExecution: 'DISABLED_RELAY_NAMESPACE_INCOMPATIBLE',
    localRestrictedExecution: 'ALLOWED_LOOPBACK_RELAY',
    l6: UNSUPPORTED_L6_RUNTIME_CAPABILITY,
  };
}

function bubblewrapVersion(): string | null {
  const result = spawnSync('bwrap', ['--version'], { encoding: 'utf8', env: OOPS_PROBE_ENV, timeout: 2_000, maxBuffer: 64 * 1024 });
  if (result.status !== 0) return null;
  const value = (result.stdout ?? '').trim();
  return value === '' ? null : value.slice(0, 80);
}

/**
 * Prove only the local capability needed for the decision. The probe mounts
 * the host read-only, creates no writable path, and runs /usr/bin/true inside
 * an isolated network namespace. It performs no DNS or external I/O.
 */
export function inspectOopsSandbox(): OopsSandboxStatus {
  const version = bubblewrapVersion();
  if (version === null) {
    return {
      ...statusBase(),
      tool: null,
      toolVersion: null,
      networkNamespaceProbe: 'UNAVAILABLE',
    };
  }
  const probe = spawnSync(
    'bwrap',
    ['--unshare-net', '--ro-bind', '/', '/', '--dev', '/dev', '--proc', '/proc', '/usr/bin/true'],
    { encoding: 'utf8', env: OOPS_PROBE_ENV, timeout: 5_000, maxBuffer: 64 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return {
    ...statusBase(),
    tool: 'bubblewrap',
    toolVersion: version,
    networkNamespaceProbe: probe.status === 0 ? 'PASS' : 'UNAVAILABLE',
  };
}

/**
 * Authenticated/non-browser OOPS execution requires a proven L6 capability.
 * The current record is intentionally never promotable: callers fail before
 * creating a scenario workspace or spawning the child process.
 */
export function assertL6RuntimeCapability(capability: L6RuntimeCapability): void {
  if (
    capability.schemaVersion !== L6_RUNTIME_CAPABILITY_VERSION ||
    capability.runtimeIdentity !== 'L6_PROVEN' ||
    capability.status !== 'PROVEN' ||
    capability.readiness !== 'READY' ||
    capability.processIsolation !== 'PROVEN' ||
    capability.directDnsDenial !== 'PROVEN' ||
    capability.directTcpDenial !== 'PROVEN' ||
    capability.directUdpDenial !== 'PROVEN' ||
    capability.syntheticRelayFlow !== 'PROVEN' ||
    capability.startup !== 'PROVEN' ||
    capability.liveness !== 'PROVEN' ||
    capability.cleanup !== 'PROVEN' ||
    capability.completeProcessIsolation !== true ||
    capability.completeNetworkIsolation !== true ||
    capability.blockerCode !== null
  ) {
    throw new Error('L6_RUNTIME_CAPABILITY_REQUIRED:BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL');
  }
}

export function assertAuthenticatedOopsCapability(status: OopsSandboxStatus): void {
  if (status.authenticatedOopsExecution !== 'ENABLED_L6') {
    throw new Error('AUTHENTICATED_OOPS_DISABLED_RELAY_NAMESPACE_INCOMPATIBLE');
  }
  assertL6RuntimeCapability(status.l6);
}
