// ---------------------------------------------------------------------------
// Nightwatch — bounded read-only proof-family discovery.
//
// This is an investigation projection, not a mutability authority. It uses
// the existing confined source reader and exact PHP declaration index to count
// current patterns. It never promotes a pattern, infers safety from names or
// HTTP verbs, or retains source text/literal values.
// ---------------------------------------------------------------------------

import { safeSemanticDigest } from '../semanticCoverage/types';
import { buildPhase24CandidatePortfolio } from '../phase24/portfolio';
import { createResponseFlowIndex } from './responseFlow';
import type { SourceSurfaceDiscovery } from './surfaces';
import type { SiblingSourceAccess } from './siblingSource';
import type { PhpToken } from '../../oracles/expectations/extract/php';

export const REAL_SOURCE_READONLY_CANDIDATE_CENSUS_VERSION = 'nightwatch.real-source-readonly-candidate-census.v1' as const;
export const MAX_READONLY_CANDIDATE_EXAMPLES = 16;

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
  readonly declarationIndexMetrics: ReturnType<typeof createResponseFlowIndex>['metrics'];
  readonly deterministicDigest: string;
}

interface IndexedBody {
  readonly start: number;
  readonly end: number;
  readonly tokens: readonly PhpToken[];
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
    .sort((left, right) => left.code.localeCompare(right.code));
}

function pureLiteralExpression(expression: readonly PhpToken[]): boolean {
  if (expression.length === 0) return false;
  let squareDepth = 0;
  for (const token of expression) {
    if (token.t === 'STRING' || token.t === 'NUMBER') continue;
    if (token.t === 'WORD' && ['true', 'false', 'null'].includes(token.v)) continue;
    if (token.t === 'PUNCT' && token.v === '[') {
      squareDepth += 1;
      continue;
    }
    if (token.t === 'PUNCT' && token.v === ']') {
      squareDepth -= 1;
      if (squareDepth < 0) return false;
      continue;
    }
    if (token.t === 'PUNCT' && [','].includes(token.v)) continue;
    if (token.t === 'OP' && token.v === '=>') continue;
    return false;
  }
  return squareDepth === 0;
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

function bodyFor(input: { readonly index: ReturnType<typeof createResponseFlowIndex>; readonly surface: SourceSurfaceDiscovery['surfaces'][number] }): IndexedBody | null {
  const operation = input.surface.operation;
  if (operation.handlerPath === null || operation.handlerSymbol === null) return null;
  const declarations = input.index.find({ repoId: operation.repository, relativePath: operation.handlerPath, symbol: operation.handlerSymbol, sourceSha: operation.sourceSha });
  if (declarations.length !== 1) return null;
  const body = input.index.body(declarations[0]!);
  return body === null ? null : { start: body.body.start, end: body.body.end, tokens: body.tokens };
}

function examples(ids: readonly string[]): { readonly values: readonly string[]; readonly digest: string } {
  const ordered = [...new Set(ids)].sort();
  return { values: ordered.slice(0, MAX_READONLY_CANDIDATE_EXAMPLES), digest: safeSemanticDigest(ordered, 'readonly-candidate-examples') };
}

function measurement(input: Omit<ReadOnlyCandidateFamilyMeasurement, 'exampleSurfaceIds' | 'exampleDigest'> & { readonly exampleIds: readonly string[] }): ReadOnlyCandidateFamilyMeasurement {
  const example = examples(input.exampleIds);
  return { ...input, exampleSurfaceIds: example.values, exampleDigest: example.digest };
}

/** Measure current source patterns without admitting any new proof authority. */
export function buildReadOnlyCandidateCensus(input: { readonly access: SiblingSourceAccess; readonly discovery: SourceSurfaceDiscovery }): ReadOnlyCandidateCensus {
  const index = createResponseFlowIndex({ access: input.access, inventory: input.discovery.inventory });
  const handlers = input.discovery.surfaces.filter((surface) => surface.operation.handlerPath !== null && surface.operation.handlerSymbol !== null);
  const getSurfaces = input.discovery.surfaces.filter((surface) => surface.operation.method === 'GET');
  const directResults = handlers.map((surface) => {
    const body = bodyFor({ index, surface });
    return { surface, result: body === null ? { status: 'REJECTED' as const, rejectionCode: 'HANDLER_DECLARATION_UNAVAILABLE' } : directPureReturn(body) };
  });
  const directPure = directResults.filter((entry) => entry.result.status === 'PROVEN_PURE_LITERAL');
  const directRejected = directResults.filter((entry) => entry.result.status !== 'PROVEN_PURE_LITERAL');
  const responseFlowEntries = input.discovery.surfaces.map((surface) => ({ surface, flow: surface.contract.responseFlow })).filter((entry): entry is { readonly surface: SourceSurfaceDiscovery['surfaces'][number]; readonly flow: NonNullable<typeof entry.flow> } => entry.flow !== null);
  const responseFlows = responseFlowEntries.map((entry) => entry.flow);
  const metadata = input.discovery.surfaces.filter((surface) => surface.operation.readOnlyClassification === 'PROVEN_READ_ONLY');
  const portfolio = buildPhase24CandidatePortfolio({ candidates: input.discovery.phase24Inputs });
  const portfolioEligible = new Set(portfolio.candidates.filter((candidate) => candidate.eligibility === 'ELIGIBLE').map((candidate) => candidate.surfaceKey));
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
      likelyPhase24UnlockPopulation: directPureOnlyBlocker.length,
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
      likelyPhase24UnlockPopulation: metadata.filter((surface) => surface.exclusionReasons.length === 1 && surface.exclusionReasons[0] === 'READ_ONLY_NOT_PROVEN').length,
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
      likelyPhase24UnlockPopulation: getSurfaces.filter((surface) => surface.exclusionReasons.length === 1 && surface.exclusionReasons[0] === 'READ_ONLY_NOT_PROVEN').length,
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
    declarationIndexMetrics: index.metrics,
  } as const;
  return { ...core, deterministicDigest: safeSemanticDigest(core, 'source-readonly-candidate-census') };
}
