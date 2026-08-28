import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { materializeRelayPort } from '../../api/phase5/generator';
import { assertGeneratedScenarioSafe } from '../../api/phase5/restrictedProfile';
import type { ApiOperation, GeneratedScenario } from '../../api/phase5/types';
import type { Phase5Relay, RelayObservation } from '../../api/phase5/relay';
import { OOPS_ADAPTER_VERSION } from '../../api/phase5/types';
import { assertL6RuntimeCapability, qualifyL6RuntimeCapability, runL6ContainedOops } from './l6';

export const OOPS_PROCESS_TIMEOUT_MS = 20_000;
export const OOPS_OUTPUT_LIMIT_BYTES = 64 * 1024;

export type OopsOutcome =
  | 'OOPS_PROCESS_SUCCESS'
  | 'SCENARIO_SUCCESS'
  | 'SCENARIO_ASSERTION_FAILURE'
  | 'SCENARIO_PARSE_FAILURE'
  | 'OOPS_INTERNAL_FAILURE'
  | 'OOPS_TIMEOUT'
  | 'OOPS_SIGNALLED'
  | 'RELAY_SAFETY_BLOCK'
  | 'API_ORACLE_ANOMALY';

export interface OopsOutputSummary {
  stdoutBytes: number;
  stderrBytes: number;
  outputTruncated: boolean;
  rawBodyDetected: boolean;
  secretLeakCount: number;
  sanitized: true;
  fingerprint: string;
}

export interface OopsRunResult {
  adapterVersion: typeof OOPS_ADAPTER_VERSION;
  scenarioId: string;
  operationId: string;
  outcome: OopsOutcome;
  process: {
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    timedOut: boolean;
    binarySHA256: string;
    argvSafe: true;
    shell: false;
    containment: 'L5_POLICY_RELAY' | 'L6_ROOTLESS_NAMESPACE';
  };
  relayObservation?: RelayObservation;
  output: OopsOutputSummary;
  childEnvironment: {
    allowlistOnly: true;
    parentSentinelInherited: false;
    credentialNamesPassed: 0;
  };
  workspace: {
    ownerOnly: boolean;
    scenarioMode: '0600';
    cleaned: boolean;
  };
}

export interface RunRestrictedOopsOptions {
  binaryPath: string;
  binarySourceSHA: string;
  expectedSourceSHA: string;
  /** SHA-256 recorded from the controlled local build artifact. */
  expectedBinarySHA256: string;
  scenario: GeneratedScenario;
  operation: ApiOperation;
  relay: Phase5Relay;
  timeoutMs?: number;
  parentSentinelName?: string;
  parentSentinelValue?: string;
  extraSecrets?: readonly string[];
}

interface ProcessCapture {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  stdout: Uint8Array;
  stderr: Uint8Array;
  outputTruncated: boolean;
  spawnError?: Error;
}

function ownerOnly(directory: string): boolean {
  const stat = fs.statSync(directory);
  return (stat.mode & 0o077) === 0 && (typeof process.getuid !== 'function' || stat.uid === process.getuid());
}

function ensurePrivateDirectory(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  if (!ownerOnly(directory)) throw new Error('OOPS workspace is not owner-only');
}

function assertNoSymlinkComponents(target: string): void {
  const parsed = path.parse(target);
  let current = parsed.root;
  for (const component of target.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('OOPS_BINARY_MISSING');
      throw new Error('OOPS_BINARY_PATH_UNREADABLE');
    }
    if (stat.isSymbolicLink()) throw new Error('OOPS_BINARY_SYMLINK');
  }
}

/** Validate and hash the exact regular executable that will be spawned. */
export function sha256Executable(binaryPath: string): string {
  if (!path.isAbsolute(binaryPath)) throw new Error('OOPS_BINARY_PATH_NOT_ABSOLUTE');
  assertNoSymlinkComponents(binaryPath);
  const stat = fs.lstatSync(binaryPath);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('OOPS_BINARY_NOT_REGULAR_FILE');
  if ((stat.mode & 0o111) === 0) throw new Error('OOPS_BINARY_NOT_EXECUTABLE');
  if ((stat.mode & 0o022) !== 0) throw new Error('OOPS_BINARY_PERMISSIONS_UNSAFE');
  if (process.getuid !== undefined && stat.uid !== process.getuid()) throw new Error('OOPS_BINARY_OWNER_UNTRUSTED');
  return crypto.createHash('sha256').update(fs.readFileSync(binaryPath)).digest('hex');
}

function writePrivateAtomic(file: string, contents: string): void {
  const temp = `${file}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  const fd = fs.openSync(temp, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
  try {
    fs.writeFileSync(fd, contents, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fs.chmodSync(temp, 0o600);
    fs.renameSync(temp, file);
  } catch (error) {
    try { fs.closeSync(fd); } catch { /* best effort */ }
    try { fs.unlinkSync(temp); } catch { /* best effort */ }
    throw error;
  }
}

export function buildOOPSAllowlistedEnvironment(workspace: string): NodeJS.ProcessEnv {
  const home = path.join(workspace, 'home');
  const tmp = path.join(workspace, 'tmp');
  ensurePrivateDirectory(home);
  ensurePrivateDirectory(tmp);
  return {
    PATH: '/usr/local/bin:/usr/bin:/bin',
    HOME: home,
    TMPDIR: tmp,
    LANG: 'C',
    LC_ALL: 'C',
    NO_COLOR: '1',
    NIGHTWATCH_OOPS_ADAPTER: OOPS_ADAPTER_VERSION,
  };
}

function containsSecretLike(value: string, extraSecrets: readonly string[]): boolean {
  if (extraSecrets.some((secret) => secret !== '' && value.includes(secret))) return true;
  return /(?:bearer\s+|AWS_(?:ACCESS|SECRET|SESSION)|GOOGLE_APPLICATION_CREDENTIALS|GITHUB_TOKEN|SLACK_WEBHOOK|password|cookie|storage.?state)/i.test(value);
}

export function sanitizeOopsOutput(stdout: Uint8Array | string, stderr: Uint8Array | string, extraSecrets: readonly string[] = []): OopsOutputSummary {
  const out = typeof stdout === 'string' ? stdout : Buffer.from(stdout).toString('utf8');
  const err = typeof stderr === 'string' ? stderr : Buffer.from(stderr).toString('utf8');
  const combined = `${out}\n${err}`;
  let secretLeakCount = 0;
  for (const secret of extraSecrets) {
    if (secret !== '' && combined.includes(secret)) secretLeakCount += 1;
  }
  const rawBodyDetected = /(?:\[response\]|response body|raw body|customer.?sentinel|fake.?secret)/i.test(combined);
  const category = [
    rawBodyDetected ? 'raw-body-marker' : 'no-raw-body-marker',
    /(?:yaml|unmarshal|parse)/i.test(combined) ? 'parse-signal' : 'no-parse-signal',
    /(?:assert|status|error|failed)/i.test(combined) ? 'failure-signal' : 'no-failure-signal',
    containsSecretLike(combined, extraSecrets) ? 'secret-like-signal' : 'no-secret-like-signal',
  ].join('|');
  return {
    stdoutBytes: Buffer.byteLength(out),
    stderrBytes: Buffer.byteLength(err),
    outputTruncated: false,
    rawBodyDetected,
    secretLeakCount,
    sanitized: true,
    fingerprint: `oops-output:${crypto.createHash('sha256').update(category).digest('hex').slice(0, 24)}`,
  };
}

function appendBounded(current: Uint8Array, chunk: Uint8Array, limit: number): { value: Uint8Array; truncated: boolean } {
  if (current.length >= limit) return { value: current, truncated: true };
  if (current.length + chunk.length <= limit) return { value: Uint8Array.from([...current, ...chunk]), truncated: false };
  return { value: Uint8Array.from([...current, ...chunk.subarray(0, limit - current.length)]), truncated: true };
}

function captureProcess(binaryPath: string, args: readonly string[], env: NodeJS.ProcessEnv, cwd: string, timeoutMs: number): Promise<ProcessCapture> {
  return new Promise((resolve) => {
    let child: ChildProcess;
    try {
      child = spawn(binaryPath, [...args], { cwd, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      resolve({ exitCode: null, signal: null, timedOut: false, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), outputTruncated: false, spawnError: error as Error });
      return;
    }
    let stdout: Uint8Array = new Uint8Array();
    let stderr: Uint8Array = new Uint8Array();
    let outputTruncated = false;
    let timedOut = false;
    let settled = false;
    let killTimer: NodeJS.Timeout | undefined;
    const finish = (exitCode: number | null, signal: NodeJS.Signals | null): void => {
      if (settled) return;
      settled = true;
      if (killTimer !== undefined) clearTimeout(killTimer);
      clearTimeout(timer);
      resolve({ exitCode, signal, timedOut, stdout, stderr, outputTruncated });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      killTimer = setTimeout(() => child.kill('SIGKILL'), 500);
    }, timeoutMs);
    child.stdout?.on('data', (chunk: Buffer) => {
      const result = appendBounded(stdout, chunk, OOPS_OUTPUT_LIMIT_BYTES);
      stdout = result.value;
      outputTruncated ||= result.truncated;
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const result = appendBounded(stderr, chunk, OOPS_OUTPUT_LIMIT_BYTES);
      stderr = result.value;
      outputTruncated ||= result.truncated;
    });
    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (killTimer !== undefined) clearTimeout(killTimer);
      resolve({ exitCode: null, signal: null, timedOut, stdout, stderr, outputTruncated, spawnError: error });
    });
    child.once('close', (code, signal) => finish(code, signal));
  });
}

function assertSafeArg(value: string, secrets: readonly string[]): void {
  if (containsSecretLike(value, secrets)) throw new Error('OOPS argv contains secret-like material');
  if (value.includes('--pre-process-hook') || value.includes('--report-slack') || value.includes('--report-pubsub') || value.includes('--github-token') || value.includes('--pubsub') || value.includes('--snssqs')) {
    throw new Error('OOPS argv contains prohibited capability');
  }
}

export function validateRestrictedOopsInvocationArgs(args: readonly string[]): void {
  const allowed = args.length === 3 && args[0] === '--scenarios' && args[2] === '--skip-result-notif';
  if (!allowed) throw new Error('fail-closed: Phase 5 OOPS invocation arguments are fixed and restricted');
  if (args.some((arg) => arg.includes('--pre-process-hook') || arg.includes('--report-slack') || arg.includes('--report-pubsub') || arg.includes('--github-token') || arg.includes('--pubsub') || arg.includes('--snssqs'))) {
    throw new Error('fail-closed: prohibited OOPS capability argument');
  }
}

function classifyOutcome(capture: ProcessCapture, observation: RelayObservation | undefined): OopsOutcome {
  if (capture.timedOut) return 'OOPS_TIMEOUT';
  if (capture.signal !== null) return 'OOPS_SIGNALLED';
  if (capture.spawnError !== undefined) return 'OOPS_INTERNAL_FAILURE';
  if (observation?.safetyBlock !== undefined) return 'RELAY_SAFETY_BLOCK';
  if (observation === undefined) return capture.exitCode === 0 ? 'SCENARIO_PARSE_FAILURE' : 'OOPS_INTERNAL_FAILURE';
  if (observation.oracle.result === 'ORACLE_PASS') return capture.exitCode === 0 ? 'SCENARIO_SUCCESS' : 'OOPS_INTERNAL_FAILURE';
  if (observation.oracle.result === 'STATUS_CLASS_MISMATCH') return 'SCENARIO_ASSERTION_FAILURE';
  return 'API_ORACLE_ANOMALY';
}

export async function runRestrictedOops(options: RunRestrictedOopsOptions): Promise<OopsRunResult> {
  if (options.binarySourceSHA !== options.expectedSourceSHA) throw new Error('BINARY_SOURCE_MISMATCH');
  if (!/^[a-f0-9]{64}$/.test(options.expectedBinarySHA256)) throw new Error('OOPS_BINARY_DIGEST_INVALID');
  const actualBinarySHA256 = sha256Executable(options.binaryPath);
  if (actualBinarySHA256 !== options.expectedBinarySHA256) throw new Error('OOPS_BINARY_DIGEST_MISMATCH');
  if (options.operation.semanticClass !== 'KNOWN_READ') throw new Error('fail-closed: OOPS adapter only accepts KNOWN_READ');
  const logicalYaml = options.scenario.logicalYaml;
  assertGeneratedScenarioSafe(logicalYaml, options.operation.operationId);
  const requiresL6 = options.operation.requiredHostClass === 'DEV_API' || options.operation.authClass === 'RELAY_EPHEMERAL_DEV_SESSION';
  if (requiresL6) {
    const capability = await qualifyL6RuntimeCapability();
    assertL6RuntimeCapability(capability);
  }
  const secrets = [...(options.extraSecrets ?? []), ...(options.parentSentinelValue ? [options.parentSentinelValue] : [])];
  let workspace: string | undefined;
  let cleaned = false;
  let l6Cleaned = false;
  let completedResult: OopsRunResult | undefined;
  try {
    let capture: ProcessCapture;
    let containment: OopsRunResult['process']['containment'];
    if (requiresL6) {
      const l6Capture = await runL6ContainedOops({
        binaryPath: options.binaryPath,
        logicalScenario: logicalYaml,
        operationId: options.operation.operationId,
        relay: options.relay,
        timeoutMs: options.timeoutMs ?? OOPS_PROCESS_TIMEOUT_MS,
      });
      capture = {
        exitCode: l6Capture.exitCode,
        signal: l6Capture.signal,
        timedOut: l6Capture.timedOut,
        stdout: l6Capture.stdout,
        stderr: l6Capture.stderr,
        outputTruncated: l6Capture.outputTruncated,
      };
      l6Cleaned = l6Capture.cleanup;
      containment = 'L6_ROOTLESS_NAMESPACE';
    } else {
      workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase5-oops-'));
      ensurePrivateDirectory(workspace);
      const env = buildOOPSAllowlistedEnvironment(workspace);
      const scenarioFile = path.join(workspace, 'scenario.yaml');
      const materialized = materializeRelayPort(logicalYaml, options.relay.port, options.operation.operationId);
      assertGeneratedScenarioSafe(materialized, options.operation.operationId);
      writePrivateAtomic(scenarioFile, materialized);
      const args = ['--scenarios', scenarioFile, '--skip-result-notif'];
      validateRestrictedOopsInvocationArgs(args);
      for (const arg of [options.binaryPath, ...args]) assertSafeArg(arg, secrets);
      capture = await captureProcess(options.binaryPath, args, env, workspace, options.timeoutMs ?? OOPS_PROCESS_TIMEOUT_MS);
      containment = 'L5_POLICY_RELAY';
    }
    const observation = options.relay.takeObservation(options.operation.operationId);
    const output = sanitizeOopsOutput(capture.stdout, capture.stderr, secrets);
    output.outputTruncated = capture.outputTruncated;
    const result: OopsRunResult = {
      adapterVersion: OOPS_ADAPTER_VERSION,
      scenarioId: options.scenario.scenarioId,
      operationId: options.operation.operationId,
      outcome: classifyOutcome(capture, observation),
      process: { exitCode: capture.exitCode, signal: capture.signal, timedOut: capture.timedOut, binarySHA256: actualBinarySHA256, argvSafe: true, shell: false, containment },
      ...(observation ? { relayObservation: observation } : {}),
      output,
      childEnvironment: { allowlistOnly: true, parentSentinelInherited: false, credentialNamesPassed: 0 },
      workspace: { ownerOnly: workspace === undefined ? true : ownerOnly(workspace), scenarioMode: '0600', cleaned: false },
    };
    completedResult = result;
    return result;
  } finally {
    if (workspace !== undefined) {
      try {
        fs.rmSync(workspace, { recursive: true, force: true });
        cleaned = true;
      } catch {
        cleaned = false;
      }
    }
    if (completedResult !== undefined) completedResult.workspace.cleaned = workspace === undefined ? l6Cleaned : cleaned;
  }
}
