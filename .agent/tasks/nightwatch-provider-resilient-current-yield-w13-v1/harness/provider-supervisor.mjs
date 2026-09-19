#!/usr/bin/env node
// W13 provider supervisor. LOCAL owner-local only.
//
// The campaign talks to ONE executable per call; this supervisor is that
// executable. It reads the request from stdin, dispatches it to the ACTIVE
// provider (frozen order, persisted in a run state file), classifies the
// outcome with the ten-member taxonomy, records sanitized per-provider
// attribution, and advances exactly one step when a failover-eligible class
// reaches its frozen consecutive-failure threshold.
//
// On success it writes the adapter response to stdout and exits 0.
// On a failure it exits non-zero so the campaign records a provider failure.
// It never retries within the same call and never consults result quality.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadTypeScriptModules } from '../../../../bin/lib/typescript-runtime-loader.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '..', '..', '..', '..');

function argValue(name) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return found === undefined ? null : found.slice(prefix.length);
}

const stateDirectory = argValue('state');
const runId = argValue('run');
if (typeof stateDirectory !== 'string' || stateDirectory.length === 0 || typeof runId !== 'string' || runId.length === 0) {
  process.stderr.write('provider supervisor requires --state and --run\n');
  process.exit(2);
}
fs.mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
const statePath = path.join(stateDirectory, `${runId}.state.json`);
const attributionPath = path.join(stateDirectory, `${runId}.attribution.jsonl`);

const [taxonomy, policyMod] = loadTypeScriptModules(
  ['src/core/agentProtocol/providerFailure.ts', 'src/core/currentSourceYield/providerResilience.ts'],
  { root: ROOT },
);
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, '.agent/tasks/nightwatch-provider-resilient-current-yield-w13-v1/provider-resilience-policy.json'), 'utf8'));
const policyCheck = policyMod.validateProviderResiliencePolicy(policy);
if (!policyCheck.ok) {
  process.stderr.write(`PROVIDER_SUPERVISOR_POLICY_INVALID: ${policyCheck.violations.map((violation) => violation.code).join(',')}\n`);
  process.exit(2);
}

function readState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return {
      activeOrdinal: typeof parsed.activeOrdinal === 'number' ? parsed.activeOrdinal : policy.candidates[0].ordinal,
      degraded: Array.isArray(parsed.degraded) ? parsed.degraded : [],
      transitions: Array.isArray(parsed.transitions) ? parsed.transitions : [],
      streaks: typeof parsed.streaks === 'object' && parsed.streaks !== null ? parsed.streaks : {},
      exhausted: parsed.exhausted === true,
    };
  } catch {
    return { activeOrdinal: policy.candidates[0].ordinal, degraded: [], transitions: [], streaks: {}, exhausted: false };
  }
}

function writeState(state) {
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

function appendAttribution(record) {
  fs.appendFileSync(attributionPath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
}

function readStdin() {
  return fs.readFileSync(0, 'utf8');
}

const request = readStdin();
const state = readState();
const candidate = policy.candidates.find((item) => item.ordinal === state.activeOrdinal);
if (state.exhausted || candidate === undefined) {
  appendAttribution({ runId, provider: candidate?.provider ?? 'NONE', class: 'PROVIDER_ABSENT', policyExhausted: true, at: new Date().toISOString() });
  process.stderr.write('provider supervisor: policy exhausted\n');
  process.exit(3);
}

// The frozen provider binary is the only real print CLI. The optional
// --print-cli argument exists so the supervisor plumbing can be tested fully
// offline with a fake CLI; the matrix harness never passes it.
const printCli = argValue('print-cli') ?? '/home/dalepalaca/.opencode/bin/opencode';
const env = {
  PATH: process.env.PATH ?? '/usr/bin:/bin',
  HOME: process.env.HOME ?? '/home/dalepalaca',
  LANG: process.env.LANG ?? 'C',
  NIGHTWATCH_PRINT_CLI: printCli,
  NIGHTWATCH_PRINT_ARGS: JSON.stringify(candidate.argvTemplate),
};
const started = Date.now();
// Keep the attempt below the campaign driver's per-action ceiling so the
// supervisor can still persist its attribution before that ceiling fires.
const attemptTimeoutMs = Math.min(policy.timing.runtimeTimeoutMs, 115_000);
const child = spawnSync(process.execPath, [path.join(ROOT, 'bin/nightwatch-reasoner-print.mjs')], {
  input: request,
  env,
  encoding: 'utf8',
  timeout: attemptTimeoutMs,
  maxBuffer: 4 * 1024 * 1024,
});
const durationMs = Date.now() - started;
const stdout = child.stdout ?? '';
const stderr = child.stderr ?? '';
const timedOut = child.status === 124 || (child.status === null && child.error?.code === 'ETIMEDOUT');

let reasonerClass = null;
let valid = false;
if (!timedOut && child.status === 0) {
  try {
    const parsed = JSON.parse(stdout.trim());
    if (parsed?.schemaVersion === 'nightwatch.reasoner-turn-response.v1' && Array.isArray(parsed.intents) && parsed.intents.length > 0) {
      valid = true;
    } else {
      reasonerClass = 'MALFORMED_OUTPUT';
    }
  } catch {
    reasonerClass = 'GARBAGE_OUTPUT';
  }
} else if (!timedOut) {
  reasonerClass = 'NONZERO_EXIT';
}

const evidence = taxonomy.classifyProviderFailure({
  phase: 'RUNTIME',
  ok: valid,
  reasonerClass,
  providerPresent: true,
  timedOut,
  providerSignalText: reasonerClass === 'NONZERO_EXIT' ? stderr.slice(0, 32768) : null,
  exitCode: child.status,
  durationMs,
  stdoutBytes: Buffer.byteLength(stdout, 'utf8'),
  stderrBytes: Buffer.byteLength(stderr, 'utf8'),
});
appendAttribution({
  runId,
  provider: candidate.provider,
  class: evidence.class,
  reasonerClass,
  providerSignal: evidence.providerSignal,
  exitCode: child.status,
  durationMs,
  stdoutBytes: evidence.stdoutBytes,
  stderrBytes: evidence.stderrBytes,
  at: new Date().toISOString(),
});

if (valid) {
  state.streaks = {};
  writeState(state);
  process.stdout.write(stdout);
  process.exit(0);
}

const eligible = policy.failover.eligibleClasses.includes(evidence.class);
if (!eligible) {
  process.stderr.write(`provider supervisor: ineligible failure ${evidence.class}\n`);
  process.exit(3);
}

const threshold = policy.failover.maxConsecutiveFailuresByClass[evidence.class]
  ?? policy.failover.maxConsecutiveFailuresByClass.DEFAULT;
const streak = (state.streaks[evidence.class] ?? 0) + 1;
state.streaks = { [evidence.class]: streak };
if (streak < threshold) {
  writeState(state);
  process.stderr.write(`provider supervisor: ${evidence.class} streak ${streak}/${threshold}\n`);
  process.exit(3);
}

const currentIndex = policy.candidates.findIndex((item) => item.ordinal === state.activeOrdinal);
const next = policy.candidates[currentIndex + 1];
const transitionsUsed = state.transitions.length;
if (next !== undefined && transitionsUsed < policy.failover.maxTransitions) {
  state.degraded = [...new Set([...state.degraded, candidate.provider])];
  state.transitions = [...state.transitions, {
    sequence: transitionsUsed + 1,
    from: candidate.provider,
    to: next.provider,
    triggerClass: evidence.class,
    at: new Date().toISOString(),
  }];
  state.activeOrdinal = next.ordinal;
  state.streaks = {};
  writeState(state);
  process.stderr.write(`provider supervisor: failover ${candidate.provider} -> ${next.provider} (${evidence.class})\n`);
} else {
  state.degraded = [...new Set([...state.degraded, candidate.provider])];
  state.exhausted = true;
  writeState(state);
  process.stderr.write('provider supervisor: policy exhausted\n');
}
process.exit(3);
