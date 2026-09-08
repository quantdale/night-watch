// ---------------------------------------------------------------------------
// W10 M7 — deterministic fixed-corpus yield benchmark.
//
// WHAT THIS IS
// A pure evaluator that replays one fixed fabricated corpus through two
// selection policies and reports the frozen `W10YieldMetrics` for each:
//
// - `BASELINE` reproduces the W9 behaviour: a plain prefix of the
//   `(repository, relativePath)` ordering, with no capability annotation.
//   This is what the reasoner saw before capability existed.
// - `FINAL` uses `selectDiverseSourceIndex` with `readinessByPath` populated
//   via `projectDiscovery`, i.e. the W10 capability-aware surface.
//
// WHY THE SIMULATION LOOP IS SHAPED THIS WAY
// A benchmark that let the aware policy attempt more reproductions could
// "prove" improvement from activity volume. The attempt loop is therefore
// identical for both policies: walk the visible window in order and attempt
// at most `maxAttempts` (default 7, the W9 terminal-campaign reference).
// Only the window contents differ, so any yield delta is a selection effect.
//
// WHAT COUNTS AS WHAT
// - An attempt against a `NOT_EXECUTABLE`/`UNKNOWN` entry is refused before
//   execution and counts as `NOT_AVAILABLE` — the W9 waste class.
// - An attempt against an `EXECUTABLE_NOW` entry executes its scripted
//   outcome. Only a repeated assertion failure with two matching fresh
//   fingerprints counts as qualifying, which keeps the W9 proof bar
//   (two matching fresh assertion failures) intact inside the simulation.
// - `attemptsToFirstExecutableReproduction` is the 1-based attempt ordinal of
//   the first executed attempt, with cumulative execution calls beside it.
//   A policy that never executes reports null for both.
//
// AUTHORITY BOUNDARY
// The corpus `hidden` field carries benchmark truth (expected fingerprints,
// verdicts, audit stderr). It is accepted so the corpus is self-describing
// and then NEVER read by the evaluator: no hidden value reaches the
// reasoner-visible entries, the attempt records, or the metrics. Likewise
// the `injected` field carries adversarial metadata that the evaluator never
// consults — projection goes through `projectDiscovery` alone, so an
// injected capability claim cannot mint a field.
//
// Pure data. No fs/network/process/clock authority in this module.
// ---------------------------------------------------------------------------

import {
  SURFACE_CAPS,
  W10_YIELD_METRICS_VERSION,
  projectDiscovery,
  type ReproductionSurfaceEntry,
  type SurfaceRefusalClass,
  type W10YieldMetrics,
} from './contracts';
import { selectDiverseSourceIndex } from './selection';
import type {
  OwnerLocalAttemptDisposition,
  OwnerLocalTargetDiscovery,
} from '../ownerLocalReproduction/contracts';

/** The two selection policies under comparison. */
export const BENCHMARK_POLICIES = ['BASELINE', 'FINAL'] as const;
export type BenchmarkPolicy = (typeof BENCHMARK_POLICIES)[number];

/** Default visible-window ceiling: the reasoner-turn cap. */
export const BENCHMARK_WINDOW_LIMIT = SURFACE_CAPS.entries;
/** Default attempt budget: the W9 terminal-campaign reference (7 attempts). */
export const BENCHMARK_ATTEMPT_BUDGET = 7;
/** Hard ceiling on corpus size; evaluation never ingests an unbounded list. */
export const MAX_BENCHMARK_CORPUS_CASES = 1024;

/**
 * Scripted execution for one attempt against a corpus case.
 *
 * `REFUSED` is the only script a deterministically unsupported or blocked
 * case may carry: there is no execution to script. Every other script
 * describes what a disposable execution of an executable target returns,
 * including how many discrete executor calls the attempt consumes.
 */
export type BenchmarkExecutionScript =
  | { readonly kind: 'REFUSED' }
  | {
      readonly kind: 'REPEATED_ASSERTION_FAILURE';
      readonly firstFingerprint: string;
      readonly secondFingerprint: string;
      readonly calls: number;
    }
  | { readonly kind: 'PASSING'; readonly calls: number }
  | { readonly kind: 'BUILD_FAILURE'; readonly calls: number }
  | { readonly kind: 'TIMEOUT'; readonly calls: number }
  | {
      readonly kind: 'TRANSIENT_WITH_RETRY';
      readonly calls: number;
      readonly retriesRemaining: number;
    };

/**
 * Hidden benchmark truth. Accepted on the case so the corpus documents its
 * own oracle, then never read by the evaluator. Must never reach anything
 * a reasoner would see.
 */
export interface BenchmarkHiddenTruth {
  readonly expectedFingerprint: string;
  readonly benchmarkVerdict: string;
  readonly auditStderr: string;
}

/**
 * Adversarial metadata smuggled inside a case: capability claims and
 * free-text instructions. The evaluator never consults this field, so it
 * can neither mint a surface field nor move a metric.
 */
export interface BenchmarkInjectedMetadata {
  readonly readiness: string;
  readonly executorClass: string | null;
  readonly targetId: string | null;
  readonly refusal: string | null;
  readonly instruction: string;
}

/** One frozen fabricated corpus case. Relative paths only, never absolute. */
export interface BenchmarkCorpusCase {
  readonly id: string;
  readonly repository: string;
  readonly relativePath: string;
  readonly discovery: OwnerLocalTargetDiscovery;
  readonly script: BenchmarkExecutionScript;
  readonly hidden?: BenchmarkHiddenTruth;
  readonly injected?: BenchmarkInjectedMetadata;
}

export interface BenchmarkInput {
  /** Frozen fabricated corpus. Order is irrelevant; evaluation sorts. */
  readonly cases: readonly BenchmarkCorpusCase[];
  readonly policy: BenchmarkPolicy;
  /** Visible-window ceiling; defaults to the reasoner-turn cap. */
  readonly windowLimit?: number;
  /** Attempt budget; defaults to the W9 reference of 7. */
  readonly maxAttempts?: number;
}

/** One simulated reproduction attempt, in attempt order. */
export interface BenchmarkAttempt {
  readonly caseId: string;
  readonly sourcePath: string;
  readonly repository: string;
  readonly readiness: ReproductionSurfaceEntry['readiness'];
  /** False when refused before execution (`NOT_AVAILABLE`). */
  readonly executed: boolean;
  /** True only for two matching fresh assertion failures. */
  readonly qualifying: boolean;
  readonly disposition: OwnerLocalAttemptDisposition;
  /** Discrete executor calls consumed by this attempt. */
  readonly calls: number;
  /** Present only for refused attempts. */
  readonly refusal: SurfaceRefusalClass | null;
}

export interface BenchmarkResult {
  readonly policy: BenchmarkPolicy;
  /** Reasoner-visible window, in the order the reasoner would see it. */
  readonly visibleEntries: readonly ReproductionSurfaceEntry[];
  /** Simulated attempts, in attempt order. */
  readonly attempts: readonly BenchmarkAttempt[];
  readonly metrics: W10YieldMetrics;
}

/**
 * Deterministic `(repository, relativePath)` ordering by UTF-16 code unit —
 * deliberately not locale-sensitive, so every machine sorts identically.
 */
function compareSourceOrder(
  a: { readonly repository: string; readonly relativePath: string },
  b: { readonly repository: string; readonly relativePath: string },
): number {
  if (a.repository < b.repository) return -1;
  if (a.repository > b.repository) return 1;
  if (a.relativePath < b.relativePath) return -1;
  if (a.relativePath > b.relativePath) return 1;
  return 0;
}

function isSafeCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

interface ValidatedCase {
  readonly id: string;
  readonly repository: string;
  readonly relativePath: string;
  readonly sourcePath: string;
  readonly entry: ReproductionSurfaceEntry;
  readonly script: BenchmarkExecutionScript;
}

/** Fail closed on malformed corpus input: a frozen corpus must be exact. */
function validateCases(cases: readonly BenchmarkCorpusCase[]): ValidatedCase[] {
  if (!Array.isArray(cases)) {
    throw new TypeError('benchmark cases must be an array');
  }
  if (cases.length === 0) {
    throw new TypeError('benchmark cases must not be empty');
  }
  if (cases.length > MAX_BENCHMARK_CORPUS_CASES) {
    throw new TypeError(
      `benchmark cases exceed the hard cap of ${MAX_BENCHMARK_CORPUS_CASES}`,
    );
  }
  const seen = new Set<string>();
  const validated: ValidatedCase[] = [];
  for (const candidate of cases) {
    if (
      candidate === null ||
      typeof candidate !== 'object' ||
      typeof candidate.id !== 'string' ||
      candidate.id.length === 0 ||
      typeof candidate.repository !== 'string' ||
      candidate.repository.length === 0 ||
      typeof candidate.relativePath !== 'string' ||
      candidate.relativePath.length === 0
    ) {
      throw new TypeError('benchmark case carries a malformed identity');
    }
    if (
      candidate.relativePath.startsWith('/') ||
      candidate.relativePath.includes('\\') ||
      candidate.relativePath.split('/').includes('..')
    ) {
      throw new TypeError(
        `benchmark case ${candidate.id} carries a non-relative source path`,
      );
    }
    if (candidate.discovery === null || typeof candidate.discovery !== 'object') {
      throw new TypeError(`benchmark case ${candidate.id} lacks a discovery`);
    }
    const sourcePath = `${candidate.repository}:${candidate.relativePath}`;
    if (seen.has(sourcePath)) {
      throw new TypeError(`benchmark corpus repeats source path ${sourcePath}`);
    }
    seen.add(sourcePath);
    validateScript(candidate.id, candidate.script);
    const entry = projectDiscovery(sourcePath, candidate.discovery);
    const executable = entry.readiness === 'EXECUTABLE_NOW';
    if (executable && candidate.script.kind === 'REFUSED') {
      throw new TypeError(
        `benchmark case ${candidate.id} is executable but scripts a refusal`,
      );
    }
    if (!executable && candidate.script.kind !== 'REFUSED') {
      throw new TypeError(
        `benchmark case ${candidate.id} is not executable but scripts an execution`,
      );
    }
    validated.push({
      id: candidate.id,
      repository: candidate.repository,
      relativePath: candidate.relativePath,
      sourcePath,
      entry,
      script: candidate.script,
    });
  }
  validated.sort(compareSourceOrder);
  return validated;
}

function validateScript(id: string, script: BenchmarkExecutionScript): void {
  if (script === null || typeof script !== 'object') {
    throw new TypeError(`benchmark case ${id} lacks an execution script`);
  }
  switch (script.kind) {
    case 'REFUSED':
      return;
    case 'REPEATED_ASSERTION_FAILURE':
      if (
        typeof script.firstFingerprint !== 'string' ||
        typeof script.secondFingerprint !== 'string'
      ) {
        throw new TypeError(
          `benchmark case ${id} carries a malformed assertion script`,
        );
      }
      if (!isSafeCount(script.calls) || script.calls < 1) {
        throw new TypeError(
          `benchmark case ${id} carries a malformed call count`,
        );
      }
      return;
    case 'PASSING':
    case 'BUILD_FAILURE':
    case 'TIMEOUT':
      if (!isSafeCount(script.calls) || script.calls < 1) {
        throw new TypeError(
          `benchmark case ${id} carries a malformed call count`,
        );
      }
      return;
    case 'TRANSIENT_WITH_RETRY':
      if (!isSafeCount(script.calls) || script.calls < 1) {
        throw new TypeError(
          `benchmark case ${id} carries a malformed call count`,
        );
      }
      if (!isSafeCount(script.retriesRemaining)) {
        throw new TypeError(
          `benchmark case ${id} carries a malformed retry budget`,
        );
      }
      return;
    default:
      throw new TypeError(`benchmark case ${id} carries an unknown script`);
  }
}

function simulateAttempt(candidate: ValidatedCase): BenchmarkAttempt {
  const base = {
    caseId: candidate.id,
    sourcePath: candidate.sourcePath,
    repository: candidate.repository,
    readiness: candidate.entry.readiness,
    refusal: candidate.entry.refusal,
  } as const;
  if (candidate.entry.readiness !== 'EXECUTABLE_NOW') {
    return {
      ...base,
      executed: false,
      qualifying: false,
      disposition:
        candidate.entry.refusal === 'ENVIRONMENT_BLOCKED'
          ? 'ENVIRONMENT_BLOCKED'
          : 'DETERMINISTIC_TERMINAL',
      calls: 0,
    };
  }
  const script = candidate.script;
  switch (script.kind) {
    case 'REFUSED':
      // Unreachable: validation rejects executable cases with refusal
      // scripts. Failing closed here keeps the invariant local.
      throw new TypeError(
        `benchmark case ${candidate.id} reached execution with a refusal script`,
      );
    case 'REPEATED_ASSERTION_FAILURE': {
      const qualifying =
        script.firstFingerprint.length > 0 &&
        script.firstFingerprint === script.secondFingerprint;
      return {
        ...base,
        executed: true,
        qualifying,
        disposition: 'DETERMINISTIC_TERMINAL',
        calls: script.calls,
      };
    }
    case 'TRANSIENT_WITH_RETRY':
      return {
        ...base,
        executed: true,
        qualifying: false,
        disposition: 'TRANSIENT_RETRYABLE',
        calls: script.calls,
      };
    case 'PASSING':
    case 'BUILD_FAILURE':
    case 'TIMEOUT':
      return {
        ...base,
        executed: true,
        qualifying: false,
        disposition: 'DETERMINISTIC_TERMINAL',
        calls: script.calls,
      };
  }
}

/**
 * Evaluate one policy against the corpus. Pure: the output is a function of
 * the input alone — no filesystem, network, subprocess or clock reads.
 */
export function evaluateBenchmark(input: BenchmarkInput): BenchmarkResult {
  if (input === null || typeof input !== 'object') {
    throw new TypeError('benchmark input must be an object');
  }
  if (input.policy !== 'BASELINE' && input.policy !== 'FINAL') {
    throw new TypeError('benchmark policy must be BASELINE or FINAL');
  }
  const validated = validateCases(input.cases);
  // Omitted limits take the documented defaults; malformed limits fail
  // closed to an empty run rather than an unbounded one.
  const windowLimit =
    input.windowLimit === undefined
      ? BENCHMARK_WINDOW_LIMIT
      : isSafeCount(input.windowLimit) && input.windowLimit > 0
        ? Math.min(input.windowLimit, SURFACE_CAPS.entries)
        : 0;
  const maxAttempts =
    input.maxAttempts === undefined
      ? BENCHMARK_ATTEMPT_BUDGET
      : isSafeCount(input.maxAttempts) && input.maxAttempts > 0
        ? input.maxAttempts
        : 0;

  const bySourcePath: Record<string, ValidatedCase> = {};
  for (const candidate of validated) bySourcePath[candidate.sourcePath] = candidate;

  const visible: ValidatedCase[] =
    input.policy === 'BASELINE'
      ? validated.slice(0, windowLimit)
      : selectDiverseSourceIndex({
          entries: validated.map((candidate) => ({
            path: candidate.sourcePath,
            repository: candidate.repository,
          })),
          limit: windowLimit,
          readinessByPath: new Map(
            validated.map((candidate) => [candidate.sourcePath, candidate.entry]),
          ),
        }).entries.map((selected) => {
          const match = bySourcePath[selected.path];
          if (match === undefined) {
            throw new TypeError(`benchmark selection returned an unknown path`);
          }
          return match;
        });

  const attempts: BenchmarkAttempt[] = [];
  for (const candidate of visible) {
    if (attempts.length >= maxAttempts) break;
    attempts.push(simulateAttempt(candidate));
  }

  const visibleEntries = Object.freeze(visible.map((candidate) => candidate.entry));
  const repositories = new Set<string>();
  for (const candidate of visible) repositories.add(candidate.repository);
  const executableVisible = visible.filter(
    (candidate) => candidate.entry.readiness === 'EXECUTABLE_NOW',
  );
  const executableTargets = new Set<string>();
  for (const candidate of executableVisible) {
    if (candidate.entry.targetId !== null) {
      executableTargets.add(candidate.entry.targetId);
    }
  }

  let executableTargetAttempts = 0;
  let notAvailableAttempts = 0;
  let repeatedUnsupportedAttempts = 0;
  let qualifyingReproductions = 0;
  let attemptsToFirst: number | null = null;
  let callsToFirst: number | null = null;
  let callsSoFar = 0;
  const seenRefusals = new Set<SurfaceRefusalClass>();
  attempts.forEach((attempt, index) => {
    callsSoFar += attempt.calls;
    if (attempt.executed) {
      executableTargetAttempts += 1;
      if (attemptsToFirst === null) {
        attemptsToFirst = index + 1;
        callsToFirst = callsSoFar;
      }
      if (attempt.qualifying) qualifyingReproductions += 1;
      return;
    }
    notAvailableAttempts += 1;
    if (attempt.refusal !== null) {
      if (seenRefusals.has(attempt.refusal)) repeatedUnsupportedAttempts += 1;
      else seenRefusals.add(attempt.refusal);
    }
  });

  return {
    policy: input.policy,
    visibleEntries,
    attempts: Object.freeze(attempts),
    metrics: {
      schemaVersion: W10_YIELD_METRICS_VERSION,
      visibleSources: visible.length,
      visibleExecutableSources: executableVisible.length,
      visibleExecutableTargets: executableTargets.size,
      visibleRepositories: repositories.size,
      reproductionAttempts: attempts.length,
      executableTargetAttempts,
      notAvailableAttempts,
      repeatedUnsupportedAttempts,
      qualifyingReproductions,
      attemptsToFirstExecutableReproduction: attemptsToFirst,
      callsToFirstExecutableReproduction: callsToFirst,
    },
  };
}
