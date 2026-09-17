// ---------------------------------------------------------------------------
// NW-HIST-005 (Wave 1, Phase 1a) — CACHE_KEY_CONTRACT orchestration.
//
// Reads both declared sides through the confined sibling-source boundary
// (injected `RealSourceReader` / `RealSourceCurrentness` — this module never
// touches fs, processes, network, clocks or randomness), extracts bounded key
// shapes with the pure core, and returns a SANITIZED REPORT.
//
// Phase 1a boundary (owner-frozen): a NOT_COVERED row is a report observation
// only. This module emits NO finding, NO semantic oracle DTO, and no new finding
// category; Phase 1b requires a separate authorization. The report contains
// structural shapes and digests only: no raw runtime key values, no customer
// identifiers, no Slack material, no secrets.
//
// Fail-closed source handling: a side whose declared snapshot is unavailable or
// no longer matches the declaration is never judged (SOURCE_UNAVAILABLE /
// SOURCE_STALE), and a changed source requires a fresh declaration rather than
// a silent rebind.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import type { RealSourceCurrentness, RealSourceReader } from '../../oracles/expectations/recipes/types';
import {
  evaluateKeyCoverage,
  extractConsumerKeyShapes,
  extractProducerPatterns,
  type CacheKeyCoverageRow,
  type CacheKeyReasonCode,
  type ExtractedPattern,
  type ExtractedShape,
} from './cacheKeyShapes';
import {
  validateCacheKeyContractConfig,
  type CacheKeyContractConfig,
  type CacheKeyContractDeclaration,
} from './cacheKeyContractValidation';

export const CACHE_KEY_REPORT_SCHEMA = 'nightwatch.cache-key-report.v1' as const;
export const CACHE_KEY_REPORT_NOTE = 'No cache was contacted; no product code was executed.' as const;

export const CACHE_KEY_REPORT_VERDICTS = [
  'COVERED',
  'NOT_COVERED',
  'EXCLUDED_BY_DECLARATION',
  'EXTRACTION_AMBIGUOUS',
  'SOURCE_STALE',
  'SOURCE_UNAVAILABLE',
  'DECLARATION_INVALID',
  'NOT_APPLICABLE',
] as const;
export type CacheKeyReportVerdict = (typeof CACHE_KEY_REPORT_VERDICTS)[number];

export interface CacheKeyProvenance {
  readonly repoId: string;
  readonly sha: string;
  readonly relativePath: string;
  readonly symbol: string;
}

export interface CacheKeyReportRow {
  readonly consumerProvenance: CacheKeyProvenance;
  readonly producerProvenance: CacheKeyProvenance | null;
  readonly consumerShapeDigest: string | null;
  readonly producerPatternDigest: string | null;
  readonly verdict: CacheKeyReportVerdict;
  readonly reasonCode: CacheKeyReasonCode | null;
}

export interface CacheKeyContractReport {
  readonly contractId: string;
  readonly verdict: CacheKeyReportVerdict;
  readonly rows: readonly CacheKeyReportRow[];
}

export interface CacheKeyReport {
  readonly schemaVersion: typeof CACHE_KEY_REPORT_SCHEMA;
  readonly verdict: CacheKeyReportVerdict;
  readonly contracts: readonly CacheKeyContractReport[];
  readonly reportDigest: string;
  readonly note: typeof CACHE_KEY_REPORT_NOTE;
}

interface SideExtraction {
  readonly kind: 'OK';
  readonly shapes: readonly (ExtractedShape & { readonly relativePath: string })[];
  readonly patterns: readonly (ExtractedPattern & { readonly relativePath: string })[];
  readonly ambiguous: readonly { readonly symbol: string; readonly relativePath: string; readonly detail: string }[];
}

type SideResult = SideExtraction | { readonly kind: 'SOURCE_UNAVAILABLE' | 'SOURCE_STALE' };

function readSide(
  side: CacheKeyContractDeclaration['producer'] | CacheKeyContractDeclaration['consumer'],
  contract: CacheKeyContractDeclaration,
  which: 'consumer' | 'producer',
  reader: RealSourceReader,
  currentness: RealSourceCurrentness,
): SideResult {
  const snapshot = currentness.currentSnapshot(side.repoId);
  if (snapshot === null || !/^[0-9a-f]{40}$/.test(snapshot.sha)) return { kind: 'SOURCE_UNAVAILABLE' };
  if (snapshot.sha !== side.sha) return { kind: 'SOURCE_STALE' };
  const sources: { relativePath: string; text: string }[] = [];
  for (const relativePath of side.paths) {
    const text = reader.readFile(side.repoId, relativePath);
    if (text === null) return { kind: 'SOURCE_UNAVAILABLE' };
    sources.push({ relativePath, text });
  }
  const shapes: (ExtractedShape & { relativePath: string })[] = [];
  const patterns: (ExtractedPattern & { relativePath: string })[] = [];
  const ambiguous: { symbol: string; relativePath: string; detail: string }[] = [];
  const foundSymbols = new Set<string>();
  const missing: { symbol: string; relativePath: string }[] = [];
  for (const source of sources) {
    if (which === 'consumer') {
      const extraction = extractConsumerKeyShapes(source.text, { functions: side.functions, namespace: contract.namespace });
      for (const shape of extraction.shapes) shapes.push({ ...shape, relativePath: source.relativePath });
      for (const entry of extraction.ambiguous) {
        if (entry.detail === 'FUNCTION_NOT_FOUND') missing.push({ symbol: entry.symbol, relativePath: source.relativePath });
        else ambiguous.push({ ...entry, relativePath: source.relativePath });
      }
      for (const symbol of side.functions) foundSymbols.add(symbol);
    } else {
      const extraction = extractProducerPatterns(source.text, {
        functions: side.functions,
        namespace: contract.namespace,
        delimiter: contract.delimiter,
        envToken: contract.envMap.producerEnvToken,
      });
      for (const pattern of extraction.patterns) patterns.push({ ...pattern, relativePath: source.relativePath });
      for (const entry of extraction.ambiguous) {
        if (entry.detail === 'FUNCTION_NOT_FOUND') missing.push({ symbol: entry.symbol, relativePath: source.relativePath });
        else ambiguous.push({ ...entry, relativePath: source.relativePath });
      }
      for (const symbol of side.functions) foundSymbols.add(symbol);
    }
  }
  // A symbol missing from every declared path is a declaration/source drift and
  // fails closed; a symbol missing from one path but present in another is not
  // an ambiguity.
  const present = new Set<string>();
  for (const shape of shapes) present.add(shape.symbol);
  for (const pattern of patterns) present.add(pattern.symbol);
  for (const entry of ambiguous) present.add(entry.symbol);
  const trulyMissing = missing.filter((entry) => !present.has(entry.symbol));
  for (const entry of trulyMissing) ambiguous.push({ ...entry, detail: 'FUNCTION_NOT_FOUND' });
  return { kind: 'OK', shapes, patterns, ambiguous };
}

function contractVerdictOf(rows: readonly CacheKeyReportRow[], sideFailure: CacheKeyReportVerdict | null, hasShapes: boolean): CacheKeyReportVerdict {
  if (sideFailure !== null) return sideFailure;
  if (rows.some((row) => row.verdict === 'EXTRACTION_AMBIGUOUS')) return 'EXTRACTION_AMBIGUOUS';
  if (rows.some((row) => row.verdict === 'NOT_COVERED')) return 'NOT_COVERED';
  if (rows.length === 0) return 'NOT_APPLICABLE';
  if (!hasShapes) return 'NOT_APPLICABLE';
  return 'COVERED';
}

function coverageToReportRow(
  row: CacheKeyCoverageRow,
  consumerShape: ExtractedShape & { relativePath: string },
  producerPatterns: readonly (ExtractedPattern & { relativePath: string })[],
  consumerSide: CacheKeyContractDeclaration['consumer'],
  producerSide: CacheKeyContractDeclaration['producer'],
): CacheKeyReportRow {
  const pattern = row.producerPatternDigest === null
    ? null
    : producerPatterns.find((candidate) => candidate.digest === row.producerPatternDigest) ?? null;
  return {
    consumerProvenance: { repoId: consumerSide.repoId, sha: consumerSide.sha, relativePath: consumerShape.relativePath, symbol: consumerShape.symbol },
    producerProvenance: pattern === null || producerSide === null
      ? null
      : { repoId: producerSide.repoId, sha: producerSide.sha, relativePath: pattern.relativePath, symbol: pattern.symbol },
    consumerShapeDigest: row.consumerShapeDigest,
    producerPatternDigest: row.producerPatternDigest,
    verdict: row.verdict,
    reasonCode: row.reasonCode,
  };
}

function runContract(
  contract: CacheKeyContractDeclaration,
  reader: RealSourceReader,
  currentness: RealSourceCurrentness,
): CacheKeyContractReport {
  const consumerSide = readSide(contract.consumer, contract, 'consumer', reader, currentness);
  const producerSide = readSide(contract.producer, contract, 'producer', reader, currentness);
  if (consumerSide.kind !== 'OK') return { contractId: contract.contractId, verdict: consumerSide.kind, rows: [] };
  if (producerSide.kind !== 'OK') return { contractId: contract.contractId, verdict: producerSide.kind, rows: [] };

  const rows: CacheKeyReportRow[] = [];
  for (const entry of [...consumerSide.ambiguous, ...producerSide.ambiguous].sort((left, right) => (
    `${left.symbol}:${left.relativePath}:${left.detail}` < `${right.symbol}:${right.relativePath}:${right.detail}` ? -1 : 1
  ))) {
    const byConsumer = consumerSide.ambiguous.includes(entry);
    rows.push({
      consumerProvenance: {
        repoId: byConsumer ? contract.consumer.repoId : contract.producer.repoId,
        sha: byConsumer ? contract.consumer.sha : contract.producer.sha,
        relativePath: entry.relativePath,
        symbol: entry.symbol,
      },
      producerProvenance: null,
      consumerShapeDigest: null,
      producerPatternDigest: null,
      verdict: 'EXTRACTION_AMBIGUOUS',
      reasonCode: null,
    });
  }

  const shapes = [...consumerSide.shapes].sort((left, right) => (
    left.digest < right.digest ? -1 : left.digest > right.digest ? 1 : (left.relativePath < right.relativePath ? -1 : 1)
  ));
  const patterns = [...producerSide.patterns].sort((left, right) => (left.digest < right.digest ? -1 : left.digest > right.digest ? 1 : 0));
  const coverage = evaluateKeyCoverage({ shapes, patterns, envMap: contract.envMap, exclusions: contract.exclusions });
  for (const row of coverage) {
    const shape = shapes.find((candidate) => candidate.digest === row.consumerShapeDigest);
    if (shape === undefined) continue;
    rows.push(coverageToReportRow(row, shape, patterns, contract.consumer, contract.producer));
  }
  rows.sort((left, right) => {
    const leftKey = `${left.consumerShapeDigest ?? '~'}:${left.verdict}:${left.consumerProvenance.symbol}`;
    const rightKey = `${right.consumerShapeDigest ?? '~'}:${right.verdict}:${right.consumerProvenance.symbol}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });

  const verdict = contractVerdictOf(rows, null, consumerSide.shapes.length > 0);
  return { contractId: contract.contractId, verdict, rows };
}

const VERDICT_PRIORITY: readonly CacheKeyReportVerdict[] = [
  'DECLARATION_INVALID',
  'SOURCE_UNAVAILABLE',
  'SOURCE_STALE',
  'EXTRACTION_AMBIGUOUS',
  'NOT_COVERED',
  'NOT_APPLICABLE',
  'COVERED',
];

function worstVerdict(verdicts: readonly CacheKeyReportVerdict[]): CacheKeyReportVerdict {
  for (const verdict of VERDICT_PRIORITY) {
    if (verdicts.includes(verdict)) return verdict;
  }
  return 'NOT_APPLICABLE';
}

/** Run the declared contracts over injected read-only source access. */
export function runCacheKeyContract(input: {
  readonly config: unknown;
  readonly reader: RealSourceReader;
  readonly currentness: RealSourceCurrentness;
}): CacheKeyReport {
  const validation = validateCacheKeyContractConfig(input.config);
  if (!validation.ok) {
    const report = {
      schemaVersion: CACHE_KEY_REPORT_SCHEMA,
      verdict: 'DECLARATION_INVALID' as const,
      contracts: [] as readonly CacheKeyContractReport[],
      note: CACHE_KEY_REPORT_NOTE,
    };
    return { ...report, reportDigest: prefixedDigest24('ckr', report) };
  }
  const config: CacheKeyContractConfig = validation.config;
  const contracts = config.contracts.map((contract) => runContract(contract, input.reader, input.currentness));
  const report = {
    schemaVersion: CACHE_KEY_REPORT_SCHEMA,
    verdict: worstVerdict(contracts.map((contract) => contract.verdict)),
    contracts,
    note: CACHE_KEY_REPORT_NOTE,
  };
  return { ...report, reportDigest: prefixedDigest24('ckr', report) };
}
