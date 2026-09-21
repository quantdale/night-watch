// ---------------------------------------------------------------------------
// Headless CLI ReasonerDriver gateway (Lane B).
//
// Provider-neutral transport for the frozen ReasonerDriver contract. This
// module owns process mechanics only: executable resolution, safe argv,
// allowlisted environment, JSON/JSONL framing, byte caps, deadline,
// AbortSignal cancellation, and process-tree termination. It never interprets
// untrusted payloads as instructions and never embeds captured child output,
// argv values, or environment values in errors, results, or log lines —
// byte counts and failure classes only.
//
// Failure precedence (first match wins):
//   CANCELLED -> OVERSIZE_OUTPUT -> TIMEOUT -> HUNG_CHILD -> HUNG_GRANDCHILD
//   -> CLI_CRASH -> NONZERO_EXIT -> SECRET_ECHO -> PARTIAL_OUTPUT ->
//   GARBAGE_OUTPUT -> MALFORMED_OUTPUT / validator class.
// Lifecycle failures precede content failures because the output of a failed
// process is untrustworthy; among content failures SECRET_ECHO dominates
// because it triggers secret rotation.
// ---------------------------------------------------------------------------

import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { buildChildEnvironment } from '../process/childEnvironment';
import {
  REASONER_DEFAULT_TIMEOUT_MS,
  REASONER_DRIVER_VERSION,
  REASONER_STDERR_BYTE_CAP,
  REASONER_STDOUT_BYTE_CAP,
  type ReasonerCallOptions,
  type ReasonerCallResult,
  type ReasonerDriver,
  type ReasonerFailureClass,
  type ReasonerProvenance,
  type ReasonerTurnRequest,
} from '../agentProtocol/reasoner';
import {
  classifyOutputSize,
  classifyRawOutput,
  validateReasonerTurnResponse,
  type ReasonerValidationContext,
} from '../agentProtocol/validate';
import {
  classifyProviderFailure,
  PROVIDER_SIGNAL_SCAN_MAX_CHARS,
  type ProviderFailureEvidence,
} from '../agentProtocol/providerFailure';

export const CLI_REASONER_DEFAULT_KILL_GRACE_MS = 2_000 as const;
export const CLI_REASONER_DEFAULT_STDIO_GRACE_MS = 2_000 as const;
const CLI_REASONER_HARD_CEILING_SLACK_MS = 10_000;
const CLI_REASONER_MAX_ARGS = 64;
const CLI_REASONER_MAX_ARG_BYTES = 4_096;
const CLI_REASONER_MAX_ENV_VALUE_BYTES = 32_768;
const CLI_REASONER_MAX_LABEL_CHARS = 128;

/** Basename allowlist entries and PATH lookups: no separators, no metachars. */
const SAFE_BASENAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SAFE_ENV_KEY_RE = /^[A-Z][A-Z0-9_]{1,63}$/;
/** Provider/model labels travel into provenance and log lines: keep them tame. */
const SAFE_LABEL_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
/**
 * Mirror of the protocol validator's secret pattern (see
 * src/core/agentProtocol/validate.ts SECRET_RE). Duplicated — not imported —
 * because the protocol keeps it module-private; this copy scans stderr and
 * raw combined output at the transport layer before validation runs.
 */
const SECRET_ECHO_RE =
  /(?:Bearer\s+[A-Za-z0-9._~+/=-]{8,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;

export interface CliReasonerConfig {
  /**
   * Absolute filesystem path, or a bare basename resolved through PATH when
   * listed in `allowedExecutables`. Never a shell string.
   */
  readonly executable: string;
  /** Basename allowlist for PATH resolution. Empty by default: nothing resolves. */
  readonly allowedExecutables?: readonly string[];
  /** Literal argv passed with `shell: false`. Never interpreted by a shell. */
  readonly args?: readonly string[];
  /** Caller-declared provenance. Free-form but tame; never inferred. */
  readonly provider: string;
  readonly model: string;
  /** Extra child env vars; every key must also appear in `allowedEnvKeys`. */
  readonly extraEnv?: Readonly<Record<string, string>>;
  /** Allowlist for `extraEnv` keys. Empty by default: no extra vars pass. */
  readonly allowedEnvKeys?: readonly string[];
  /** SIGTERM -> SIGKILL escalation grace. Defaults to 2000ms. */
  readonly killGraceMs?: number;
  /** Post-exit grace for stdio EOF before HUNG_GRANDCHILD. Defaults to 2000ms. */
  readonly stdioGraceMs?: number;
  /** Authorization context for response validation (tools/environments). */
  readonly validationContext: ReasonerValidationContext;
}

export interface ResolvedCliReasoner {
  readonly executablePath: string;
  readonly executableBasename: string;
  readonly argv: readonly string[];
  readonly env: NodeJS.ProcessEnv;
  readonly provider: string;
  readonly model: string;
  readonly killGraceMs: number;
  readonly stdioGraceMs: number;
  readonly validationContext: ReasonerValidationContext;
}

function failClosed(message: string): Error {
  return new Error(`cli-reasoner: ${message}`);
}

function assertSafeLabel(field: string, value: string): void {
  if (!SAFE_LABEL_RE.test(value)) throw failClosed(`${field} must match [A-Za-z0-9._:/-], 1-128 chars`);
}

function assertSafeArgv(args: readonly string[]): void {
  if (args.length > CLI_REASONER_MAX_ARGS) throw failClosed(`argv exceeds ${CLI_REASONER_MAX_ARGS} entries`);
  for (const arg of args) {
    if (arg.includes('\0')) throw failClosed('argv entry contains NUL');
    if (Buffer.byteLength(arg, 'utf8') > CLI_REASONER_MAX_ARG_BYTES) {
      throw failClosed('argv entry exceeds 4096 bytes');
    }
    // Secrets travel via allowlisted env, never argv (argv leaks into ps output).
    if (SECRET_ECHO_RE.test(arg)) throw failClosed('argv entry looks secret-bearing; use allowlisted env instead');
  }
}

function assertRegularExecutable(canonicalPath: string): void {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(canonicalPath);
  } catch {
    throw failClosed(`executable is not accessible: ${path.basename(canonicalPath)}`);
  }
  if (!stat.isFile()) throw failClosed('executable is not a regular file');
  if ((stat.mode & 0o111) === 0) throw failClosed('executable has no execute bit');
}

function resolveAbsoluteExecutable(executable: string): { executablePath: string; executableBasename: string } {
  if (!path.isAbsolute(executable)) throw failClosed('executable with a path separator must be absolute');
  // Canonicalize first so the process we validate is the process we spawn.
  let canonical: string;
  try {
    canonical = fs.realpathSync(executable);
  } catch {
    throw failClosed(`executable is not accessible: ${path.basename(executable)}`);
  }
  assertRegularExecutable(canonical);
  return { executablePath: canonical, executableBasename: path.basename(canonical) };
}

function resolveBasenameExecutable(
  executable: string,
  allowedExecutables: readonly string[],
): { executablePath: string; executableBasename: string } {
  if (!SAFE_BASENAME_RE.test(executable)) throw failClosed('executable basename is not allowlist-safe');
  if (!allowedExecutables.includes(executable)) throw failClosed(`executable is not allowlisted: ${executable}`);
  const pathValue = process.env.PATH ?? '';
  for (const directory of pathValue.split(path.delimiter)) {
    if (directory === '') continue;
    const candidate = path.join(directory, executable);
    let canonical: string;
    try {
      canonical = fs.realpathSync(candidate);
    } catch {
      continue;
    }
    try {
      assertRegularExecutable(canonical);
    } catch {
      continue;
    }
    // Avoid directory-traversal surprises: the resolved file must keep the name.
    if (path.basename(canonical) !== executable) continue;
    return { executablePath: canonical, executableBasename: executable };
  }
  throw failClosed(`allowlisted executable not found on PATH: ${executable}`);
}

function resolveExtraEnv(
  extraEnv: Readonly<Record<string, string>>,
  allowedEnvKeys: readonly string[],
): NodeJS.ProcessEnv {
  const overlaid: NodeJS.ProcessEnv = {};
  const allowed = new Set(allowedEnvKeys);
  for (const [key, value] of Object.entries(extraEnv)) {
    if (!SAFE_ENV_KEY_RE.test(key)) throw failClosed(`env key is not allowlist-safe: ${key}`);
    if (!allowed.has(key)) throw failClosed(`env key is not allowlisted: ${key}`);
    if (value.includes('\0')) throw failClosed(`env value contains NUL: ${key}`);
    if (Buffer.byteLength(value, 'utf8') > CLI_REASONER_MAX_ENV_VALUE_BYTES) {
      throw failClosed(`env value exceeds bounds: ${key}`);
    }
    overlaid[key] = value;
  }
  return overlaid;
}

function normalizeGrace(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value < 0) throw failClosed('grace must be a finite non-negative number');
  return Math.min(value, 30_000);
}

/**
 * Validate config and resolve the exact executable that will be spawned.
 * Throws a content-free Error on any violation (fail-closed, pre-spawn).
 */
export function resolveCliReasoner(config: CliReasonerConfig): ResolvedCliReasoner {
  if (typeof config.executable !== 'string' || config.executable.length === 0) {
    throw failClosed('executable must be a non-empty string');
  }
  if (config.executable.length > 1024) throw failClosed('executable path exceeds bounds');
  assertSafeLabel('provider', config.provider);
  assertSafeLabel('model', config.model);
  const argv = config.args ?? [];
  assertSafeArgv(argv);
  const looksLikePath = config.executable.includes('/') || path.isAbsolute(config.executable);
  const resolved = looksLikePath
    ? resolveAbsoluteExecutable(config.executable)
    : resolveBasenameExecutable(config.executable, config.allowedExecutables ?? []);
  return {
    executablePath: resolved.executablePath,
    executableBasename: resolved.executableBasename,
    argv,
    env: {
      ...buildChildEnvironment(process.env),
      ...resolveExtraEnv(config.extraEnv ?? {}, config.allowedEnvKeys ?? []),
    },
    provider: config.provider,
    model: config.model,
    killGraceMs: normalizeGrace(config.killGraceMs, CLI_REASONER_DEFAULT_KILL_GRACE_MS),
    stdioGraceMs: normalizeGrace(config.stdioGraceMs, CLI_REASONER_DEFAULT_STDIO_GRACE_MS),
    validationContext: config.validationContext,
  };
}

/** Transient transport faults worth one retry; everything else needs an operator. */
const RETRYABLE_REASONER_FAILURES: ReadonlySet<ReasonerFailureClass> = new Set([
  'TIMEOUT',
  'HUNG_CHILD',
  'HUNG_GRANDCHILD',
  'CLI_CRASH',
  'NONZERO_EXIT',
  'PARTIAL_OUTPUT',
  'PROVIDER_FAILURE',
]);

export function isRetryableReasonerFailure(failure: ReasonerFailureClass): boolean {
  return RETRYABLE_REASONER_FAILURES.has(failure);
}

/** Secret-safe one-line summary: classes, labels, and byte counts only. */
export function describeReasonerResult(result: ReasonerCallResult): string {
  const provenance = result.provenance === null
    ? 'provenance=unknown'
    : `exe=${result.provenance.executableBasename} provider=${result.provenance.provider} model=${result.provenance.model}`;
  const outcome = result.ok ? 'ok' : `class=${result.class}`;
  return `reasoner cli turn ${outcome} ${provenance} stdoutBytes=${result.stdoutBytes} stderrBytes=${result.stderrBytes}`;
}

export interface CliLifecycleOutcome {
  readonly spawnError: boolean;
  readonly aborted: boolean;
  readonly oversize: boolean;
  readonly timedOut: boolean;
  readonly sigkillEscalated: boolean;
  readonly exited: boolean;
  readonly stdioClosed: boolean;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
}

/**
 * Pure lifecycle classifier. Returns null when the child exited 0 with
 * drained stdio and content checks should run next.
 */
export function classifyCliOutcome(outcome: CliLifecycleOutcome): ReasonerFailureClass | null {
  if (outcome.aborted) return 'CANCELLED';
  if (outcome.oversize) return 'OVERSIZE_OUTPUT';
  if (outcome.timedOut) return outcome.sigkillEscalated ? 'HUNG_CHILD' : 'TIMEOUT';
  // The child is gone but a grandchild still holds the stdio pipes open.
  if (outcome.exited && !outcome.stdioClosed) return 'HUNG_GRANDCHILD';
  if (outcome.spawnError) return 'CLI_CRASH';
  if (outcome.signal !== null) return 'CLI_CRASH';
  if (!outcome.exited || !outcome.stdioClosed) return 'CLI_CRASH';
  if (outcome.exitCode !== 0) return 'NONZERO_EXIT';
  return null;
}

interface ChildCapture {
  readonly stdout: Buffer;
  readonly stderr: Buffer;
  readonly stdoutReceived: number;
  readonly stderrReceived: number;
  readonly outcome: CliLifecycleOutcome;
}

function normalizeTimeoutMs(value: number): number {
  if (Number.isFinite(value) && value > 0) return Math.min(value, 3_600_000);
  return REASONER_DEFAULT_TIMEOUT_MS;
}

function normalizeCap(value: number, fallback: number): number {
  if (Number.isFinite(value) && value > 0) return Math.min(value, 64 * 1024 * 1024);
  return fallback;
}

function runCliChild(
  resolved: ResolvedCliReasoner,
  payload: string,
  timeoutMs: number,
  stdoutCap: number,
  stderrCap: number,
  signal: AbortSignal,
): Promise<ChildCapture> {
  return new Promise((resolve) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutStored = 0;
    let stderrStored = 0;
    let stdoutReceived = 0;
    let stderrReceived = 0;
    let oversize = false;
    let timedOut = false;
    let aborted = signal.aborted;
    let sigkillEscalated = false;
    let exited = false;
    let stdioClosed = false;
    let exitCode: number | null = null;
    let exitSignal: NodeJS.Signals | null = null;
    let spawnedError = false;
    let settled = false;

    let child: ChildProcess;
    try {
      // No shell, fixed argv, allowlisted env. The child leads its own process
      // group (detached) so cancellation/timeout reaps the whole tree,
      // including grandchildren that share the group.
      child = spawn(resolved.executablePath, [...resolved.argv], {
        env: resolved.env,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: true,
        windowsHide: true,
      });
    } catch (error) {
      void error;
      resolve({
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0),
        stdoutReceived: 0,
        stderrReceived: 0,
        outcome: {
          spawnError: true,
          aborted,
          oversize,
          timedOut,
          sigkillEscalated,
          exited,
          stdioClosed,
          exitCode,
          signal: exitSignal,
        },
      });
      return;
    }

    const killTree = (sig: NodeJS.Signals): void => {
      try {
        if (child.pid !== undefined) process.kill(-child.pid, sig);
      } catch {
        // ESRCH: the tree is already gone.
      }
      try {
        child.kill(sig);
      } catch {
        // Already reaped.
      }
    };

    const clearTimers = (): void => {
      clearTimeout(deadlineTimer);
      clearTimeout(killTimer);
      clearTimeout(stdioTimer);
      clearTimeout(hardTimer);
    };

    const finish = (): void => {
      if (settled) return;
      settled = true;
      clearTimers();
      signal.removeEventListener('abort', onAbort);
      resolve({
        stdout: Buffer.concat(stdoutChunks),
        stderr: Buffer.concat(stderrChunks),
        stdoutReceived,
        stderrReceived,
        outcome: {
          spawnError: spawnedError,
          aborted,
          oversize,
          timedOut,
          sigkillEscalated,
          exited,
          stdioClosed,
          exitCode,
          signal: exitSignal,
        },
      });
    };

    const onDeadline = (): void => {
      if (settled || exited) return;
      if (signal.aborted) {
        aborted = true;
      } else {
        timedOut = true;
      }
      killTree('SIGTERM');
      killTimer = setTimeout(onKillGrace, resolved.killGraceMs);
    };

    const onKillGrace = (): void => {
      if (settled || (exited && stdioClosed)) return;
      sigkillEscalated = true;
      killTree('SIGKILL');
      hardTimer = setTimeout(onHardCeiling, CLI_REASONER_HARD_CEILING_SLACK_MS);
    };

    const onHardCeiling = (): void => {
      // Unkillable child (D-state/zombie): stop waiting, drop stdio, report.
      try {
        child.stdout?.destroy();
      } catch {
        // Best effort.
      }
      try {
        child.stderr?.destroy();
      } catch {
        // Best effort.
      }
      try {
        child.unref();
      } catch {
        // Best effort.
      }
      finish();
    };

    const onAbort = (): void => {
      aborted = true;
      if (settled || (exited && stdioClosed)) return;
      killTree('SIGTERM');
      if (!timedOut) {
        clearTimeout(deadlineTimer);
        killTimer = setTimeout(onKillGrace, resolved.killGraceMs);
      }
    };

    let deadlineTimer = setTimeout(onDeadline, timeoutMs);
    let killTimer: NodeJS.Timeout | undefined;
    let stdioTimer: NodeJS.Timeout | undefined;
    let hardTimer: NodeJS.Timeout | undefined;

    const noteOversize = (): void => {
      if (oversize || settled) return;
      oversize = true;
      killTree('SIGTERM');
      clearTimeout(deadlineTimer);
      killTimer = setTimeout(onKillGrace, resolved.killGraceMs);
    };

    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutReceived += chunk.length;
      if (stdoutReceived > stdoutCap) {
        noteOversize();
        return;
      }
      if (!oversize && stdoutStored < stdoutCap) {
        stdoutChunks.push(chunk);
        stdoutStored += chunk.length;
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderrReceived += chunk.length;
      if (stderrReceived > stderrCap) {
        noteOversize();
        return;
      }
      if (!oversize && stderrStored < stderrCap) {
        stderrChunks.push(chunk);
        stderrStored += chunk.length;
      }
    });

    child.once('error', () => {
      spawnedError = true;
    });

    child.once('exit', (code, sig) => {
      exited = true;
      exitCode = code;
      exitSignal = sig;
      clearTimeout(deadlineTimer);
      if (stdioClosed) {
        finish();
        return;
      }
      // The process is gone but the pipes are still open: a grandchild
      // inherited them. Bound the wait, then report HUNG_GRANDCHILD.
      stdioTimer = setTimeout(() => {
        if (settled || stdioClosed) return;
        sigkillEscalated = true;
        killTree('SIGKILL');
        try {
          child.stdout?.destroy();
        } catch {
          // Best effort.
        }
        try {
          child.stderr?.destroy();
        } catch {
          // Best effort.
        }
        finish();
      }, resolved.stdioGraceMs);
    });

    child.once('close', (code, sig) => {
      stdioClosed = true;
      if (code !== null) exitCode = code;
      if (sig !== null) exitSignal = sig;
      finish();
    });

    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      child.stdin?.write(payload);
      child.stdin?.end();
    } catch {
      // EPIPE: the child exited before reading stdin; exit/close still classify.
    }
    child.stdin?.once('error', () => {
      // Same: early child death surfaces through exit/close.
    });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Whole-document JSON first; then JSONL (last record-looking line wins) so a
 * CLI may emit trailing noise lines after its response document. Leading
 * non-JSON lines stay GARBAGE_OUTPUT per the frozen protocol classifier.
 */
function extractJsonDocument(stdoutText: string): unknown {
  const trimmed = stdoutText.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through to JSONL framing.
  }
  const lines = trimmed.split('\n');
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = (lines[index] ?? '').trim();
    if (line === '') continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (isRecord(parsed)) return parsed;
    } catch {
      // Not the response line; keep scanning.
    }
  }
  return null;
}

function provenanceFor(resolved: ResolvedCliReasoner): ReasonerProvenance {
  return {
    transport: 'CLI',
    executableBasename: resolved.executableBasename,
    provider: resolved.provider,
    model: resolved.model,
  };
}

export function createCliReasonerDriver(config: CliReasonerConfig): ReasonerDriver {
  const resolved = resolveCliReasoner(config);
  const provenance = provenanceFor(resolved);
  return {
    protocolVersion: REASONER_DRIVER_VERSION,
    transport: 'CLI',
    provenance,
    async complete(request: ReasonerTurnRequest, options: ReasonerCallOptions): Promise<ReasonerCallResult> {
      // W13 R-03: every failed call carries the complete provider taxonomy.
      // The signal scan reads bounded stderr and retains only an enumerated
      // signal; raw provider text never leaves this function.
      const callPhase = options.callPhase ?? 'RUNTIME';
      const boundedSignalText = (buffer: Buffer): string | null => (buffer.length === 0
        ? null
        : buffer.subarray(0, Math.min(buffer.length, PROVIDER_SIGNAL_SCAN_MAX_CHARS * 4)).toString('utf8'));
      const evidenceFor = (
        reasonerClass: ReasonerFailureClass,
        stdoutBytes: number,
        stderrBytes: number,
        signalText: string | null,
      ): ProviderFailureEvidence => classifyProviderFailure({
        phase: callPhase,
        reasonerClass,
        providerPresent: true,
        providerSignalText: signalText,
        stdoutBytes,
        stderrBytes,
      });
      if (options.signal.aborted) {
        return { ok: false, class: 'CANCELLED', provenance, stdoutBytes: 0, stderrBytes: 0, providerFailure: evidenceFor('CANCELLED', 0, 0, null) };
      }
      let payload: string;
      try {
        payload = `${JSON.stringify(request)}\n`;
      } catch {
        return { ok: false, class: 'MALFORMED_OUTPUT', provenance, stdoutBytes: 0, stderrBytes: 0, providerFailure: evidenceFor('MALFORMED_OUTPUT', 0, 0, null) };
      }
      const capture = await runCliChild(
        resolved,
        payload,
        normalizeTimeoutMs(options.timeoutMs),
        normalizeCap(options.stdoutByteCap, REASONER_STDOUT_BYTE_CAP),
        normalizeCap(options.stderrByteCap, REASONER_STDERR_BYTE_CAP),
        options.signal,
      );
      const lifecycle = classifyCliOutcome(capture.outcome);
      if (lifecycle !== null) {
        return {
          ok: false,
          class: lifecycle,
          provenance,
          stdoutBytes: capture.stdoutReceived,
          stderrBytes: capture.stderrReceived,
          providerFailure: evidenceFor(lifecycle, capture.stdoutReceived, capture.stderrReceived, boundedSignalText(capture.stderr)),
        };
      }
      const stdoutText = capture.stdout.toString('utf8');
      const stderrText = capture.stderr.toString('utf8');
      if (SECRET_ECHO_RE.test(stdoutText) || SECRET_ECHO_RE.test(stderrText)) {
        return {
          ok: false,
          class: 'SECRET_ECHO',
          provenance,
          stdoutBytes: capture.stdoutReceived,
          stderrBytes: capture.stderrReceived,
          // The echoed body may itself contain the secret: scan nothing.
          providerFailure: evidenceFor('SECRET_ECHO', capture.stdoutReceived, capture.stderrReceived, null),
        };
      }
      const sizeClass = classifyOutputSize(capture.stdoutReceived, capture.stderrReceived);
      if (sizeClass !== null) {
        return {
          ok: false,
          class: sizeClass,
          provenance,
          stdoutBytes: capture.stdoutReceived,
          stderrBytes: capture.stderrReceived,
          providerFailure: evidenceFor(sizeClass, capture.stdoutReceived, capture.stderrReceived, boundedSignalText(capture.stderr)),
        };
      }
      const rawClass = classifyRawOutput(stdoutText);
      if (rawClass !== null) {
        return {
          ok: false,
          class: rawClass,
          provenance,
          stdoutBytes: capture.stdoutReceived,
          stderrBytes: capture.stderrReceived,
          providerFailure: evidenceFor(rawClass, capture.stdoutReceived, capture.stderrReceived, boundedSignalText(capture.stderr)),
        };
      }
      const parsed = extractJsonDocument(stdoutText);
      if (parsed === null) {
        return {
          ok: false,
          class: 'MALFORMED_OUTPUT',
          provenance,
          stdoutBytes: capture.stdoutReceived,
          stderrBytes: capture.stderrReceived,
          providerFailure: evidenceFor('MALFORMED_OUTPUT', capture.stdoutReceived, capture.stderrReceived, boundedSignalText(capture.stderr)),
        };
      }
      const validated = validateReasonerTurnResponse(parsed, resolved.validationContext);
      if (!validated.ok) {
        return {
          ok: false,
          class: validated.class,
          provenance,
          stdoutBytes: capture.stdoutReceived,
          stderrBytes: capture.stderrReceived,
          providerFailure: evidenceFor(validated.class, capture.stdoutReceived, capture.stderrReceived, boundedSignalText(capture.stderr)),
        };
      }
      return {
        ok: true,
        response: validated.value,
        provenance,
        stdoutBytes: capture.stdoutReceived,
        stderrBytes: capture.stderrReceived,
      };
    },
  };
}

/** Maximum label length guard shared with tests (labels are log-visible). */
export const CLI_REASONER_LIMITS = {
  maxArgs: CLI_REASONER_MAX_ARGS,
  maxArgBytes: CLI_REASONER_MAX_ARG_BYTES,
  maxEnvValueBytes: CLI_REASONER_MAX_ENV_VALUE_BYTES,
  maxLabelChars: CLI_REASONER_MAX_LABEL_CHARS,
} as const;
