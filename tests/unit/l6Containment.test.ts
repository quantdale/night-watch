import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { assertL6RuntimeCapability, l6ContainmentAvailability, makeReadyL6Capability, qualifyL6BrowserTraffic, qualifyL6RuntimeCapability, runL6ContainedProcess } from '../../src/core/oops/l6';

test.describe.configure({ mode: 'serial' });

// L6 rootless containment is a HOST CAPABILITY, not a repository invariant.
// A host without a usable Bubblewrap binary (the GitHub Ubuntu runner is one)
// genuinely cannot provide the envelope, so asserting READY unconditionally
// asserted a property of the developer's laptop rather than of this code.
//
// Every test below therefore runs in BOTH environments and asserts the
// behaviour that is actually correct for the host it is running on. Where
// containment is available the original deep proofs run unchanged and at full
// strength. Where it is not, the same test proves the FAIL-CLOSED path: the
// runtime must refuse, categorically and by name, instead of degrading into
// something that merely looks usable. Nothing is skipped, and the
// unavailable-host refusals are adversarial coverage that did not exist
// before.
//
// The discriminator is the probed host capability itself, never an
// environment variable, and never a CI special case. `bin/campaign-synthetic.mjs`
// records which lane ran in the authoritative receipt, and the quality gate
// requires the PROVEN lane everywhere except CI, so an absent deep lane can
// never be silently mistaken for a proven one.
const containment = l6ContainmentAvailability();

// Every proof field must move together. A capability that is partly PROVEN is
// the one shape that must never exist, in either environment.
const L6_PROOF_FIELDS = [
  'runtimeBinding', 'processIsolation', 'directDnsDenial', 'directTcpDenial',
  'directUdpDenial', 'directHttpDenial', 'directHttpsDenial',
  'browserSpeculativeDns', 'browserTraffic', 'syntheticRelayFlow',
  'websocketRelayFlow', 'startup', 'liveness', 'cleanup',
] as const;

test('L6 qualification is either fully proven or explicitly blocked, never partly proven', async () => {
  const capability = await qualifyL6RuntimeCapability();
  // Identity is environment-independent: an unavailable host still returns a
  // well-formed capability of the versioned shape, never a bare null.
  expect(capability.schemaVersion).toBe('nightwatch.process-network-containment.v1');
  expect(capability.runtimeIdentity).toBe('nightwatch.process-network-containment.v1');
  expect(capability.state === 'READY').toBe(containment.available);

  if (containment.available) {
    // Full-strength deep proof, unchanged from the original assertions.
    for (const field of L6_PROOF_FIELDS) expect(capability[field]).toBe('PROVEN');
    expect(capability.state).toBe('READY');
    expect(capability.status).toBe('PROVEN');
    expect(capability.readiness).toBe('READY');
    expect(capability.completeProcessIsolation).toBe(true);
    expect(capability.completeNetworkIsolation).toBe(true);
    expect(capability.blockerCode).toBeNull();
    expect(() => assertL6RuntimeCapability(capability)).not.toThrow();
    // A downgraded state must still be refused even though every proof holds.
    expect(() => assertL6RuntimeCapability({ ...capability, state: 'SUPPORTED' })).toThrow('L6_RUNTIME_CAPABILITY_REQUIRED');
    return;
  }

  // Fail-closed contract on a host that cannot contain. This is the branch the
  // GitHub runner takes, and it is the branch that matters for safety: a
  // blocked capability must be uniformly unproven and must be REFUSED.
  expect(capability.state).not.toBe('READY');
  expect(capability.status).toBe('UNPROVEN');
  expect(capability.readiness).toBe('BLOCKED');
  expect(capability.blockerCode).not.toBeNull();
  // Blocker-code agnostic: any well-formed blocked classification is accepted,
  // so a future host that blocks for a different reason stays correct here.
  expect(typeof capability.blockerCode).toBe('string');
  for (const field of L6_PROOF_FIELDS) expect(capability[field]).toBe('NOT_PROVEN');
  expect(capability.completeProcessIsolation).toBe(false);
  expect(capability.completeNetworkIsolation).toBe(false);
  expect(() => assertL6RuntimeCapability(capability)).toThrow('L6_RUNTIME_CAPABILITY_REQUIRED');
  // The synthetic READY constructor stays environment-independent, so the
  // assertion above proves refusal of the real capability, not a broken assert.
  expect(() => assertL6RuntimeCapability(makeReadyL6Capability())).not.toThrow();
});

test('browser qualification stays inside the rootless namespace and reaches only the synthetic relay', async () => {
  if (containment.available) {
    expect(await qualifyL6BrowserTraffic()).toBe(true);
    return;
  }
  // Without an envelope the browser lane must report unqualified rather than
  // letting an uncontained browser count as contained.
  expect(await qualifyL6BrowserTraffic()).toBe(false);
});

test('bwrap parent-death coupling removes a sleeping namespace child', async () => {
  if (!containment.available) {
    // No binary to couple to. Prove the refusal is categorical and that the
    // synthetic READY constructor remains environment-independent.
    await expect(runL6ContainedProcess({
      targetPath: process.execPath,
      targetMountPath: '/workspace/oops.mjs',
      targetArgs: [],
      mode: 'PROBE',
      relay: async () => ({ status: 204 }),
      timeoutMs: 5_000,
    })).rejects.toThrow(/L6_BWRAP_UNAVAILABLE|L6_UNAVAILABLE_PLATFORM/);
    expect(makeReadyL6Capability().blockerCode).toBeNull();
    return;
  }
  const childScript = [
    "import { spawn } from 'node:child_process';",
    "const child = spawn('/usr/bin/bwrap', ['--unshare-user', '--unshare-net', '--unshare-pid', '--as-pid-1', '--die-with-parent', '--new-session', '--clearenv', '--ro-bind', '/usr', '/usr', '--ro-bind', '/bin', '/bin', '--ro-bind', '/lib', '/lib', '--ro-bind', '/lib64', '/lib64', '--dev', '/dev', '--proc', '/proc', '/usr/bin/sleep', '30'], { detached: true, stdio: 'ignore' });",
    "console.log(String(child.pid));",
    "setTimeout(() => process.exit(0), 100);",
  ].join('');
  const parent = spawn(process.execPath, ['--input-type=module', '-e', childScript], { shell: false, stdio: ['ignore', 'pipe', 'ignore'] });
  let output = '';
  parent.stdout?.on('data', (chunk) => { output += chunk; });
  const parentExit = await new Promise<number | null>((resolve) => parent.once('close', resolve));
  expect(parentExit).toBe(0);
  const pid = Number(output.trim());
  expect(Number.isInteger(pid)).toBe(true);
  let gone = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      process.kill(pid, 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') gone = true;
      break;
    }
  }
  expect(gone).toBe(true);
  expect(makeReadyL6Capability().blockerCode).toBeNull();
});

function temporaryL6Target(source: string): { readonly path: string; readonly cleanup: () => void } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-l6-target-'));
  const target = path.join(directory, 'target.mjs');
  fs.writeFileSync(target, source, { encoding: 'utf8', mode: 0o700 });
  fs.chmodSync(target, 0o700);
  return { path: target, cleanup: () => fs.rmSync(directory, { recursive: true, force: true }) };
}

test('relay loss fails closed and removes the contained runtime', async () => {
  if (!containment.available) {
    await expect(runL6ContainedProcess({
      targetPath: process.execPath,
      targetMountPath: '/workspace/oops.mjs',
      targetArgs: [],
      mode: 'PROBE',
      relay: async () => { throw new Error('L6_SYNTHETIC_RELAY_DEAD'); },
      timeoutMs: 5_000,
    })).rejects.toThrow(/L6_BWRAP_UNAVAILABLE|L6_UNAVAILABLE_PLATFORM/);
    return;
  }
  const target = temporaryL6Target(`#!/usr/bin/env node
import http from 'node:http';
const request = http.get({ host: '127.0.0.1', port: Number(process.env.NIGHTWATCH_L6_PROXY_PORT), path: '/l6-probe', headers: { Accept: 'application/json', 'X-Nightwatch-L6-Probe': '1' } }, response => response.resume());
request.once('error', () => process.exit(2));
`);
  let runtimeDirectory: string | undefined;
  try {
    await expect(runL6ContainedProcess({
      targetPath: target.path,
      targetMountPath: '/workspace/oops.mjs',
      targetArgs: [],
      mode: 'PROBE',
      relay: async () => { throw new Error('L6_SYNTHETIC_RELAY_DEAD'); },
      onReady: (_port, directory) => { runtimeDirectory = directory; },
      timeoutMs: 5_000,
    })).rejects.toThrow('L6_SYNTHETIC_RELAY_DEAD');
    expect(runtimeDirectory).toBeDefined();
    expect(fs.existsSync(runtimeDirectory as string)).toBe(false);
  } finally {
    target.cleanup();
  }
});

test('contained relay calls are bounded and the request limit fails closed', async () => {
  if (!containment.available) {
    let relayCalls = 0;
    await expect(runL6ContainedProcess({
      targetPath: process.execPath,
      targetMountPath: '/workspace/oops.mjs',
      targetArgs: [],
      mode: 'PROBE',
      relay: async () => { relayCalls += 1; return { status: 204 }; },
      timeoutMs: 5_000,
    })).rejects.toThrow(/L6_BWRAP_UNAVAILABLE|L6_UNAVAILABLE_PLATFORM/);
    // Refusal happens BEFORE any relay is offered to the target.
    expect(relayCalls).toBe(0);
    return;
  }
  const target = temporaryL6Target(`#!/usr/bin/env node
import http from 'node:http';
const port = Number(process.env.NIGHTWATCH_L6_PROXY_PORT);
let completed = 0;
function next() {
  const request = http.get({ host: '127.0.0.1', port, path: '/l6-probe', headers: { Accept: 'application/json', 'X-Nightwatch-L6-Probe': '1' } }, response => {
    response.resume();
    response.once('end', () => { completed += 1; if (completed < 10) next(); else process.exit(0); });
  });
  request.once('error', () => process.exit(0));
}
next();
`);
  let relayCalls = 0;
  try {
    await expect(runL6ContainedProcess({
      targetPath: target.path,
      targetMountPath: '/workspace/oops.mjs',
      targetArgs: [],
      mode: 'PROBE',
      relay: async () => { relayCalls += 1; return { status: 204 }; },
      timeoutMs: 5_000,
    })).rejects.toThrow('L6_RELAY_REQUEST_LIMIT');
    expect(relayCalls).toBe(8);
  } finally {
    target.cleanup();
  }
});

test('target crash and timeout both terminate the complete contained lifecycle', async () => {
  if (!containment.available) {
    // Both lifecycle entrypoints refuse identically; neither degrades into an
    // uncontained execution of the target.
    for (const timeoutMs of [5_000, 500]) {
      await expect(runL6ContainedProcess({
        targetPath: process.execPath,
        targetMountPath: '/workspace/oops.mjs',
        targetArgs: [],
        mode: 'PROBE',
        relay: async () => ({ status: 204 }),
        timeoutMs,
      })).rejects.toThrow(/L6_BWRAP_UNAVAILABLE|L6_UNAVAILABLE_PLATFORM/);
    }
    return;
  }
  const crash = temporaryL6Target('#!/usr/bin/env node\nprocess.exit(17);\n');
  const hanging = temporaryL6Target('#!/usr/bin/env node\nsetInterval(() => undefined, 1000);\n');
  try {
    const crashed = await runL6ContainedProcess({
      targetPath: crash.path,
      targetMountPath: '/workspace/oops.mjs',
      targetArgs: [],
      mode: 'PROBE',
      relay: async () => ({ status: 204 }),
      timeoutMs: 5_000,
    });
    expect(crashed.exitCode).toBe(17);
    expect(crashed.cleanup).toBe(true);
    await expect(runL6ContainedProcess({
      targetPath: hanging.path,
      targetMountPath: '/workspace/oops.mjs',
      targetArgs: [],
      mode: 'PROBE',
      relay: async () => ({ status: 204 }),
      timeoutMs: 500,
    })).rejects.toThrow('L6_TIMEOUT');
  } finally {
    crash.cleanup();
    hanging.cleanup();
  }
});
