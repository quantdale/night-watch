// ---------------------------------------------------------------------------
// Nightwatch — bounded read-only proof-family discovery.
//
// This is an investigation projection, not a mutability authority. It uses
// the existing confined source reader and a bounded PHP declaration scan to
// count current patterns. It never promotes a pattern, infers safety from
// names or HTTP verbs, or retains source text/literal values.
// ---------------------------------------------------------------------------

import { safeSemanticDigest } from '../semanticCoverage/types';
import { buildPhase24CandidatePortfolio } from '../phase24/portfolio';
import { sourceContentDigest } from './scanTypes';
import type { SourceSurfaceDiscovery } from './surfaces';
import type { SiblingSourceAccess } from './siblingSource';
import { findFunctionBody, tokenizePhp, type PhpToken } from '../../oracles/expectations/extract/php';

export const REAL_SOURCE_READONLY_CANDIDATE_CENSUS_VERSION = 'nightwatch.real-source-readonly-candidate-census.v1' as const;
export const MAX_READONLY_CANDIDATE_EXAMPLES = 16;
export const MAX_READONLY_CANDIDATE_HANDLER_FILES = 128;
export const MAX_READONLY_CANDIDATE_HANDLER_BYTES = 400_000;
export const MAX_READONLY_CANDIDATE_TOTAL_HANDLER_BYTES = 4_000_000;
export const MAX_READONLY_CANDIDATE_TOTAL_TOKENS = 500_000;
export const MAX_READONLY_CANDIDATE_TOTAL_DECLARATIONS = 4_096;

export type ReadOnlyCandidateFamily =
  | 'DIRECT_PURE_RETURN_HANDLER'
  | 'EXACT_BOUNDED_DECLARATION_CONE'
  | 'KNOWN_READ_DECLARATION_REGISTRY'
  | 'HTTP_GET_ONLY_NEGATIVE_CONTROL';

export type ReadOnlyCandidateAdmission =
  | 'NOT_ADMITTED_NO_READ_EVIDENCE'
  | 'NOT_ADMITTED_NO_CURRENT_PROOF'
  | 'BASELINE_AUTHORITY_NOT_NEW'
  | 'NEGATIVE_CONTROL_ONLY';

export interface ReadOnlyCandidateFamilyMeasurement {
  readonly family: ReadOnlyCandidateFamily;
  readonly population: number;
  readonly mechanicallyCompletePopulation: number;
  readonly positiveReadEvidencePopulation: number;
  readonly currentPhase24EligiblePopulation: number;
  readonly readOnlyOnlyBlockerPopulation: number;
  readonly likelyPhase24UnlockPopulation: number;
  readonly declarationAmbiguityPopulation: number;
  readonly dependencyDeclarationPopulation: number;
  readonly exampleSurfaceIds: readonly string[];
  readonly exampleDigest: string;
  readonly rejectionCounts: readonly { readonly code: string; readonly count: number }[];
  readonly dependencyDepth: number;
  readonly proofCost: 'LOW' | 'BOUNDED' | 'EXACT_REGISTRY';
  readonly falsePositiveRisk: 'LOW_SIDE_EFFECT_RISK' | 'HIGH_WITHOUT_EFFECT_REGISTRY' | 'NONE_BASELINE';
  readonly admission: ReadOnlyCandidateAdmission;
}

export interface ReadOnlyCandidateCensus {
  readonly schemaVersion: typeof REAL_SOURCE_READONLY_CANDIDATE_CENSUS_VERSION;
  readonly sourceSnapshotDigest: string;
  readonly sourceSurfaceDigest: string;
  readonly familyMeasurements: readonly ReadOnlyCandidateFamilyMeasurement[];
  readonly handlerPopulation: number;
  readonly getPopulation: number;
  readonly responseFlowAttempts: number;
  readonly responseFlowProven: number;
  readonly responseFlowRejected: number;
  readonly handlerAnalysisMetrics: ReadOnlyCandidateHandlerMetrics;
  readonly deterministicDigest: string;
}

interface IndexedBody {
  readonly start: number;
  readonly end: number;
  readonly tokens: readonly PhpToken[];
}

export interface ReadOnlyCandidateHandlerMetrics {
  readonly filesConsidered: number;
  readonly filesTokenized: number;
  readonly filesRejected: number;
  readonly totalSourceBytes: number;
  readonly totalTokens: number;
  readonly declarationsConsidered: number;
  readonly maxDeclarationsPerFile: number;
  readonly maxTokens: number;
  readonly maxSourceBytes: number;
}

interface HandlerFileAnalysis {
  readonly status: 'READY' | 'SOURCE_UNAVAILABLE' | 'SOURCE_STALE' | 'SOURCE_IDENTITY_MISMATCH' | 'SOURCE_FILE_AMBIGUOUS' | 'SOURCE_BUDGET_EXCEEDED' | 'LEXICAL_UNSUPPORTED';
  readonly declarations: ReadonlyMap<string, readonly IndexedBody[]>;
}

interface DirectPureResult {
  readonly status: 'PROVEN_PURE_LITERAL' | 'REJECTED';
  readonly rejectionCode: string | null;
}

function countCodes(codes: readonly (string | null)[]): readonly { readonly code: string; readonly count: number }[] {
  const counts = new Map<string, number>();
  for (const code of codes) {
    if (code === null) continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => compareCodeUnits(left.code, right.code));
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function pureLiteralExpression(expression: readonly PhpToken[]): boolean {
  function literalAt(tokens: readonly PhpToken[], index: number): number | null {
    const token = tokens[index];
    if (token === undefined) return null;
    if (token.t === 'STRING' || token.t === 'NUMBER' || (token.t === 'WORD' && ['true', 'false', 'null'].includes(token.v))) return index + 1;
    if (token.t !== 'PUNCT' || token.v !== '[') return null;
    let cursor = index + 1;
    if (tokens[cursor]?.t === 'PUNCT' && tokens[cursor]?.v === ']') return cursor + 1;
    while (cursor < tokens.length) {
      const first = literalAt(tokens, cursor);
      if (first === null) return null;
      cursor = first;
      if (tokens[cursor]?.t === 'OP' && tokens[cursor]?.v === '=>') {
        const value = literalAt(tokens, cursor + 1);
        if (value === null) return null;
        cursor = value;
      }
      if (tokens[cursor]?.t === 'PUNCT' && tokens[cursor]?.v === ']') return cursor + 1;
      if (tokens[cursor]?.t !== 'PUNCT' || tokens[cursor]?.v !== ',') return null;
      cursor += 1;
      if (tokens[cursor]?.t === 'PUNCT' && tokens[cursor]?.v === ']') return cursor + 1;
    }
    return null;
  }
  const end = literalAt(expression, 0);
  return end === expression.length;
}

/** Prove only a body with one top-level literal return and no other tokens. */
function directPureReturn(body: IndexedBody): DirectPureResult {
  const bodyTokens = body.tokens.slice(body.start + 1, body.end);
  let returnIndex = -1;
  let returnCount = 0;
  let semicolon = -1;
  for (let index = 0; index < bodyTokens.length; index += 1) {
    const token = bodyTokens[index]!;
    if (token.t === 'WORD' && token.v === 'return') {
      returnCount += 1;
      returnIndex = index;
      if (returnCount > 1) return { status: 'REJECTED', rejectionCode: 'MULTIPLE_RETURN_SITES' };
      continue;
    }
    if (returnIndex >= 0 && token.t === 'PUNCT' && token.v === ';') {
      semicolon = index;
      break;
    }
  }
  if (returnCount === 0) return { status: 'REJECTED', rejectionCode: 'NO_RETURN_SITE' };
  if (semicolon < 0 || returnIndex < 0) return { status: 'REJECTED', rejectionCode: 'RETURN_TERMINATOR_UNPROVEN' };
  if (bodyTokens.slice(0, returnIndex).length > 0 || bodyTokens.slice(semicolon + 1).length > 0) return { status: 'REJECTED', rejectionCode: 'NON_RETURN_BODY_SYNTAX' };
  const expression = bodyTokens.slice(returnIndex + 1, semicolon);
  if (!pureLiteralExpression(expression)) return { status: 'REJECTED', rejectionCode: 'NON_LITERAL_RETURN_EXPRESSION' };
  return { status: 'PROVEN_PURE_LITERAL', rejectionCode: null };
}

function analysisKey(repoId: string, sourceSha: string, relativePath: string): string {
  return `${repoId}:${sourceSha}:${relativePath}`;
}

function analyzeHandlerFile(input: { readonly access: SiblingSourceAccess; readonly file: SourceSurfaceDiscovery['inventory']['files'][number]; readonly sourceSha: string }): { readonly analysis: HandlerFileAnalysis; readonly metrics: Omit<ReadOnlyCandidateHandlerMetrics, 'filesConsidered' | 'filesRejected' | 'totalSourceBytes' | 'totalTokens'> } {
  const unavailable = (status: HandlerFileAnalysis['status']): { readonly analysis: HandlerFileAnalysis; readonly metrics: Omit<ReadOnlyCandidateHandlerMetrics, 'filesConsidered' | 'filesRejected' | 'totalSourceBytes' | 'totalTokens'> } => ({ analysis: { status, declarations: new Map() }, metrics: { filesTokenized: 0, declarationsConsidered: 0, maxDeclarationsPerFile: 0, maxTokens: 0, maxSourceBytes: 0 } });
  if (input.file.sourceSha !== input.sourceSha) return unavailable('SOURCE_IDENTITY_MISMATCH');
  if (input.file.status !== 'ELIGIBLE') return unavailable(input.file.rejectionReason === 'SOURCE_STALE' ? 'SOURCE_STALE' : 'SOURCE_UNAVAILABLE');
  if (input.file.language !== 'PHP') return unavailable('SOURCE_UNAVAILABLE');
  const sourceText = input.access.reader.readFile(input.file.repoId, input.file.relativePath);
  if (sourceText === null) return unavailable('SOURCE_UNAVAILABLE');
  if (input.file.contentDigest === null || sourceContentDigest(sourceText) !== input.file.contentDigest) return unavailable('SOURCE_STALE');
  const sourceBytes = Buffer.byteLength(sourceText, 'utf8');
  if (sourceBytes > MAX_READONLY_CANDIDATE_HANDLER_BYTES) return unavailable('SOURCE_BUDGET_EXCEEDED');
  let tokens: readonly PhpToken[];
  try {
    tokens = tokenizePhp(sourceText);
  } catch {
    return unavailable('LEXICAL_UNSUPPORTED');
  }
  const declarations = new Map<string, IndexedBody[]>();
  for (let index = 0; index + 1 < tokens.length; index += 1) {
    const token = tokens[index]!;
    const name = tokens[index + 1]!;
    if (token.t !== 'WORD' || token.v !== 'function' || name.t !== 'WORD') continue;
    const body = findFunctionBody(tokens, name.v);
    if (body === null) continue;
    const entries = declarations.get(name.v) ?? [];
    entries.push({ start: body.start, end: body.end, tokens });
    declarations.set(name.v, entries);
  }
  const declarationCount = [...declarations.values()].reduce((count, entries) => count + entries.length, 0);
  return {
    analysis: { status: 'READY', declarations },
    metrics: { filesTokenized: 1, declarationsConsidered: declarationCount, maxDeclarationsPerFile: declarationCount, maxTokens: tokens.length, maxSourceBytes: sourceBytes },
  };
}

function bodyFor(input: { readonly analyses: ReadonlyMap<string, HandlerFileAnalysis>; readonly surface: SourceSurfaceDiscovery['surfaces'][number] }): { readonly body: IndexedBody | null; readonly rejectionCode: string | null } {
  const operation = input.surface.operation;
  if (operation.handlerPath === null || operation.handlerSymbol === null) return { body: null, rejectionCode: 'HANDLER_DECLARATION_UNAVAILABLE' };
  const analysis = input.analyses.get(analysisKey(operation.repository, operation.sourceSha, operation.handlerPath));
  if (analysis === undefined || analysis.status !== 'READY') return { body: null, rejectionCode: `HANDLER_${analysis?.status ?? 'SOURCE_UNAVAILABLE'}` };
  const declarations = analysis.declarations.get(operation.handlerSymbol) ?? [];
  if (declarations.length === 0) return { body: null, rejectionCode: 'HANDLER_SYMBOL_UNAVAILABLE' };
  if (declarations.length !== 1) return { body: null, rejectionCode: 'HANDLER_DECLARATION_AMBIGUOUS' };
  return { body: declarations[0]!, rejectionCode: null };
}

function examples(ids: readonly string[]): { readonly values: readonly string[]; readonly digest: string } {
  const ordered = [...new Set(ids)].sort(compareCodeUnits);
  return { values: ordered.slice(0, MAX_READONLY_CANDIDATE_EXAMPLES), digest: safeSemanticDigest(ordered, 'readonly-candidate-examples') };
}

function measurement(input: Omit<ReadOnlyCandidateFamilyMeasurement, 'exampleSurfaceIds' | 'exampleDigest'> & { readonly exampleIds: readonly string[] }): ReadOnlyCandidateFamilyMeasurement {
  const example = examples(input.exampleIds);
  return { ...input, exampleSurfaceIds: example.values, exampleDigest: example.digest };
}

/** Measure current source patterns without admitting any new proof authority. */
export function buildReadOnlyCandidateCensus(input: { readonly access: SiblingSourceAccess; readonly discovery: SourceSurfaceDiscovery }): ReadOnlyCandidateCensus {
  const handlers = input.discovery.surfaces.filter((surface) => surface.operation.handlerPath !== null && surface.operation.handlerSymbol !== null);
  const handlerKeyRecords = [...new Map(handlers.map((surface) => {
    const operation = surface.operation;
    const key = analysisKey(operation.repository, operation.sourceSha, operation.handlerPath!);
    return [key, { key, repoId: operation.repository, sourceSha: operation.sourceSha, relativePath: operation.handlerPath! }] as const;
  })).values()].sort((left, right) => compareCodeUnits(left.key, right.key));
  const handlerKeys = handlerKeyRecords.map((record) => record.key);
  if (handlerKeys.length > MAX_READONLY_CANDIDATE_HANDLER_FILES) throw new Error('READONLY_CANDIDATE_HANDLER_FILE_BUDGET');
  const analyses = new Map<string, HandlerFileAnalysis>();
  let filesTokenized = 0;
  let filesRejected = 0;
  let totalSourceBytes = 0;
  let totalTokens = 0;
  let declarationsConsidered = 0;
  let maxDeclarationsPerFile = 0;
  let maxTokens = 0;
  let maxSourceBytes = 0;
  for (const record of handlerKeyRecords) {
    const pathMatches = input.discovery.inventory.files.filter((entry) => entry.repoId === record.repoId && entry.relativePath === record.relativePath);
    if (pathMatches.length > 1) {
      analyses.set(record.key, { status: 'SOURCE_FILE_AMBIGUOUS', declarations: new Map() });
      filesRejected += 1;
      continue;
    }
    const file = pathMatches[0];
    if (file === undefined) {
      analyses.set(record.key, { status: pathMatches.length === 0 ? 'SOURCE_UNAVAILABLE' : 'SOURCE_IDENTITY_MISMATCH', declarations: new Map() });
      filesRejected += 1;
      continue;
    }
    const result = analyzeHandlerFile({ access: input.access, file, sourceSha: record.sourceSha });
    analyses.set(record.key, result.analysis);
    if (result.analysis.status === 'READY') filesTokenized += 1;
    else filesRejected += 1;
    totalSourceBytes += result.metrics.maxSourceBytes;
    totalTokens += result.metrics.maxTokens;
    if (totalSourceBytes > MAX_READONLY_CANDIDATE_TOTAL_HANDLER_BYTES) throw new Error('READONLY_CANDIDATE_TOTAL_SOURCE_BYTE_BUDGET');
    if (totalTokens > MAX_READONLY_CANDIDATE_TOTAL_TOKENS) throw new Error('READONLY_CANDIDATE_TOTAL_TOKEN_BUDGET');
    declarationsConsidered += result.metrics.declarationsConsidered;
    if (declarationsConsidered > MAX_READONLY_CANDIDATE_TOTAL_DECLARATIONS) throw new Error('READONLY_CANDIDATE_TOTAL_DECLARATION_BUDGET');
    maxDeclarationsPerFile = Math.max(maxDeclarationsPerFile, result.metrics.maxDeclarationsPerFile);
    maxTokens = Math.max(maxTokens, result.metrics.maxTokens);
    maxSourceBytes = Math.max(maxSourceBytes, result.metrics.maxSourceBytes);
  }
  const getSurfaces = input.discovery.surfaces.filter((surface) => surface.operation.method === 'GET');
  const directResults = handlers.map((surface) => {
    const resolved = bodyFor({ analyses, surface });
    return { surface, result: resolved.body === null ? { status: 'REJECTED' as const, rejectionCode: resolved.rejectionCode ?? 'HANDLER_DECLARATION_UNAVAILABLE' } : directPureReturn(resolved.body) };
  });
  const directPure = directResults.filter((entry) => entry.result.status === 'PROVEN_PURE_LITERAL');
  const directRejected = directResults.filter((entry) => entry.result.status !== 'PROVEN_PURE_LITERAL');
  const responseFlowEntries = input.discovery.surfaces.map((surface) => ({ surface, flow: surface.contract.responseFlow })).filter((entry): entry is { readonly surface: SourceSurfaceDiscovery['surfaces'][number]; readonly flow: NonNullable<typeof entry.flow> } => entry.flow !== null);
  const responseFlows = responseFlowEntries.map((entry) => entry.flow);
  const metadata = input.discovery.surfaces.filter((surface) => surface.operation.readOnlyClassification === 'PROVEN_READ_ONLY');
  const portfolioEligible = new Set(input.discovery.phase24Inputs.length === 0
    ? []
    : buildPhase24CandidatePortfolio({ candidates: input.discovery.phase24Inputs }).candidates.filter((candidate) => candidate.eligibility === 'ELIGIBLE').map((candidate) => candidate.surfaceKey));
  const directPureEligible = directPure.filter((entry) => portfolioEligible.has(entry.surface.surfaceId));
  const directPureOnlyBlocker = directPure.filter((entry) => entry.surface.exclusionReasons.length === 1 && entry.surface.exclusionReasons[0] === 'READ_ONLY_NOT_PROVEN');
  const familyMeasurements = [
    measurement({
      family: 'DIRECT_PURE_RETURN_HANDLER',
      population: directPure.length,
      mechanicallyCompletePopulation: directPure.length,
      positiveReadEvidencePopulation: 0,
      currentPhase24EligiblePopulation: directPureEligible.length,
      readOnlyOnlyBlockerPopulation: directPureOnlyBlocker.length,
      likelyPhase24UnlockPopulation: 0,
      declarationAmbiguityPopulation: 0,
      dependencyDeclarationPopulation: 0,
      rejectionCounts: countCodes(directRejected.map((entry) => entry.result.rejectionCode)),
      dependencyDepth: 0,
      proofCost: 'LOW',
      falsePositiveRisk: 'LOW_SIDE_EFFECT_RISK',
      admission: directPure.length > 0 ? 'NOT_ADMITTED_NO_READ_EVIDENCE' : 'NOT_ADMITTED_NO_CURRENT_PROOF',
      exampleIds: directPure.map((entry) => entry.surface.surfaceId),
    }),
    measurement({
      family: 'EXACT_BOUNDED_DECLARATION_CONE',
      population: responseFlows.length,
      mechanicallyCompletePopulation: responseFlows.filter((flow) => flow.status === 'PROVEN').length,
      positiveReadEvidencePopulation: 0,
      currentPhase24EligiblePopulation: 0,
      readOnlyOnlyBlockerPopulation: 0,
      likelyPhase24UnlockPopulation: 0,
      declarationAmbiguityPopulation: responseFlows.filter((flow) => flow.rejectionCode?.includes('AMBIGUOUS') === true).length,
      dependencyDeclarationPopulation: responseFlows.reduce((count, flow) => count + flow.declarations.length, 0),
      rejectionCounts: countCodes(responseFlows.map((flow) => flow.rejectionCode)),
      dependencyDepth: Math.max(0, ...responseFlows.map((flow) => flow.depth)),
      proofCost: 'BOUNDED',
      falsePositiveRisk: 'HIGH_WITHOUT_EFFECT_REGISTRY',
      admission: responseFlows.some((flow) => flow.status === 'PROVEN') ? 'NOT_ADMITTED_NO_READ_EVIDENCE' : 'NOT_ADMITTED_NO_CURRENT_PROOF',
      exampleIds: responseFlowEntries.map((entry) => entry.surface.surfaceId),
    }),
    measurement({
      family: 'KNOWN_READ_DECLARATION_REGISTRY',
      population: metadata.length,
      mechanicallyCompletePopulation: metadata.length,
      positiveReadEvidencePopulation: metadata.length,
      currentPhase24EligiblePopulation: metadata.filter((surface) => portfolioEligible.has(surface.surfaceId)).length,
      readOnlyOnlyBlockerPopulation: metadata.filter((surface) => surface.exclusionReasons.length === 1 && surface.exclusionReasons[0] === 'READ_ONLY_NOT_PROVEN').length,
      likelyPhase24UnlockPopulation: 0,
      declarationAmbiguityPopulation: 0,
      dependencyDeclarationPopulation: 0,
      rejectionCounts: [],
      dependencyDepth: 0,
      proofCost: 'EXACT_REGISTRY',
      falsePositiveRisk: 'NONE_BASELINE',
      admission: 'BASELINE_AUTHORITY_NOT_NEW',
      exampleIds: metadata.map((surface) => surface.surfaceId),
    }),
    measurement({
      family: 'HTTP_GET_ONLY_NEGATIVE_CONTROL',
      population: getSurfaces.length,
      mechanicallyCompletePopulation: getSurfaces.length,
      positiveReadEvidencePopulation: 0,
      currentPhase24EligiblePopulation: getSurfaces.filter((surface) => portfolioEligible.has(surface.surfaceId)).length,
      readOnlyOnlyBlockerPopulation: getSurfaces.filter((surface) => surface.exclusionReasons.length === 1 && surface.exclusionReasons[0] === 'READ_ONLY_NOT_PROVEN').length,
      likelyPhase24UnlockPopulation: 0,
      declarationAmbiguityPopulation: 0,
      dependencyDeclarationPopulation: 0,
      rejectionCounts: [{ code: 'METHOD_ONLY_NOT_AUTHORITY', count: getSurfaces.filter((surface) => surface.operation.readOnlyClassification !== 'PROVEN_READ_ONLY').length }],
      dependencyDepth: 0,
      proofCost: 'LOW',
      falsePositiveRisk: 'HIGH_WITHOUT_EFFECT_REGISTRY',
      admission: 'NEGATIVE_CONTROL_ONLY',
      exampleIds: getSurfaces.map((surface) => surface.surfaceId),
    }),
  ];
  const core = {
    schemaVersion: REAL_SOURCE_READONLY_CANDIDATE_CENSUS_VERSION,
    sourceSnapshotDigest: input.discovery.inventory.snapshotDigest,
    sourceSurfaceDigest: input.discovery.deterministicDigest,
    familyMeasurements,
    handlerPopulation: handlers.length,
    getPopulation: getSurfaces.length,
    responseFlowAttempts: responseFlows.length,
    responseFlowProven: responseFlows.filter((flow) => flow.status === 'PROVEN').length,
    responseFlowRejected: responseFlows.filter((flow) => flow.status === 'REJECTED').length,
    handlerAnalysisMetrics: { filesConsidered: handlerKeys.length, filesTokenized, filesRejected, totalSourceBytes, totalTokens, declarationsConsidered, maxDeclarationsPerFile, maxTokens, maxSourceBytes },
  } as const;
  return { ...core, deterministicDigest: safeSemanticDigest(core, 'source-readonly-candidate-census') };
}
