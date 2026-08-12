import crypto from 'node:crypto';
import type {
  DataOracleSpec,
  NormalizedDataResult,
  RawDataResult,
  RuntimePredicate,
  SanitizedDataEvidence,
} from './types';

export interface NormalizationOptions {
  readonly enumField?: string;
  readonly allowedEnumValues?: readonly string[];
  readonly membershipField?: string;
  readonly numericField?: string;
  readonly runLocalSalt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shapeFingerprint(fieldNames: readonly string[]): string {
  return `shape:sha256:${crypto.createHash('sha256').update(JSON.stringify([...fieldNames].sort()), 'utf8').digest('hex').slice(0, 24)}`;
}

function cardinality(rowCount: number): NormalizedDataResult['cardinality'] {
  return rowCount === 0 ? 'ZERO' : rowCount === 1 ? 'ONE' : 'MANY';
}

function numericSummary(rows: readonly Record<string, unknown>[], field: string): NonNullable<NormalizedDataResult['numeric']> {
  let sign: NonNullable<NormalizedDataResult['numeric']>['sign'] = 'UNKNOWN';
  let magnitudeClass: NonNullable<NormalizedDataResult['numeric']>['magnitudeClass'] = 'UNKNOWN';
  const value = rows.find((row) => typeof row[field] === 'number')?.[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) return { sign, magnitudeClass };
  sign = value < 0 ? 'NEGATIVE' : value > 0 ? 'POSITIVE' : 'ZERO';
  const magnitude = Math.abs(value);
  magnitudeClass = magnitude === 0 ? 'NONE' : magnitude < 1 ? 'SMALL' : magnitude < 1000 ? 'MEDIUM' : 'LARGE';
  return { sign, magnitudeClass };
}

export function createRunLocalSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function normalizeDataResult(raw: RawDataResult, options: NormalizationOptions = {}): NormalizedDataResult {
  if (raw.rows.length > 1000) throw new Error('QUERY_CARDINALITY_EXCEEDED_EXPECTATION');
  if (raw.bytes > 4 * 1024 * 1024) throw new Error('QUERY_RESULT_BYTES_EXCEEDED');
  const records = raw.rows.filter(isRecord);
  const fields = [...new Set(records.flatMap((row) => Object.keys(row).filter((key) => /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key))))].sort();
  const enumValues = options.enumField === undefined || options.allowedEnumValues === undefined
    ? []
    : [...new Set(records
      .map((row) => row[options.enumField!])
      .filter((value): value is string => typeof value === 'string' && options.allowedEnumValues!.includes(value)))].sort();
  let membershipFingerprint: string | undefined;
  if (options.membershipField !== undefined && options.runLocalSalt !== undefined) {
    const ids = records
      .map((row) => row[options.membershipField!])
      .filter((value): value is string => typeof value === 'string')
      .sort();
    membershipFingerprint = crypto.createHash('sha256').update(`${options.runLocalSalt}|${JSON.stringify(ids)}`, 'utf8').digest('hex');
  }
  return {
    normalizerVersion: 'nightwatch.data-normalizer.phase6.v1',
    cardinality: cardinality(raw.rows.length),
    presence: raw.rows.length > 0,
    fieldNames: fields,
    enumValues,
    shapeFingerprint: shapeFingerprint(fields),
    ...(membershipFingerprint === undefined ? {} : { membershipFingerprint }),
    ...(options.numericField === undefined ? {} : { numeric: numericSummary(records, options.numericField) }),
  };
}

export function normalizeRuntimePredicate(input: RuntimePredicate): RuntimePredicate {
  return {
    ...(input.presence === undefined ? {} : { presence: input.presence }),
    ...(input.cardinality === undefined ? {} : { cardinality: input.cardinality }),
    ...(input.enumValues === undefined ? {} : { enumValues: [...new Set(input.enumValues)].sort() }),
    ...(input.fieldNames === undefined ? {} : { fieldNames: [...new Set(input.fieldNames)].sort() }),
    ...(input.membershipFingerprint === undefined ? {} : { membershipFingerprint: input.membershipFingerprint }),
    ...(input.numeric === undefined ? {} : { numeric: input.numeric }),
  };
}

export function createSanitizedDataEvidence(args: {
  readonly evidenceId: string;
  readonly oracle: DataOracleSpec;
  readonly runtimeRunId: string;
  readonly apiOperationId?: string;
  readonly journeyId?: string;
  readonly environmentClass: SanitizedDataEvidence['environmentClass'];
  readonly queryPlanId: string;
  readonly result: NormalizedDataResult;
  readonly comparisonResult: SanitizedDataEvidence['comparisonResult'];
  readonly queryTimingClass: SanitizedDataEvidence['queryTimingClass'];
  readonly safetyResult: SanitizedDataEvidence['safetyResult'];
  readonly evidenceLevel: SanitizedDataEvidence['evidenceLevel'];
}): SanitizedDataEvidence {
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(args.evidenceId) || !/^[A-Za-z0-9._-]{1,120}$/.test(args.runtimeRunId)) throw new Error('EVIDENCE_ID_INVALID');
  const derivedPredicates: Record<string, boolean | string> = {
    presence: args.result.presence,
    cardinality: args.result.cardinality,
    shape: args.result.shapeFingerprint,
  };
  if (args.result.enumValues.length > 0) derivedPredicates.enumClass = args.result.enumValues.join('|');
  if (args.result.numeric !== undefined) {
    derivedPredicates.numericSign = args.result.numeric.sign;
    derivedPredicates.numericMagnitudeClass = args.result.numeric.magnitudeClass;
  }
  return {
    evidenceSchemaVersion: 'nightwatch.data-evidence.phase6.v1',
    evidenceId: args.evidenceId,
    oracleId: args.oracle.oracleId,
    runtimeRunId: args.runtimeRunId,
    ...(args.apiOperationId === undefined ? {} : { apiOperationId: args.apiOperationId }),
    ...(args.journeyId === undefined ? {} : { journeyId: args.journeyId }),
    datastore: args.oracle.datastore,
    queryPlanId: args.queryPlanId,
    queryPlanVersion: 'nightwatch.readonly-query-plan.phase6.v1',
    sourceProvenance: args.oracle.sourceLineage,
    environmentClass: args.environmentClass,
    resultCardinality: args.result.cardinality,
    derivedPredicates,
    comparisonResult: args.comparisonResult,
    consistencyClass: args.oracle.consistencyClass,
    queryTimingClass: args.queryTimingClass,
    safetyResult: args.safetyResult,
    privacyResult: 'PASS',
    evidenceLevel: args.evidenceLevel,
    rawRowsPersisted: false,
  };
}

export function privacyScanEvidence(value: unknown, forbiddenValues: readonly string[]): void {
  const serialized = JSON.stringify(value);
  for (const forbidden of forbiddenValues) {
    if (forbidden !== '' && serialized.includes(forbidden)) throw new Error('PRIVACY_SENTINEL_LEAK');
  }
}
