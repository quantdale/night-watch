// ---------------------------------------------------------------------------
// Nightwatch Phase 5 — legacy OOPS sandbox observation.
//
// This synchronous record intentionally reports only the cheap Bubblewrap
// observation. Executable L6 readiness is qualified by the versioned,
// adversarial async probe in `l6.ts`; callers requiring authenticated OOPS
// must consume that stronger capability before creating a target workspace.
// ---------------------------------------------------------------------------

import { spawnSync } from 'node:child_process';

// The legacy Phase 5 observation remains available for compatibility. The
// current authenticated-OOPS authority is the executable L6 qualification in
// `l6.ts`, which is intentionally a separate, stronger capability record.
export { L6_PROCESS_NETWORK_CONTAINMENT_VERSION, qualifyL6BrowserTraffic, qualifyL6RuntimeCapability, runL6ContainedOops } from './l6';
export type { L6RuntimeCapability as ProvenL6RuntimeCapability } from './l6';

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
  readonly syntheticRelayFlow: 'PROVEN' | 'NOT_QUALIFIED';
  readonly startup: 'PROVEN' | 'NOT_PROVEN';
  readonly liveness: 'PROVEN' | 'NOT_PROVEN';
  readonly cleanup: 'PROVEN' | 'NOT_PROVEN';
  readonly completeProcessIsolation: boolean;
  readonly completeNetworkIsolation: boolean;
  readonly blockerCode: 'L6_RUNTIME_QUALIFICATION_REQUIRED' | null;
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
  syntheticRelayFlow: 'NOT_QUALIFIED',
  startup: 'NOT_PROVEN',
  liveness: 'NOT_PROVEN',
  cleanup: 'NOT_PROVEN',
  completeProcessIsolation: false,
  completeNetworkIsolation: false,
  blockerCode: 'L6_RUNTIME_QUALIFICATION_REQUIRED',
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
  l6RuntimeIdentity: 'nightwatch.process-network-containment.v1';
  l6Qualification: 'ON_DEMAND_EXECUTABLE_PROBE';
  authenticatedOopsExecution: 'REQUIRES_L6_RUNTIME_QUALIFICATION' | 'ENABLED_L6';
  localRestrictedExecution: 'ALLOWED_LOOPBACK_RELAY';
  l6: L6RuntimeCapability;
}

function statusBase(): Pick<OopsSandboxStatus, 'schemaVersion' | 'containmentLevel' | 'relayCompatible' | 'l6RuntimeIdentity' | 'l6Qualification' | 'authenticatedOopsExecution' | 'localRestrictedExecution' | 'l6'> {
  return {
    schemaVersion: OOPS_SANDBOX_STATUS_VERSION,
    containmentLevel: 'L0_L5',
    relayCompatible: false,
    l6RuntimeIdentity: 'nightwatch.process-network-containment.v1',
    l6Qualification: 'ON_DEMAND_EXECUTABLE_PROBE',
    authenticatedOopsExecution: 'REQUIRES_L6_RUNTIME_QUALIFICATION',
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
    throw new Error('AUTHENTICATED_OOPS_REQUIRES_L6_RUNTIME_QUALIFICATION');
  }
  assertL6RuntimeCapability(status.l6);
}
