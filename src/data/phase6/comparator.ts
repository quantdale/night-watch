import type {
  ComparisonMode,
  ConsistencyClass,
  DataComparisonResult,
  NormalizedDataResult,
  NumericSemanticContract,
  RuntimePredicate,
} from './types';
import { normalizeRuntimePredicate } from './normalizer';

export interface DataComparisonInput {
  readonly mode: ComparisonMode;
  readonly runtime: RuntimePredicate;
  readonly data: NormalizedDataResult;
  readonly consistencyClass: ConsistencyClass;
  readonly allowedLagMs: number;
  readonly elapsedMs: number;
  readonly scopeComplete: boolean;
  readonly dataChangedDuringCheck?: boolean;
  readonly numericContract?: NumericSemanticContract;
}

export interface DataComparisonOutput {
  readonly comparatorVersion: 'nightwatch.cross-layer-comparator.phase6.v1';
  readonly result: DataComparisonResult;
  readonly independent: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly reason: string;
}

function mismatchResult(runtime: boolean, data: boolean): DataComparisonResult {
  if (runtime && !data) return 'RUNTIME_PRESENT_DATA_MISSING';
  if (!runtime && data) return 'DATA_PRESENT_RUNTIME_MISSING';
  return 'DATA_CONTRADICTS_RUNTIME';
}

function exactArrays(a: readonly string[] | undefined, b: readonly string[]): boolean {
  if (a === undefined) return false;
  return [...a].sort().join('|') === [...b].sort().join('|');
}

function independentClass(consistency: ConsistencyClass): DataComparisonOutput['independent'] {
  if (consistency === 'DIRECT_READ' || consistency === 'SNAPSHOT_MONTHLY' || consistency === 'HISTORICAL_ONLY') return 'HIGH';
  if (consistency === 'DERIVED_SYNCHRONOUS' || consistency === 'DERIVED_ASYNC' || consistency === 'EVENTUALLY_CONSISTENT') return 'MEDIUM';
  return 'LOW';
}

export function compareCrossLayer(input: DataComparisonInput): DataComparisonOutput {
  if (!input.scopeComplete) return { comparatorVersion: 'nightwatch.cross-layer-comparator.phase6.v1', result: 'DATA_SCOPE_AMBIGUOUS', independent: independentClass(input.consistencyClass), reason: 'required runtime scope is incomplete' };
  if (input.dataChangedDuringCheck === true) return { comparatorVersion: 'nightwatch.cross-layer-comparator.phase6.v1', result: 'DATA_CHANGED_DURING_CHECK', independent: independentClass(input.consistencyClass), reason: 'underlying data changed between bounded observations' };
  if ((input.consistencyClass === 'DERIVED_ASYNC' || input.consistencyClass === 'EVENTUALLY_CONSISTENT') && input.elapsedMs < input.allowedLagMs) {
    return { comparatorVersion: 'nightwatch.cross-layer-comparator.phase6.v1', result: 'DATA_TIMING_AMBIGUOUS', independent: independentClass(input.consistencyClass), reason: 'elapsed interval is inside the source-defined consistency window' };
  }
  const runtime = normalizeRuntimePredicate(input.runtime);
  let matches = false;
  switch (input.mode) {
    case 'PRESENCE':
      if (runtime.presence === undefined) return { comparatorVersion: 'nightwatch.cross-layer-comparator.phase6.v1', result: 'DATA_ORACLE_NOT_APPLICABLE', independent: independentClass(input.consistencyClass), reason: 'runtime presence predicate is absent' };
      matches = runtime.presence === input.data.presence;
      if (!matches) return { comparatorVersion: 'nightwatch.cross-layer-comparator.phase6.v1', result: mismatchResult(runtime.presence, input.data.presence), independent: independentClass(input.consistencyClass), reason: 'presence predicate differs' };
      break;
    case 'CARDINALITY':
      if (runtime.cardinality === undefined) return { comparatorVersion: 'nightwatch.cross-layer-comparator.phase6.v1', result: 'DATA_ORACLE_NOT_APPLICABLE', independent: independentClass(input.consistencyClass), reason: 'runtime cardinality predicate is absent' };
      matches = runtime.cardinality === input.data.cardinality;
      break;
    case 'ENUM':
      matches = exactArrays(runtime.enumValues, input.data.enumValues);
      break;
    case 'SCHEMA_SHAPE':
      matches = exactArrays(runtime.fieldNames, input.data.fieldNames);
      break;
    case 'MEMBERSHIP':
      matches = runtime.membershipFingerprint !== undefined && runtime.membershipFingerprint === input.data.membershipFingerprint;
      break;
    case 'NUMERIC':
      if (input.numericContract === undefined || runtime.numeric === undefined || input.data.numeric === undefined) {
        return { comparatorVersion: 'nightwatch.cross-layer-comparator.phase6.v1', result: 'DATA_ORACLE_NOT_APPLICABLE', independent: independentClass(input.consistencyClass), reason: 'numeric semantic contract or normalized numeric predicate is absent' };
      }
      matches = runtime.numeric.sign === input.data.numeric.sign && runtime.numeric.magnitudeClass === input.data.numeric.magnitudeClass;
      break;
  }
  return {
    comparatorVersion: 'nightwatch.cross-layer-comparator.phase6.v1',
    result: matches ? 'DATA_CORROBORATES_RUNTIME' : 'DATA_CONTRADICTS_RUNTIME',
    independent: independentClass(input.consistencyClass),
    reason: matches ? 'approved predicate matches normalized datastore metadata' : 'approved predicate differs from normalized datastore metadata',
  };
}
