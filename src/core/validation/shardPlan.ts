// Validation shard planning (F-PERF-3).
//
// The plan is a deterministic partition of the authoritative test universe
// into concurrently executable shards plus one exclusive group. It exists so
// that "run independent work concurrently" is a mechanically checkable claim
// rather than a scheduling preference:
//
//   - the partition is a pure function of the sorted universe and the
//     declared execution classes;
//   - every file appears exactly once (union and disjointness are verified,
//     not assumed);
//   - `SERIAL_REQUIRED` and `MUTATION_CAMPAIGN_EXCLUSIVE` files never share a
//     concurrent window with anything else, so two Git-mutating or guarded-
//     source-mutating tests can never overlap;
//   - the parallel shard count and per-invocation argv bound are inputs, so
//     the runner can validate them before execution.
//
// Pure: no filesystem, no clock, no environment, no child process.

import crypto from 'node:crypto';
import type { ExecutionClass } from './executionClasses';

export const VALIDATION_SHARD_PLAN_SCHEMA = 'nightwatch.validation-shard-plan.v1' as const;
export const DEFAULT_PARALLEL_SHARDS = 2;
export const MAX_PARALLEL_SHARDS = 8;
export const MAX_FILES_PER_INVOCATION = 400;

export interface Shard {
  readonly id: string;
  readonly files: readonly string[];
  readonly digest: string;
  readonly byClass: Readonly<Record<string, number>>;
}

export interface ShardPlan {
  readonly schemaVersion: typeof VALIDATION_SHARD_PLAN_SCHEMA;
  readonly universeCount: number;
  readonly universeDigest: string;
  readonly parallelShardCount: number;
  readonly parallelShards: readonly Shard[];
  readonly exclusiveShard: Shard | null;
  readonly planDigest: string;
}

export interface ShardPlanViolation {
  readonly code: string;
  readonly detail: string;
}

function digestOf(values: readonly string[]): string {
  const canonical = [...values].sort().join('\n');
  return `sha256:${crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24)}`;
}

function countByClass(files: readonly string[], classes: Readonly<Record<string, ExecutionClass>>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const file of files) {
    const name = classes[file] ?? 'UNCLASSIFIED';
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
}

/** Validate that every universe file carries a known execution class. */
export function validateShardInputs(input: {
  readonly universe: readonly string[];
  readonly classes: Readonly<Record<string, ExecutionClass>>;
}): { readonly ok: boolean; readonly violations: readonly ShardPlanViolation[] } {
  const violations: ShardPlanViolation[] = [];
  if (input.universe.length === 0) violations.push({ code: 'SHARD_UNIVERSE_EMPTY', detail: 'no files to plan' });
  for (const file of [...new Set(input.universe)].sort()) {
    const declared = input.classes[file];
    if (declared === undefined) {
      violations.push({ code: 'SHARD_CLASS_MISSING', detail: file });
      continue;
    }
    if (!['PARALLEL_SAFE', 'PROCESS_ISOLATED_ONLY', 'SERIAL_REQUIRED', 'MUTATION_CAMPAIGN_EXCLUSIVE'].includes(declared)) {
      violations.push({ code: 'SHARD_CLASS_UNKNOWN', detail: `${file}: ${String(declared)}` });
    }
  }
  for (const file of Object.keys(input.classes).sort()) {
    if (!input.universe.includes(file)) violations.push({ code: 'SHARD_CLASS_DECLARED_MISSING', detail: file });
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Plan the partition. Parallel-eligible files are distributed round-robin over
 * the sorted list so the membership is stable across runs and hosts; exclusive
 * files form one serial shard that must run alone.
 */
export function planShards(input: {
  readonly universe: readonly string[];
  readonly classes: Readonly<Record<string, ExecutionClass>>;
  readonly parallelShardCount?: number;
  readonly maxFilesPerInvocation?: number;
  /** Optional per-file measured durations; enables deterministic duration balancing. */
  readonly weights?: Readonly<Record<string, number>>;
}): ShardPlan {
  const universe = [...new Set(input.universe)].sort();
  const requested = Number.isInteger(input.parallelShardCount) ? (input.parallelShardCount as number) : DEFAULT_PARALLEL_SHARDS;
  if (requested < 1 || requested > MAX_PARALLEL_SHARDS) throw new Error(`SHARD_COUNT_OUT_OF_RANGE:${String(requested)}`);
  const bound = Number.isInteger(input.maxFilesPerInvocation) ? (input.maxFilesPerInvocation as number) : MAX_FILES_PER_INVOCATION;
  const parallelEligible = universe.filter((file) => {
    const declared = input.classes[file];
    return declared === 'PARALLEL_SAFE' || declared === 'PROCESS_ISOLATED_ONLY';
  });
  const exclusive = universe.filter((file) => {
    const declared = input.classes[file];
    return declared === 'SERIAL_REQUIRED' || declared === 'MUTATION_CAMPAIGN_EXCLUSIVE';
  });
  if (parallelEligible.length > requested * bound) {
    throw new Error(`SHARD_ARGV_BOUND_EXCEEDED:${parallelEligible.length}>${requested * bound}`);
  }
  const buckets: string[][] = Array.from({ length: requested }, () => []);
  const weighted = input.weights !== undefined;
  if (weighted) {
    // Deterministic longest-processing-time balancing with a hybrid cost:
    // a measured duration where the weight table has one, and a unit cost
    // otherwise. Treating an unmeasured file as free was a real defect: a
    // partial weight table piled every unmeasured file into one shard. The
    // assignment is stable for a given table (ties by bucket index, then the
    // file order already sorted above), so membership stays reproducible.
    const costOf = (file: string): number => input.weights?.[file] ?? 1;
    const ordered = [...parallelEligible].sort((left, right) => {
      const leftWeight = input.weights?.[left];
      const rightWeight = input.weights?.[right];
      const leftMeasured = typeof leftWeight === 'number' && Number.isFinite(leftWeight);
      const rightMeasured = typeof rightWeight === 'number' && Number.isFinite(rightWeight);
      if (leftMeasured && rightMeasured) return (rightWeight as number) - (leftWeight as number) || left.localeCompare(right);
      if (leftMeasured) return -1;
      if (rightMeasured) return 1;
      return left.localeCompare(right);
    });
    const bucketWeights = Array.from({ length: requested }, () => 0);
    for (const file of ordered) {
      let target = 0;
      for (let index = 1; index < requested; index += 1) {
        if ((bucketWeights[index] ?? 0) < (bucketWeights[target] ?? 0)) target = index;
      }
      const bucket = buckets[target];
      if (bucket !== undefined) bucket.push(file);
      bucketWeights[target] = (bucketWeights[target] ?? 0) + costOf(file);
    }
  } else {
    parallelEligible.forEach((file, index) => {
      const bucket = buckets[index % requested];
      if (bucket !== undefined) bucket.push(file);
    });
  }
  // An empty shard is never planned: executing it would run the entire suite
  // (an empty file selection means "no selector", not "no files").
  const parallelShards: Shard[] = buckets
    .map((files, index) => ({ files: [...files].sort(), id: `shard-${index + 1}` }))
    .filter((bucket) => bucket.files.length > 0)
    .map((bucket) => ({
      id: bucket.id,
      files: bucket.files,
      digest: digestOf(bucket.files),
      byClass: countByClass(bucket.files, input.classes),
    }));
  const exclusiveShard: Shard | null = exclusive.length === 0 ? null : {
    id: 'exclusive',
    files: exclusive,
    digest: digestOf(exclusive),
    byClass: countByClass(exclusive, input.classes),
  };
  const planDigest = digestOf([
    `universe:${digestOf(universe)}`,
    ...parallelShards.map((shard) => `${shard.id}:${shard.digest}`),
    ...(exclusiveShard === null ? [] : [`${exclusiveShard.id}:${exclusiveShard.digest}`]),
  ]);
  return {
    schemaVersion: VALIDATION_SHARD_PLAN_SCHEMA,
    universeCount: universe.length,
    universeDigest: digestOf(universe),
    parallelShardCount: requested,
    parallelShards,
    exclusiveShard,
    planDigest,
  };
}

/** The mechanical coverage proof: union equals the universe, pairwise disjoint. */
export function verifyShardCoverage(input: {
  readonly universe: readonly string[];
  readonly shards: readonly Shard[];
}): { readonly ok: boolean; readonly missing: readonly string[]; readonly duplicated: readonly string[]; readonly unexpected: readonly string[]; readonly universeDigest: string } {
  const universe = [...new Set(input.universe)].sort();
  const universeSet = new Set(universe);
  const seen = new Set<string>();
  const duplicated: string[] = [];
  const unexpected: string[] = [];
  for (const shard of input.shards) {
    for (const file of shard.files) {
      if (seen.has(file)) duplicated.push(file);
      seen.add(file);
      if (!universeSet.has(file)) unexpected.push(file);
    }
  }
  const missing = universe.filter((file) => !seen.has(file));
  return {
    ok: missing.length === 0 && duplicated.length === 0 && unexpected.length === 0,
    missing,
    duplicated,
    unexpected,
    universeDigest: digestOf(universe),
  };
}

/** Parse and bound a worker-count override. Invalid input fails closed. */
export function resolveParallelShardCount(raw: unknown, fallback = DEFAULT_PARALLEL_SHARDS): number | null {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > MAX_PARALLEL_SHARDS) return null;
  return value;
}
