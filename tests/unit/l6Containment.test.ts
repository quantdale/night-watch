import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { assertL6RuntimeCapability, makeReadyL6Capability, qualifyL6BrowserTraffic, qualifyL6RuntimeCapability, runL6ContainedProcess } from '../../src/core/oops/l6';

test.describe.configure({ mode: 'serial' });

test('rootless L6 qualification proves direct process/network denial and relay transport', async () => {
  const capability = await qualifyL6RuntimeCapability();
  expect(capability.schemaVersion).toBe('nightwatch.process-network-containment.v1');
  expect(capability.runtimeIdentity).toBe('nightwatch.process-network-containment.v1');
  expect(capability.directDnsDenial).toBe('PROVEN');
  expect(capability.directTcpDenial).toBe('PROVEN');
  expect(capability.directUdpDenial).toBe('PROVEN');
  expect(capability.directHttpDenial).toBe('PROVEN');
  expect(capability.directHttpsDenial).toBe('PROVEN');
  expect(capability.syntheticRelayFlow).toBe('PROVEN');
  expect(capability.processIsolation).toBe('PROVEN');
  expect(capability.cleanup).toBe('PROVEN');
  expect(capability.browserSpeculativeDns).toBe('PROVEN');
  expect(capability.browserTraffic).toBe('PROVEN');
  expect(capability.websocketRelayFlow).toBe('PROVEN');
  expect(capability.state).toBe('READY');
  expect(capability.runtimeBinding).toBe('PROVEN');
  expect(() => assertL6RuntimeCapability({ ...capability, state: 'SUPPORTED' })).toThrow('L6_RUNTIME_CAPABILITY_REQUIRED');
});

test('browser qualification stays inside the rootless namespace and reaches only the synthetic relay', async () => {
  expect(await qualifyL6BrowserTraffic()).toBe(true);
});

test('bwrap parent-death coupling removes a sleeping namespace child', async () => {
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

test('target crash and timeout both terminate the complete contained lifecycle', async () => {
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
