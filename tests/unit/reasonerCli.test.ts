// ---------------------------------------------------------------------------
// Lane B: CliReasonerDriver gateway tests.
//
// Every case drives the real driver against a deterministic fake CLI (a small
// Node script file executed directly with shell:false). No subscription, no
// network, no vendor binaries.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  classifyCliOutcome,
  createCliReasonerDriver,
  describeReasonerResult,
  isRetryableReasonerFailure,
  resolveCliReasoner,
  type CliReasonerConfig,
} from '../../src/core/reasoner/cliReasoner';
import {
  REASONER_FAILURE_CLASSES,
  REASONER_STDERR_BYTE_CAP,
  REASONER_STDOUT_BYTE_CAP,
  REASONER_TURN_REQUEST_VERSION,
  REASONER_TURN_RESPONSE_VERSION,
  type ReasonerCallOptions,
  type ReasonerFailureClass,
  type ReasonerTurnRequest,
} from '../../src/core/agentProtocol/reasoner';
import {
  AGENT_BUDGET_VERSION,
  ZERO_AGENT_BUDGET_USAGE,
  defaultAgentBudgetPolicy,
} from '../../src/core/agentProtocol/runtime';

const NODE = process.execPath;
const RESPONSE_VERSION = REASONER_TURN_RESPONSE_VERSION;
const PAUSE_RESPONSE = JSON.stringify({
  schemaVersion: RESPONSE_VERSION,
  intents: [{ kind: 'PAUSE' }],
  hypotheses: [],
});

let scratchDirs: string[] = [];

test.afterEach(() => {
  for (const dir of scratchDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  scratchDirs = [];
});

function scratchDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-reasoner-'));
  scratchDirs.push(dir);
  return dir;
}

function writeFake(dir: string, name: string, source: string): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, source, 'utf8');
  return file;
}

function makeRequest(): ReasonerTurnRequest {
  return {
    schemaVersion: REASONER_TURN_REQUEST_VERSION,
    campaignId: 'camp-lane-b-test',
    turnId: 'turn-0001',
    observation: {
      phase: 'PLAN',
      untrusted: [],
      evidenceRefs: [],
      allowedToolIds: [],
      allowedIntentKinds: [],
    },
    budgetRemaining: {
      policy: defaultAgentBudgetPolicy('HOUR_1'),
      usage: ZERO_AGENT_BUDGET_USAGE,
    },
  };
}

function driverFor(
  script: string,
  extraArgs: readonly string[] = [],
  overrides: Partial<CliReasonerConfig> = {},
): ReturnType<typeof createCliReasonerDriver> {
  return createCliReasonerDriver({
    executable: NODE,
    args: [script, ...extraArgs],
    provider: 'test-provider',
    model: 'fake-1',
    killGraceMs: 100,
    stdioGraceMs: 300,
    validationContext: { authorizedEnvironments: [] },
    ...overrides,
  });
}

function callOptions(overrides: Partial<ReasonerCallOptions> = {}): ReasonerCallOptions {
  return {
    timeoutMs: 5_000,
    stdoutByteCap: REASONER_STDOUT_BYTE_CAP,
    stderrByteCap: REASONER_STDERR_BYTE_CAP,
    signal: new AbortController().signal,
    ...overrides,
  };
}

function readHeartbeat(file: string): number | null {
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    const value = Number(raw);
    return Number.isInteger(value) ? value : null;
  } catch {
    return null;
  }
}

/** Heartbeats stop only when the whole tree is dead; zombies never write. */
async function waitForHeartbeatStable(file: string, timeoutMs = 5_000): Promise<number> {
  const start = Date.now();
  let previous: number | null = null;
  for (;;) {
    const current = readHeartbeat(file);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const next = readHeartbeat(file);
    if (current !== null && next !== null && current === next && current > 0) return next;
    if (Date.now() - start > timeoutMs) {
      throw new Error(`heartbeat never stabilized (previous=${previous} current=${current} next=${next})`);
    }
    previous = next;
  }
}

test('happy JSON turn: request framed over stdin, typed response validated', async () => {
  const dir = scratchDir();
  const script = writeFake(
    dir,
    'happy.mjs',
    `
const chunks = [];
process.stdin.on('data', (d) => chunks.push(d)).on('end', () => {
  let request;
  try {
    request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    process.exit(2);
    return;
  }
  if (request.schemaVersion !== '${REASONER_TURN_REQUEST_VERSION}' || request.campaignId !== 'camp-lane-b-test') {
    process.exit(3);
    return;
  }
  process.stdout.write('${PAUSE_RESPONSE.replace(/'/g, "\\'")}');
});
`,
  );
  const driver = driverFor(script);
  expect(driver.protocolVersion).toBe('nightwatch.reasoner-driver.v1');
  expect(driver.transport).toBe('CLI');
  expect(driver.provenance).toEqual({
    transport: 'CLI',
    executableBasename: path.basename(NODE),
    provider: 'test-provider',
    model: 'fake-1',
  });
  const result = await driver.complete(makeRequest(), callOptions());
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.response.schemaVersion).toBe(RESPONSE_VERSION);
  expect(result.response.intents).toEqual([{ kind: 'PAUSE' }]);
  expect(result.response.hypotheses).toEqual([]);
  expect(result.provenance.provider).toBe('test-provider');
  expect(result.stdoutBytes).toBeGreaterThan(0);
});

test('JSONL framing: response document tolerates trailing noise lines', async () => {
  const dir = scratchDir();
  const script = writeFake(
    dir,
    'jsonl.mjs',
    `process.stdin.resume();process.stdin.on('end',()=>{process.stdout.write('${PAUSE_RESPONSE}\\nteardown complete\\n')});`,
  );
  const result = await driverFor(script).complete(makeRequest(), callOptions());
  expect(result.ok).toBe(true);
});

test('malformed: JSON that fails protocol validation', async () => {
  const dir = scratchDir();
  const script = writeFake(
    dir,
    'malformed.mjs',
    `process.stdin.resume();process.stdin.on('end',()=>{process.stdout.write(JSON.stringify({schemaVersion:'${RESPONSE_VERSION}',intents:[]}));});`,
  );
  const result = await driverFor(script).complete(makeRequest(), callOptions());
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('MALFORMED_OUTPUT');
  expect(result.provenance?.transport).toBe('CLI');
});

test('malformed: not JSON at all but brace-leading is still malformed, not garbage', async () => {
  const dir = scratchDir();
  const script = writeFake(dir, 'truncated.mjs', `process.stdout.write('{"schemaVersion":');`);
  const result = await driverFor(script).complete(makeRequest(), callOptions());
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('MALFORMED_OUTPUT');
});
test('garbage: non-JSON stdout', async () => {
  const dir = scratchDir();
  const script = writeFake(
    dir,
    'garbage.mjs',
    `process.stdout.write('this CLI prints logs, not JSON\\nmore logs\\n');`,
  );
  const result = await driverFor(script).complete(makeRequest(), callOptions());
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('GARBAGE_OUTPUT');
});

test('partial: empty stdout on clean exit', async () => {
  const dir = scratchDir();
  const script = writeFake(dir, 'partial.mjs', ``);
  const result = await driverFor(script).complete(makeRequest(), callOptions());
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('PARTIAL_OUTPUT');
});

test('oversize: stdout beyond the byte cap kills the child', async () => {
  const dir = scratchDir();
  const script = writeFake(dir, 'oversize.mjs', `process.stdout.write('x'.repeat(65536));`);
  const result = await driverFor(script).complete(
    makeRequest(),
    callOptions({ stdoutByteCap: 1024 }),
  );
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('OVERSIZE_OUTPUT');
  expect(result.stdoutBytes).toBeGreaterThan(1024);
});

test('timeout: silent child is reaped and classified', async () => {
  const dir = scratchDir();
  const script = writeFake(dir, 'sleep.mjs', `setTimeout(()=>{},30000);`);
  const result = await driverFor(script).complete(makeRequest(), callOptions({ timeoutMs: 300 }));
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('TIMEOUT');
});

test('crash: signal death is CLI_CRASH', async () => {
  const dir = scratchDir();
  const script = writeFake(dir, 'crash.mjs', `process.abort();`);
  const result = await driverFor(script).complete(makeRequest(), callOptions());
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('CLI_CRASH');
});

test('nonzero exit with output is NONZERO_EXIT', async () => {
  const dir = scratchDir();
  const script = writeFake(
    dir,
    'nonzero.mjs',
    `process.stderr.write('fake provider failed\\n');process.exit(3);`,
  );
  const result = await driverFor(script).complete(makeRequest(), callOptions());
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('NONZERO_EXIT');
  expect(result.stderrBytes).toBeGreaterThan(0);
});

test('hung child: SIGTERM trap forces SIGKILL escalation', async () => {
  const dir = scratchDir();
  const script = writeFake(
    dir,
    'hung.mjs',
    `process.on('SIGTERM',()=>{});setTimeout(()=>{},30000);`,
  );
  const result = await driverFor(script).complete(makeRequest(), callOptions({ timeoutMs: 300 }));
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('HUNG_CHILD');
});

test('hung grandchild: exited child with inherited pipes held open', async () => {
  const dir = scratchDir();
  const heartbeat = path.join(dir, 'grandchild.hb');
  const grandchild = writeFake(
    dir,
    'grandchild.cjs',
    `
const fs = require('node:fs');
const hb = process.argv[2];
fs.writeFileSync(hb, '0');
let n = 0;
const timer = setInterval(() => { n += 1; try { fs.writeFileSync(hb, String(n)); } catch {} }, 100);
setTimeout(() => { clearInterval(timer); }, 15000);
`,
  );
  const parent = writeFake(
    dir,
    'parent.cjs',
    `
const { spawn } = require('node:child_process');
const child = spawn(process.execPath, ['${grandchild.replace(/\\/g, '\\\\')}', '${heartbeat.replace(/\\/g, '\\\\')}'], { stdio: 'inherit' });
child.on('spawn', () => { child.unref(); process.exit(0); });
child.on('error', () => process.exit(9));
`,
  );
  const result = await driverFor(parent).complete(makeRequest(), callOptions({ timeoutMs: 5_000 }));
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('HUNG_GRANDCHILD');
  await waitForHeartbeatStable(heartbeat);
});

test('secret echo: Bearer token on stderr fails the turn', async () => {
  const dir = scratchDir();
  const script = writeFake(
    dir,
    'secret.mjs',
    `process.stdout.write('${PAUSE_RESPONSE}');process.stderr.write('upstream says: Bearer ' + 'z'.repeat(24) + '\\n');`,
  );
  const result = await driverFor(script).complete(makeRequest(), callOptions());
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('SECRET_ECHO');
});

test('cancellation: mid-flight abort reaps the child', async () => {
  const dir = scratchDir();
  const script = writeFake(dir, 'sleep.mjs', `setTimeout(()=>{},30000);`);
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 100);
  const result = await driverFor(script).complete(
    makeRequest(),
    callOptions({ timeoutMs: 10_000, signal: controller.signal }),
  );
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('CANCELLED');
});

test('cancellation: pre-aborted signal never spawns', async () => {
  const dir = scratchDir();
  const marker = path.join(dir, 'spawned.marker');
  const script = writeFake(
    dir,
    'marker.cjs',
    `require('node:fs').writeFileSync('${marker.replace(/\\/g, '\\\\')}', 'spawned');`,
  );
  const controller = new AbortController();
  controller.abort();
  const result = await driverFor(script).complete(
    makeRequest(),
    callOptions({ signal: controller.signal }),
  );
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('CANCELLED');
  expect(fs.existsSync(marker)).toBe(false);
});

test('no shell: metacharacters in argv pass through literally and never execute', async () => {
  const dir = scratchDir();
  const echoed = path.join(dir, 'argv.json');
  const marker = path.join(dir, 'pwned.marker');
  const script = writeFake(
    dir,
    'echo-argv.cjs',
    `
const fs = require('node:fs');
fs.writeFileSync(process.argv[2], JSON.stringify(process.argv.slice(2)));
`,
  );
  const dangerous = [`$(touch "${marker}")`, '; rm -f marker', '| cat /etc/passwd'];
  const result = await driverFor(script, [echoed, ...dangerous]).complete(
    makeRequest(),
    callOptions(),
  );
  expect(result.ok).toBe(false);
  if (result.ok) return;
  // Empty stdout (the fake writes to a file): the turn fails closed...
  expect(result.class).toBe('PARTIAL_OUTPUT');
  // ...but the evidence proves no shell was involved.
  expect(fs.existsSync(marker)).toBe(false);
  const seen = JSON.parse(fs.readFileSync(echoed, 'utf8')) as string[];
  expect(seen).toEqual([echoed, ...dangerous]);
});

test('process-tree termination: timed-out grandchildren stop heartbeating', async () => {
  const dir = scratchDir();
  const heartbeat = path.join(dir, 'tree.hb');
  const sleeper = writeFake(
    dir,
    'sleeper.cjs',
    `
const fs = require('node:fs');
const hb = process.argv[2];
fs.writeFileSync(hb, '0');
let n = 0;
const timer = setInterval(() => { n += 1; try { fs.writeFileSync(hb, String(n)); } catch {} }, 100);
setTimeout(() => { clearInterval(timer); }, 30000);
`,
  );
  const parent = writeFake(
    dir,
    'tree-parent.cjs',
    `
const { spawn } = require('node:child_process');
spawn(process.execPath, ['${sleeper.replace(/\\/g, '\\\\')}', '${heartbeat.replace(/\\/g, '\\\\')}']);
setTimeout(()=>{},30000);
`,
  );
  const result = await driverFor(parent).complete(makeRequest(), callOptions({ timeoutMs: 300 }));
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('TIMEOUT');
  await waitForHeartbeatStable(heartbeat);
});

test('environment: allowlisted vars pass, parent env does not leak', async () => {
  const dir = scratchDir();
  const out = path.join(dir, 'env.txt');
  const script = writeFake(
    dir,
    'env.cjs',
    `
const fs = require('node:fs');
const probe = process.env.NW_LANE_B_PROBE ?? 'absent';
const parent = process.env.NW_LANE_B_PARENT_SENTINEL ?? 'absent';
fs.writeFileSync(process.argv[2], probe + '|' + parent);
`,
  );
  process.env.NW_LANE_B_PARENT_SENTINEL = 'should-not-pass';
  try {
    const result = await driverFor(script, [out], {
      extraEnv: { NW_LANE_B_PROBE: 'probe-value-1' },
      allowedEnvKeys: ['NW_LANE_B_PROBE'],
    }).complete(makeRequest(), callOptions());
    expect(result.ok).toBe(false);
    const seen = fs.readFileSync(out, 'utf8');
    expect(seen).toBe('probe-value-1|absent');
  } finally {
    delete process.env.NW_LANE_B_PARENT_SENTINEL;
  }
});

test('validator classes propagate: unknown intents fail closed', async () => {
  const dir = scratchDir();
  const script = writeFake(
    dir,
    'unknown-intent.mjs',
    `process.stdout.write(JSON.stringify({schemaVersion:'${RESPONSE_VERSION}',intents:[{kind:'FROB',reasonCode:'X'}],hypotheses:[]}));`,
  );
  const result = await driverFor(script).complete(makeRequest(), callOptions());
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.class).toBe('UNKNOWN_INTENT');
  expect(isRetryableReasonerFailure(result.class)).toBe(false);
});

test('retry classification covers every protocol failure class', () => {
  const retryable: ReasonerFailureClass[] = [
    'TIMEOUT',
    'HUNG_CHILD',
    'HUNG_GRANDCHILD',
    'CLI_CRASH',
    'NONZERO_EXIT',
    'PARTIAL_OUTPUT',
    'PROVIDER_FAILURE',
  ];
  const seen = new Set<ReasonerFailureClass>();
  for (const failure of REASONER_FAILURE_CLASSES) {
    const expected = retryable.includes(failure);
    expect(isRetryableReasonerFailure(failure)).toBe(expected);
    seen.add(failure);
  }
  expect(seen.size).toBe(REASONER_FAILURE_CLASSES.length);
});

test('lifecycle classifier precedence is total and ordered', () => {
  const base = {
    spawnError: false,
    aborted: false,
    oversize: false,
    timedOut: false,
    sigkillEscalated: false,
    exited: true,
    stdioClosed: true,
    exitCode: 0,
    signal: null,
  } as const;
  expect(classifyCliOutcome(base)).toBeNull();
  expect(classifyCliOutcome({ ...base, aborted: true, oversize: true })).toBe('CANCELLED');
  expect(classifyCliOutcome({ ...base, oversize: true, exitCode: 3 })).toBe('OVERSIZE_OUTPUT');
  expect(classifyCliOutcome({ ...base, timedOut: true })).toBe('TIMEOUT');
  expect(classifyCliOutcome({ ...base, timedOut: true, sigkillEscalated: true })).toBe('HUNG_CHILD');
  expect(classifyCliOutcome({ ...base, exited: true, stdioClosed: false })).toBe('HUNG_GRANDCHILD');
  expect(classifyCliOutcome({ ...base, spawnError: true })).toBe('CLI_CRASH');
  expect(classifyCliOutcome({ ...base, signal: 'SIGSEGV' })).toBe('CLI_CRASH');
  expect(classifyCliOutcome({ ...base, exitCode: 3 })).toBe('NONZERO_EXIT');
});

test('executable resolution rejects unsafe or unknown binaries', () => {
  const valid = {
    provider: 'test-provider',
    model: 'fake-1',
    validationContext: { authorizedEnvironments: [] },
  } as const;
  expect(() => resolveCliReasoner({ ...valid, executable: 'relative/path/cli' })).toThrow();
  expect(() => resolveCliReasoner({ ...valid, executable: 'some-cli' })).toThrow();
  expect(() => resolveCliReasoner({ ...valid, executable: 'some-cli; rm -rf' })).toThrow();
  expect(() => resolveCliReasoner({
    ...valid,
    executable: 'nightwatch-definitely-missing-binary-xyz',
    allowedExecutables: ['nightwatch-definitely-missing-binary-xyz'],
  })).toThrow();
  expect(() => resolveCliReasoner({ ...valid, executable: '/nonexistent/nw-cli-xyz' })).toThrow();
  expect(() => resolveCliReasoner({
    ...valid, executable: NODE, args: ['-e', 'x\0y'],
  })).toThrow();
  expect(() => resolveCliReasoner({
    ...valid, executable: NODE, args: ['-e', `token ${'AKIA'}${'0'.repeat(16)}`],
  })).toThrow();
  expect(() => resolveCliReasoner({
    ...valid, executable: NODE, extraEnv: { NW_X: '1' },
  })).toThrow();
  const resolved = resolveCliReasoner({ ...valid, executable: NODE });
  expect(resolved.executableBasename).toBe(path.basename(NODE));
});

test('allowlisted PATH basenames resolve without a shell', () => {
  const dir = scratchDir();
  const name = 'nw-fake-reasoner-probe';
  const probe = path.join(dir, name);
  fs.writeFileSync(probe, '#!/bin/sh\nexit 0\n', 'utf8');
  fs.chmodSync(probe, 0o755);
  const previousPath = process.env.PATH ?? '';
  process.env.PATH = `${dir}${path.delimiter}${previousPath}`;
  try {
    const resolved = resolveCliReasoner({
      provider: 'test-provider',
      model: 'fake-1',
      executable: name,
      allowedExecutables: [name],
      validationContext: { authorizedEnvironments: [] },
    });
    expect(resolved.executableBasename).toBe(name);
    expect(path.basename(resolved.executablePath)).toBe(name);
  } finally {
    process.env.PATH = previousPath;
  }
});

test('result descriptions are secret-safe', async () => {
  const dir = scratchDir();
  const statement = 'unique-hypothesis-statement-xyz';
  const script = writeFake(
    dir,
    'hypothesis.mjs',
    `process.stdout.write(JSON.stringify({schemaVersion:'${RESPONSE_VERSION}',intents:[{kind:'PAUSE'}],hypotheses:[{hypothesisId:'h1',statement:'${statement}',evidenceRefs:[]}]}));`,
  );
  const okResult = await driverFor(script).complete(makeRequest(), callOptions());
  expect(okResult.ok).toBe(true);
  const okLine = describeReasonerResult(okResult);
  expect(okLine).toContain('ok');
  expect(okLine).not.toContain(statement);

  const secretToken = `Bearer ${'q7w8e9r0t6y4u2i1o3p'}`;
  const leaker = writeFake(
    dir,
    'leaker.mjs',
    `process.stdout.write('${PAUSE_RESPONSE}');process.stderr.write('leak: ' + '${secretToken}' + '\\n');`,
  );
  const failResult = await driverFor(leaker).complete(makeRequest(), callOptions());
  expect(failResult.ok).toBe(false);
  if (failResult.ok) return;
  expect(failResult.class).toBe('SECRET_ECHO');
  const failLine = describeReasonerResult(failResult);
  expect(failLine).toContain('SECRET_ECHO');
  expect(failLine).not.toContain('q7w8e9r0t6y4u2i1o3p');
});

test('protocol budget constants are honored, not forked', () => {
  expect(REASONER_STDOUT_BYTE_CAP).toBe(1_048_576);
  expect(REASONER_STDERR_BYTE_CAP).toBe(262_144);
  expect(AGENT_BUDGET_VERSION).toBe('nightwatch.agent-budget.v1');
});
