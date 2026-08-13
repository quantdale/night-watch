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

const OOPS_PROBE_ENV: NodeJS.ProcessEnv = {
  PATH: '/usr/local/bin:/usr/bin:/bin',
  HOME: '/nonexistent',
  LANG: 'C',
  LC_ALL: 'C',
};

export interface OopsSandboxStatus {
  tool: 'bubblewrap' | null;
  toolVersion: string | null;
  networkNamespaceProbe: 'PASS' | 'UNAVAILABLE';
  relayCompatible: false;
  authenticatedOopsExecution: 'DISABLED_RELAY_NAMESPACE_INCOMPATIBLE';
  localRestrictedExecution: 'ALLOWED_LOOPBACK_RELAY';
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
      tool: null,
      toolVersion: null,
      networkNamespaceProbe: 'UNAVAILABLE',
      relayCompatible: false,
      authenticatedOopsExecution: 'DISABLED_RELAY_NAMESPACE_INCOMPATIBLE',
      localRestrictedExecution: 'ALLOWED_LOOPBACK_RELAY',
    };
  }
  const probe = spawnSync(
    'bwrap',
    ['--unshare-net', '--ro-bind', '/', '/', '--dev', '/dev', '--proc', '/proc', '/usr/bin/true'],
    { encoding: 'utf8', env: OOPS_PROBE_ENV, timeout: 5_000, maxBuffer: 64 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return {
    tool: 'bubblewrap',
    toolVersion: version,
    networkNamespaceProbe: probe.status === 0 ? 'PASS' : 'UNAVAILABLE',
    relayCompatible: false,
    authenticatedOopsExecution: 'DISABLED_RELAY_NAMESPACE_INCOMPATIBLE',
    localRestrictedExecution: 'ALLOWED_LOOPBACK_RELAY',
  };
}
