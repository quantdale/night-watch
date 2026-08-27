// Phase 20 — bounded syntax-aware source analyzers.
//
// This module expands the existing Phase 9–14 PHP analyzer without turning
// source inspection into a generic parser. Each positive pattern is fixed,
// bounded, and emits a safe structural shape. Anything outside those patterns
// is rejected with a stable reason; source text never enters a result DTO.

import {
  analyzeContract,
  analyzerEvidenceDigest,
  type AnalyzerFact,
  type ContractAnalysis,
} from "../../oracles/expectations/extract/analyzer";
import {
  findFunctionBody,
  findMatchingBrace,
  findMatchingBracket,
  tokenizePhp,
  type PhpToken,
} from "../../oracles/expectations/extract/php";
import {
  CONTRACT_BEHAVIOR_CLASSES,
  CONTRACT_DISCOVERY_VERSION,
  sourceEvidenceDigest,
  type ContractBehaviorClass,
  type DiscoveredContractShape,
  type DiscoveryRejectionCode,
  type JsonTypeCategory,
  type ObservationSurfaceKind,
  type SourceArtifactInput,
  type SourceLanguage,
} from "./types";
import { REAL_SOURCE_RESPONSE_FLOW_VERSION } from "../source/responseFlow";

/**
 * The compatibility-cone analyzers retain their Phase 20/21 identity. New
 * real-source-only proof families use a separate identity so historical
 * synthetic inventories remain byte-stable while the real-source cache still
 * invalidates when the expanded analyzer set changes.
 */
export const SEMANTIC_SOURCE_ANALYZER_VERSION = "nightwatch.semantic-source-analyzers.v1" as const;
export const REAL_SOURCE_RESPONSE_ANALYZER_VERSION = "nightwatch.real-source-response-analyzers.v4" as const;
export type AnalyzerVersion = typeof SEMANTIC_SOURCE_ANALYZER_VERSION | typeof REAL_SOURCE_RESPONSE_ANALYZER_VERSION;
export const MAX_ANALYZER_SOURCE_CHARS = 2_000_000;
export const MAX_ANALYZER_OUTPUTS = 256;

export type SourceAnalyzerHint =
  | { readonly kind: "PHP_ROW_KEYS"; readonly accumulator: string; readonly pattern: "PUSH" | "ASSIGN" }
  | { readonly kind: "PHP_FIELD_TYPE"; readonly fieldVariable: string; readonly pattern: "EMPTY_CAST_OBJECT" | "EMPTY_ARRAY_OR_STRING_KEYS" }
  | { readonly kind: "PHP_BRANCH_TYPES"; readonly fieldVariable: string }
  | { readonly kind: "PHP_ENVELOPE_FIELDS"; readonly accumulator: string; readonly requiredFields: readonly string[] }
  | { readonly kind: "PHP_PAGINATION" };

export interface SourceAnalyzerArtifact extends SourceArtifactInput {
  readonly hints?: readonly SourceAnalyzerHint[];
  /** Opt into proof families introduced for approved real-source surfaces. */
  readonly includeExtendedResponseProof?: boolean;
}

export interface AnalyzerObservation {
  readonly analyzerId: string;
  readonly analyzerVersion: AnalyzerVersion;
  readonly language: SourceLanguage;
  readonly symbol: string | null;
  readonly status: "MECHANICALLY_PROVABLE" | "REJECTED";
  readonly behaviorClass: ContractBehaviorClass | null;
  readonly shape: DiscoveredContractShape | null;
  readonly rejectionCode: DiscoveryRejectionCode | null;
  readonly rejectionDetail: string | null;
  readonly evidenceDigest: string;
  readonly observationSurfaces: readonly ObservationSurfaceKind[];
}

function invalid(reason: string): never {
  throw new Error(`SEMANTIC_SOURCE_ANALYZER_INVALID:${reason}`);
}

const SAFE_NAME_RE = /^[A-Za-z][A-Za-z0-9_.-]{0,96}$/;
const SAFE_REPO_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const SAFE_SYMBOL_RE = /^[A-Za-z_][A-Za-z0-9_:$-]{0,159}$/;
const SAFE_SHA_RE = /^[0-9a-f]{40}$/;
const SAFE_PATH_SEGMENT_RE = /^[A-Za-z][A-Za-z0-9_.-]{0,96}$/;
const KNOWN_TYPES: readonly JsonTypeCategory[] = ["NULL", "BOOLEAN", "NUMBER", "STRING", "OBJECT", "ARRAY"];
const MAX_PHP_RETURN_FIELDS = 64;
const SAFE_RESPONSE_FIELD_RE = /^[A-Za-z][A-Za-z0-9_.-]{0,96}$/;
const SAFE_ACCUMULATOR_RE = /^[A-Za-z_][A-Za-z0-9_]{0,96}$/;

function safeName(value: string, label: string): string {
  if (!SAFE_NAME_RE.test(value)) invalid(`${label}_UNSAFE`);
  return value;
}

function safeSymbol(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (!SAFE_SYMBOL_RE.test(value)) invalid("SYMBOL_UNSAFE");
  return value;
}

function safePath(value: string, label = "PATH"): readonly string[] {
  const parts = value.split(".");
  if (parts.length === 0 || parts.length > 16 || parts.some((part) => !SAFE_PATH_SEGMENT_RE.test(part))) invalid(`${label}_UNSAFE`);
  return parts;
}

function jsonType(value: string): JsonTypeCategory | null {
  const normalized = value.toUpperCase();
  return (KNOWN_TYPES as readonly string[]).includes(normalized) ? normalized as JsonTypeCategory : null;
}

function normalizeSurfaces(values: readonly ObservationSurfaceKind[]): readonly ObservationSurfaceKind[] {
  if (!Array.isArray(values) || values.length > 8) invalid("SURFACES");
  const allowed: readonly ObservationSurfaceKind[] = ["API", "BROWSER", "REPLAY", "SYNTHETIC"];
  if (values.some((value) => !allowed.includes(value))) invalid("SURFACE");
  return [...new Set(values)].sort();
}

function evidence(input: {
  readonly analyzerId: string;
  readonly analyzerVersion: AnalyzerVersion;
  readonly language: SourceLanguage;
  readonly symbol: string | null;
  readonly status: AnalyzerObservation["status"];
  readonly behaviorClass: ContractBehaviorClass | null;
  readonly shape: DiscoveredContractShape | null;
  readonly rejectionCode: DiscoveryRejectionCode | null;
  readonly rejectionDetail: string | null;
}): string {
  return sourceEvidenceDigest({
    schemaVersion: CONTRACT_DISCOVERY_VERSION,
    ...input,
  });
}

function proven(input: {
  readonly analyzerId: string;
  readonly analyzerVersion?: AnalyzerVersion;
  readonly language: SourceLanguage;
  readonly symbol: string | null;
  readonly behaviorClass: ContractBehaviorClass;
  readonly shape: DiscoveredContractShape;
  readonly surfaces: readonly ObservationSurfaceKind[];
}): AnalyzerObservation {
  const base = {
    analyzerId: input.analyzerId,
    analyzerVersion: input.analyzerVersion ?? SEMANTIC_SOURCE_ANALYZER_VERSION,
    language: input.language,
    symbol: input.symbol,
    status: "MECHANICALLY_PROVABLE" as const,
    behaviorClass: input.behaviorClass,
    shape: input.shape,
    rejectionCode: null,
    rejectionDetail: null,
  };
  return { ...base, evidenceDigest: evidence(base), observationSurfaces: normalizeSurfaces(input.surfaces) };
}

function rejected(input: {
  readonly analyzerId: string;
  readonly analyzerVersion?: AnalyzerVersion;
  readonly language: SourceLanguage;
  readonly symbol: string | null;
  readonly code: DiscoveryRejectionCode;
  readonly detail?: string;
  readonly surfaces: readonly ObservationSurfaceKind[];
}): AnalyzerObservation {
  const base = {
    analyzerId: input.analyzerId,
    analyzerVersion: input.analyzerVersion ?? SEMANTIC_SOURCE_ANALYZER_VERSION,
    language: input.language,
    symbol: input.symbol,
    status: "REJECTED" as const,
    behaviorClass: null,
    shape: null,
    rejectionCode: input.code,
    rejectionDetail: input.detail ?? null,
  };
  return { ...base, evidenceDigest: evidence(base), observationSurfaces: normalizeSurfaces(input.surfaces) };
}

function safeAnalysisDetail(analysis: ContractAnalysis): string | undefined {
  // Only retain the one bounded lexical category needed by the source-gap
  // taxonomy. Other analyzer facts may contain safe structural labels that
  // are not needed at this boundary and are deliberately discarded.
  return analysis.facts.some((fact) => fact.detail === 'token-limit') ? 'token-limit' : undefined;
}

function fromExistingAnalysis(input: {
  readonly analysis: ContractAnalysis;
  readonly language: SourceLanguage;
  readonly symbol: string | null;
  readonly analyzerId: string;
  readonly surfaces: readonly ObservationSurfaceKind[];
  readonly requested: ContractBehaviorClass;
  readonly analyzerVersion?: AnalyzerVersion;
}): AnalyzerObservation {
  const { analysis } = input;
  if (analysis.status !== "PROVEN") {
    const mapped: DiscoveryRejectionCode = analysis.blockerCode === "DYNAMIC_KEY_FLOW"
      ? "DYNAMIC_KEY_FLOW"
      : analysis.blockerCode === "RUNTIME_VALUE_TYPE_UNPROVEN"
        ? "RUNTIME_VALUE_UNPROVEN"
        : analysis.blockerCode === "BRANCH_SET_INCOMPLETE"
          ? "BRANCH_SET_INCOMPLETE"
          : analysis.blockerCode === "SOURCE_UNAVAILABLE"
            ? "SOURCE_UNAVAILABLE"
            : "UNSUPPORTED_SYNTAX";
    return rejected({ analyzerId: input.analyzerId, analyzerVersion: input.analyzerVersion, language: input.language, symbol: input.symbol, code: mapped, detail: safeAnalysisDetail(analysis) ?? analysis.blockerCode ?? undefined, surfaces: input.surfaces });
  }
  const facts: readonly AnalyzerFact[] = analysis.facts;
  const first = facts[0];
  if (first === undefined) return rejected({ analyzerId: input.analyzerId, analyzerVersion: input.analyzerVersion, language: input.language, symbol: input.symbol, code: "UNSUPPORTED_SYNTAX", detail: "empty-proof", surfaces: input.surfaces });
  let shape: DiscoveredContractShape | null = null;
  let behavior = input.requested;
  if (first.itemKeys !== undefined && input.requested === "REQUIRED_FIELD") {
    const fields = [...new Set(first.itemKeys)].sort();
    shape = { kind: "FIELD_SET", fields, requiredFields: fields, optionalFields: [] };
  } else if (first.fieldName !== undefined && first.allowedTypes !== undefined) {
    const allowedTypes = [...new Set(first.allowedTypes.map(jsonType).filter((value): value is JsonTypeCategory => value !== null))].sort();
    if (allowedTypes.length === 0) return rejected({ analyzerId: input.analyzerId, analyzerVersion: input.analyzerVersion, language: input.language, symbol: input.symbol, code: "RUNTIME_VALUE_UNPROVEN", detail: "unknown-json-type", surfaces: input.surfaces });
    shape = { kind: "FIELD_TYPE", field: safeName(first.fieldName, "FIELD"), allowedTypes };
    behavior = "FIELD_TYPE";
  } else if (first.cardinality !== undefined) {
    shape = { kind: "PAGINATION", collectionPath: ["items"], pageSize: first.cardinality, orderingPath: null };
    behavior = "PAGINATION";
  }
  if (shape === null) return rejected({ analyzerId: input.analyzerId, analyzerVersion: input.analyzerVersion, language: input.language, symbol: input.symbol, code: "UNSUPPORTED_SYNTAX", detail: "proof-shape-unmapped", surfaces: input.surfaces });
  return proven({ analyzerId: input.analyzerId, analyzerVersion: input.analyzerVersion, language: input.language, symbol: input.symbol, behaviorClass: behavior, shape, surfaces: input.surfaces });
}

function parseLiteralType(value: string): JsonTypeCategory | null {
  const trimmed = value.trim();
  if (trimmed === "null") return "NULL";
  if (trimmed === "true" || trimmed === "false") return "BOOLEAN";
  if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(trimmed)) return "NUMBER";
  if (/^(?:'[^'\\\n]{0,160}'|\"[^\"\\\n]{0,160}\")$/.test(trimmed)) return "STRING";
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return "ARRAY";
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return "OBJECT";
  return null;
}

function commaSeparatedLiterals(value: string): readonly string[] | null {
  const pieces = value.split(",").map((piece) => piece.trim()).filter((piece) => piece.length > 0);
  if (pieces.length === 0 || pieces.length > 32 || pieces.some((piece) => parseLiteralType(piece) === null)) return null;
  return pieces;
}

interface PhpReturnArrayEntry {
  readonly key: string | null;
  readonly value: readonly PhpToken[];
}

interface PhpReturnArrayShape {
  readonly rootType: "OBJECT" | "ARRAY" | null;
  readonly fields: readonly string[];
  readonly fieldTypes: Readonly<Record<string, JsonTypeCategory | null>>;
}

/** Split one bounded PHP array literal into top-level entries. Nested arrays,
 * calls, and grouped expressions stay inside their entry. This is structural
 * token handling only; no PHP expression is evaluated. */
function splitPhpArrayEntries(tokens: readonly PhpToken[], openIndex: number, closeIndex: number): readonly (readonly PhpToken[])[] | null {
  const entries: PhpToken[][] = [];
  let current: PhpToken[] = [];
  let squareDepth = 0;
  let parenDepth = 0;
  let braceDepth = 0;
  for (let index = openIndex + 1; index < closeIndex; index += 1) {
    const token = tokens[index]!;
    if (token.t === "PUNCT" && token.v === "[" ) squareDepth += 1;
    else if (token.t === "PUNCT" && token.v === "]") {
      squareDepth -= 1;
      if (squareDepth < 0) return null;
    } else if (token.t === "PUNCT" && token.v === "(") parenDepth += 1;
    else if (token.t === "PUNCT" && token.v === ")") {
      parenDepth -= 1;
      if (parenDepth < 0) return null;
    } else if (token.t === "PUNCT" && token.v === "{") braceDepth += 1;
    else if (token.t === "PUNCT" && token.v === "}") {
      braceDepth -= 1;
      if (braceDepth < 0) return null;
    }
    if (token.t === "PUNCT" && token.v === "," && squareDepth === 0 && parenDepth === 0 && braceDepth === 0) {
      if (current.length > 0) entries.push(current);
      current = [];
    } else {
      current.push(token);
    }
  }
  if (squareDepth !== 0 || parenDepth !== 0 || braceDepth !== 0) return null;
  if (current.length > 0) entries.push(current);
  return entries;
}

function staticPhpLiteralType(tokens: readonly PhpToken[]): JsonTypeCategory | null {
  if (tokens.length === 1) {
    const token = tokens[0]!;
    if (token.t === "NUMBER") return "NUMBER";
    if (token.t === "STRING") return "STRING";
    if (token.t === "WORD" && token.v === "null") return "NULL";
    if (token.t === "WORD" && (token.v === "true" || token.v === "false")) return "BOOLEAN";
  }
  if (tokens[0]?.t === "PUNCT" && tokens[0].v === "[") {
    const close = findMatchingBracket(tokens, 0);
    if (close !== tokens.length - 1) return null;
    const entries = splitPhpArrayEntries(tokens, 0, close);
    if (entries === null) return null;
    if (entries.length === 0) return "ARRAY";
    const keyed = entries.map((entry) => entry[0]?.t === "STRING" && entry[1]?.t === "OP" && entry[1]?.v === "=>");
    if (keyed.every(Boolean)) return "OBJECT";
    if (keyed.every((value) => !value)) return "ARRAY";
  }
  return null;
}

function parsePhpReturnArray(tokens: readonly PhpToken[], openIndex: number, bodyEnd: number): PhpReturnArrayShape | null {
  const close = findMatchingBracket(tokens, openIndex);
  if (close >= bodyEnd || close >= tokens.length) return null;
  const entries = splitPhpArrayEntries(tokens, openIndex, close);
  if (entries === null || entries.length > MAX_PHP_RETURN_FIELDS) return null;
  const parsed: PhpReturnArrayEntry[] = [];
  const keys: string[] = [];
  for (const entry of entries) {
    if (entry[0]?.t === "STRING" && entry[0].oversized === true && entry[1]?.t === "OP" && entry[1].v === "=>") return null;
    if (entry[1]?.t === "OP" && entry[1]?.v === "=>" && entry[0]?.t !== "STRING") return null;
    const key = entry[0]?.t === "STRING" && entry[1]?.t === "OP" && entry[1]?.v === "=>" ? entry[0].v : null;
    if (key !== null) {
      if (!SAFE_RESPONSE_FIELD_RE.test(key) || keys.includes(key)) return null;
      keys.push(key);
      parsed.push({ key, value: entry.slice(2) });
    } else {
      parsed.push({ key: null, value: entry });
    }
  }
  const allKeyed = parsed.every((entry) => entry.key !== null);
  const allIndexed = parsed.every((entry) => entry.key === null);
  if (!allKeyed && !allIndexed) return null;
  const fieldTypes: Record<string, JsonTypeCategory | null> = {};
  for (const entry of parsed) {
    if (entry.key !== null) fieldTypes[entry.key] = staticPhpLiteralType(entry.value);
  }
  return {
    rootType: allKeyed ? "OBJECT" : allIndexed ? "ARRAY" : null,
    fields: keys.sort(),
    fieldTypes,
  };
}

type PhpDirectReturnCompleteness = 'COMPLETE' | 'INCOMPLETE' | 'UNSUPPORTED';

interface PhpDirectBranchBlock {
  readonly start: number;
  readonly end: number;
}

const PHP_DIRECT_UNSUPPORTED_CONTROL_WORDS = new Set([
  'break', 'case', 'catch', 'continue', 'default', 'die', 'do', 'exit', 'finally', 'for', 'foreach', 'function', 'goto', 'match', 'switch', 'throw', 'try', 'while', 'yield',
]);

function findMatchingParenthesis(tokens: readonly PhpToken[], openIndex: number, limit: number): number {
  let depth = 0;
  for (let index = openIndex; index < limit; index += 1) {
    const token = tokens[index]!;
    if (token.t !== 'PUNCT') continue;
    if (token.v === '(') depth += 1;
    if (token.v === ')') {
      depth -= 1;
      if (depth === 0) return index;
      if (depth < 0) return limit;
    }
  }
  return limit;
}

function parsePhpDirectBranchBlock(tokens: readonly PhpToken[], keywordIndex: number, keyword: 'if' | 'elseif' | 'else', limit: number): PhpDirectBranchBlock | null {
  let openIndex = keywordIndex + 1;
  if (keyword !== 'else') {
    if (tokens[openIndex]?.t !== 'PUNCT' || tokens[openIndex]?.v !== '(') return null;
    const closeParenthesis = findMatchingParenthesis(tokens, openIndex, limit);
    if (closeParenthesis >= limit) return null;
    openIndex = closeParenthesis + 1;
  }
  if (tokens[openIndex]?.t !== 'PUNCT' || tokens[openIndex]?.v !== '{') return null;
  const closeIndex = findMatchingBrace(tokens, openIndex);
  if (closeIndex >= limit) return null;
  for (let index = openIndex + 1; index < closeIndex; index += 1) {
    if (tokens[index]?.t === 'PUNCT' && (tokens[index]?.v === '{' || tokens[index]?.v === '}')) return null;
  }
  return { start: openIndex + 1, end: closeIndex };
}

function branchContainsDirectReturn(tokens: readonly PhpToken[], branch: PhpDirectBranchBlock): boolean {
  for (let index = branch.start; index < branch.end; index += 1) {
    if (tokens[index]?.t === 'WORD' && tokens[index]?.v === 'return') return true;
  }
  return false;
}

/**
 * Prove only the finite control-flow shapes supported by the direct-return
 * analyzer. Observing one or more literal returns is not enough: an implicit
 * PHP fallthrough, nested branch, loop, exception path, or generator path can
 * produce a response outside the observed shapes. Unsupported flow is
 * rejected before any shape is promoted.
 */
function phpDirectReturnCompleteness(tokens: readonly PhpToken[], body: { readonly start: number; readonly end: number }): PhpDirectReturnCompleteness {
  const topLevelControls: { readonly index: number; readonly value: 'if' | 'elseif' | 'else' }[] = [];
  const topLevelBraceOpeners: number[] = [];
  const topLevelReturns: number[] = [];
  let braceDepth = 0;
  for (let index = body.start + 1; index < body.end; index += 1) {
    const token = tokens[index]!;
    if (token.t === 'PUNCT' && token.v === '{') {
      if (braceDepth === 0) topLevelBraceOpeners.push(index);
      braceDepth += 1;
      continue;
    }
    if (token.t === 'PUNCT' && token.v === '}') {
      braceDepth -= 1;
      if (braceDepth < 0) return 'UNSUPPORTED';
      continue;
    }
    if (token.t !== 'WORD') continue;
    if (PHP_DIRECT_UNSUPPORTED_CONTROL_WORDS.has(token.v)) return 'UNSUPPORTED';
    if (token.v === 'if' || token.v === 'elseif' || token.v === 'else') {
      if (braceDepth !== 0) return 'UNSUPPORTED';
      topLevelControls.push({ index, value: token.v });
      continue;
    }
    if (token.v === 'return' && braceDepth === 0) topLevelReturns.push(index);
  }
  if (braceDepth !== 0) return 'UNSUPPORTED';
  if (topLevelControls.length === 0) return topLevelBraceOpeners.length === 0 ? 'COMPLETE' : 'UNSUPPORTED';
  if (topLevelControls[0]?.value !== 'if') return 'UNSUPPORTED';
  if (topLevelReturns.some((index) => index < topLevelControls[0]!.index)) return 'UNSUPPORTED';

  const branches: PhpDirectBranchBlock[] = [];
  const branchKeywords: { readonly index: number; readonly value: 'if' | 'elseif' | 'else' }[] = [];
  const branchOpeners: number[] = [];
  let cursor = topLevelControls[0]!.index;
  let hasElse = false;
  while (cursor < body.end) {
    const keywordToken = tokens[cursor];
    if (keywordToken?.t !== 'WORD' || (keywordToken.v !== 'if' && keywordToken.v !== 'elseif' && keywordToken.v !== 'else')) break;
    const keyword = keywordToken.v;
    if (keyword === 'else' && hasElse) return 'UNSUPPORTED';
    if (keyword === 'if' && branches.length > 0) return 'UNSUPPORTED';
    if (keyword === 'elseif' && (hasElse || branches.length === 0)) return 'UNSUPPORTED';
    const branch = parsePhpDirectBranchBlock(tokens, cursor, keyword, body.end);
    if (branch === null) return 'UNSUPPORTED';
    branches.push(branch);
    branchKeywords.push({ index: cursor, value: keyword });
    const openIndex = branch.start - 1;
    branchOpeners.push(openIndex);
    if (keyword === 'else') hasElse = true;
    cursor = branch.end + 1;
    const next = tokens[cursor];
    if (next?.t === 'WORD' && (next.v === 'elseif' || next.v === 'else')) continue;
    break;
  }

  if (branchKeywords.length !== topLevelControls.length || branchKeywords.some((branch, index) => branch.index !== topLevelControls[index]?.index || branch.value !== topLevelControls[index]?.value)) return 'UNSUPPORTED';
  if (topLevelBraceOpeners.length !== branchOpeners.length || topLevelBraceOpeners.some((openIndex, index) => openIndex !== branchOpeners[index])) return 'UNSUPPORTED';
  const tailReturns = topLevelReturns.filter((index) => index > (branches.at(-1)?.end ?? body.start));
  if (hasElse) return branches.every((branch) => branchContainsDirectReturn(tokens, branch)) && tailReturns.length === 0 ? 'COMPLETE' : 'INCOMPLETE';
  return tailReturns.length === 1 ? 'COMPLETE' : 'INCOMPLETE';
}

/** Prove response structure only when every reachable response path is a
 * supported direct literal array with one identical, literal-key shape. A
 * variable/call/mixed branch is deliberately rejected: response names and
 * framework conventions are not proof of a response contract. */
function analyzePhpDirectReturns(artifact: SourceAnalyzerArtifact): AnalyzerObservation[] {
  const surfaces = artifact.observationSurfaces;
  const symbol = safeSymbol(artifact.symbol);
  if (symbol === null) return [rejected({ analyzerId: "PHP_RETURN_OBJECT_FIELDS", analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: "PHP", symbol, code: "SOURCE_UNAVAILABLE", detail: "symbol-required", surfaces })];
  let tokens: PhpToken[];
  try {
    tokens = tokenizePhp(artifact.sourceText);
  } catch {
    return [rejected({ analyzerId: "PHP_RETURN_OBJECT_FIELDS", analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: "PHP", symbol, code: "UNSUPPORTED_SYNTAX", detail: "token-limit", surfaces })];
  }
  const body = findFunctionBody(tokens, symbol);
  if (body === null) return [rejected({ analyzerId: "PHP_RETURN_OBJECT_FIELDS", analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: "PHP", symbol, code: "UNSUPPORTED_SYNTAX", detail: "function-not-found", surfaces })];
  const completeness = phpDirectReturnCompleteness(tokens, body);
  if (completeness !== 'COMPLETE') return [rejected({ analyzerId: "PHP_RETURN_OBJECT_FIELDS", analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: "PHP", symbol, code: "BRANCH_SET_INCOMPLETE", detail: completeness === 'INCOMPLETE' ? 'implicit-fallthrough' : 'unsupported-control-flow', surfaces })];
  const returns: PhpReturnArrayShape[] = [];
  for (let index = body.start + 1; index < body.end; index += 1) {
    const token = tokens[index]!;
    if (token.t !== "WORD" || token.v !== "return") continue;
    if (tokens[index + 1]?.t !== "PUNCT" || tokens[index + 1]?.v !== "[") {
      return [rejected({ analyzerId: "PHP_RETURN_OBJECT_FIELDS", analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: "PHP", symbol, code: "BRANCH_SET_INCOMPLETE", detail: "non-literal-return", surfaces })];
    }
    const shape = parsePhpReturnArray(tokens, index + 1, body.end);
    if (shape === null) return [rejected({ analyzerId: "PHP_RETURN_OBJECT_FIELDS", analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: "PHP", symbol, code: "DYNAMIC_KEY_FLOW", detail: "return-array-shape", surfaces })];
    returns.push(shape);
  }
  if (returns.length === 0) return [rejected({ analyzerId: "PHP_RETURN_OBJECT_FIELDS", analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: "PHP", symbol, code: "UNSUPPORTED_SYNTAX", detail: "no-return", surfaces })];
  const rootType = returns[0]!.rootType;
  if (rootType === null || returns.some((shape) => shape.rootType !== rootType)) {
    return [rejected({ analyzerId: "PHP_RETURN_OBJECT_FIELDS", analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: "PHP", symbol, code: "BRANCH_SET_INCOMPLETE", detail: "root-shape-mismatch", surfaces })];
  }
  const result: AnalyzerObservation[] = [proven({ analyzerId: "PHP_RETURN_ROOT_TYPE", analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: "PHP", symbol, behaviorClass: "FIELD_TYPE", shape: { kind: "FIELD_TYPE", field: "root", allowedTypes: [rootType] }, surfaces })];
  if (rootType !== "OBJECT") return result;
  const fields = returns[0]!.fields;
  if (returns.some((shape) => shape.fields.length !== fields.length || shape.fields.some((field, index) => field !== fields[index]))) {
    return [rejected({ analyzerId: "PHP_RETURN_OBJECT_FIELDS", analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: "PHP", symbol, code: "BRANCH_SET_INCOMPLETE", detail: "field-set-mismatch", surfaces })];
  }
  result.push(proven({ analyzerId: "PHP_RETURN_OBJECT_FIELDS", analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: "PHP", symbol, behaviorClass: "REQUIRED_FIELD", shape: { kind: "FIELD_SET", fields, requiredFields: fields, optionalFields: [] }, surfaces }));
  for (const field of fields) {
    const types = returns.map((shape) => shape.fieldTypes[field] ?? null);
    const type = types[0] ?? null;
    if (type !== null && types.every((candidate) => candidate === type)) {
      result.push(proven({ analyzerId: "PHP_RETURN_FIELD_TYPE", analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: "PHP", symbol, behaviorClass: "FIELD_TYPE", shape: { kind: "FIELD_TYPE", field, allowedTypes: [type] }, surfaces }));
    }
  }
  return result;
}

const PHP_ALIAS_CONTROL_WORDS = new Set(['if', 'elseif', 'else', 'foreach', 'for', 'while', 'switch', 'case', 'try', 'catch', 'finally', 'throw', 'yield', 'include', 'require']);

/** Prove a deliberately narrow variable-alias response flow:
 * `$response = <direct array literal>; return $response;`. Control flow,
 * mutation, calls, multiple return variables, and dynamic aliases are all
 * rejected. The stricter shape is intentional: an alias is not treated as a
 * data-flow theorem merely because its variable name resembles a response. */
function analyzePhpReturnAliases(artifact: SourceAnalyzerArtifact): AnalyzerObservation[] {
  const surfaces = artifact.observationSurfaces;
  const symbol = safeSymbol(artifact.symbol);
  if (symbol === null) return [];
  let tokens: PhpToken[];
  try {
    tokens = tokenizePhp(artifact.sourceText);
  } catch {
    return [];
  }
  const body = findFunctionBody(tokens, symbol);
  if (body === null) return [];
  const returns: string[] = [];
  let controlFlow = false;
  for (let index = body.start + 1; index < body.end; index += 1) {
    const token = tokens[index]!;
    if (token.t === 'WORD' && token.v === 'return') {
      const next = tokens[index + 1];
      if (next?.t !== 'VARIABLE') return [];
      returns.push(next.v);
    }
    if (token.t === 'WORD' && PHP_ALIAS_CONTROL_WORDS.has(token.v)) controlFlow = true;
  }
  if (returns.length === 0 || new Set(returns).size !== 1) return [];
  const target = returns[0]!;
  if (!SAFE_ACCUMULATOR_RE.test(target)) return [];
  const assignments: PhpReturnArrayShape[] = [];
  let otherTargetUse = false;
  for (let index = body.start + 1; index < body.end; index += 1) {
    const token = tokens[index]!;
    if (token.t !== 'VARIABLE' || token.v !== target) continue;
    const next = tokens[index + 1];
    const isReturnUse = tokens[index - 1]?.t === 'WORD' && tokens[index - 1]?.v === 'return';
    if (isReturnUse) continue;
    if (next?.t === 'PUNCT' && next.v === '=' && tokens[index + 2]?.t === 'PUNCT' && tokens[index + 2]?.v === '[') {
      const shape = parsePhpReturnArray(tokens, index + 2, body.end);
      if (shape === null) return [rejected({ analyzerId: 'PHP_RETURN_ALIAS', analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: 'PHP', symbol, code: 'DYNAMIC_KEY_FLOW', detail: 'alias-array-shape', surfaces })];
      assignments.push(shape);
      continue;
    }
    otherTargetUse = true;
  }
  if (assignments.length === 0) return [];
  if (controlFlow || otherTargetUse || assignments.some((shape) => shape.rootType === null)) {
    return [rejected({ analyzerId: 'PHP_RETURN_ALIAS', analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: 'PHP', symbol, code: 'BRANCH_SET_INCOMPLETE', detail: controlFlow ? 'alias-control-flow' : 'alias-use', surfaces })];
  }
  const rootType = assignments[0]!.rootType;
  if (rootType === null || assignments.some((shape) => shape.rootType !== rootType)) {
    return [rejected({ analyzerId: 'PHP_RETURN_ALIAS', analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: 'PHP', symbol, code: 'BRANCH_SET_INCOMPLETE', detail: 'alias-root-mismatch', surfaces })];
  }
  const result: AnalyzerObservation[] = [proven({ analyzerId: 'PHP_RETURN_ALIAS_ROOT_TYPE', analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: 'PHP', symbol, behaviorClass: 'FIELD_TYPE', shape: { kind: 'FIELD_TYPE', field: 'root', allowedTypes: [rootType] }, surfaces })];
  if (rootType !== 'OBJECT') return result;
  const fields = assignments[0]!.fields;
  if (assignments.some((shape) => shape.fields.length !== fields.length || shape.fields.some((field, index) => field !== fields[index]))) {
    return [rejected({ analyzerId: 'PHP_RETURN_ALIAS', analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: 'PHP', symbol, code: 'BRANCH_SET_INCOMPLETE', detail: 'alias-field-mismatch', surfaces })];
  }
  result.push(proven({ analyzerId: 'PHP_RETURN_ALIAS_OBJECT_FIELDS', analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: 'PHP', symbol, behaviorClass: 'REQUIRED_FIELD', shape: { kind: 'FIELD_SET', fields, requiredFields: fields, optionalFields: [] }, surfaces }));
  for (const field of fields) {
    const types = assignments.map((shape) => shape.fieldTypes[field] ?? null);
    const type = types[0] ?? null;
    if (type !== null && types.every((candidate) => candidate === type)) {
      result.push(proven({ analyzerId: 'PHP_RETURN_ALIAS_FIELD_TYPE', analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: 'PHP', symbol, behaviorClass: 'FIELD_TYPE', shape: { kind: 'FIELD_TYPE', field, allowedTypes: [type] }, surfaces }));
    }
  }
  return result;
}

interface PhpReturnBranchShape {
  readonly shape: PhpReturnArrayShape;
  readonly alias: boolean;
}

function topLevelPhpReturnBranches(tokens: readonly PhpToken[], body: { readonly start: number; readonly end: number }): readonly { readonly start: number; readonly end: number }[] | null {
  const blocks: { start: number; end: number }[] = [];
  let cursor = body.start + 1;
  let sawIf = false;
  let sawElse = false;
  while (cursor < body.end) {
    const keyword = tokens[cursor];
    if (keyword?.t !== 'WORD' || (keyword.v !== 'if' && keyword.v !== 'elseif' && keyword.v !== 'else')) return null;
    if (keyword.v === 'else') sawElse = true;
    else sawIf = true;
    let open = cursor + 1;
    if (keyword.v !== 'else') {
      let depth = 0;
      while (open < body.end) {
        const token = tokens[open]!;
        if (token.t === 'PUNCT' && token.v === '(') depth += 1;
        else if (token.t === 'PUNCT' && token.v === ')') {
          depth -= 1;
          if (depth === 0) {
            open += 1;
            break;
          }
        }
        open += 1;
      }
    }
    while (open < body.end && !(tokens[open]?.t === 'PUNCT' && tokens[open]?.v === '{')) open += 1;
    if (tokens[open]?.t !== 'PUNCT' || tokens[open]?.v !== '{') return null;
    const close = findMatchingBrace(tokens, open);
    if (close >= body.end) return null;
    blocks.push({ start: open + 1, end: close });
    cursor = close + 1;
    if (cursor >= body.end) break;
  }
  return sawIf && sawElse && blocks.length >= 2 ? blocks : null;
}

function branchReturnShape(tokens: readonly PhpToken[], branch: { readonly start: number; readonly end: number }): PhpReturnBranchShape | null {
  let returnIndex = -1;
  for (let index = branch.start; index < branch.end; index += 1) {
    const token = tokens[index]!;
    if (token.t === 'WORD' && token.v === 'return') {
      if (returnIndex !== -1) return null;
      returnIndex = index;
    }
    if (token.t === 'WORD' && PHP_ALIAS_CONTROL_WORDS.has(token.v)) return null;
  }
  if (returnIndex === -1) return null;
  const next = tokens[returnIndex + 1];
  if (next?.t === 'PUNCT' && next.v === '[') {
    const shape = parsePhpReturnArray(tokens, returnIndex + 1, branch.end);
    return shape === null ? null : { shape, alias: false };
  }
  if (next?.t !== 'VARIABLE' || !SAFE_ACCUMULATOR_RE.test(next.v)) return null;
  const target = next.v;
  let assignment: PhpReturnArrayShape | null = null;
  for (let index = branch.start; index < returnIndex; index += 1) {
    const token = tokens[index]!;
    if (token.t !== 'VARIABLE' || token.v !== target) continue;
    if (tokens[index + 1]?.t === 'PUNCT' && tokens[index + 1]?.v === '=' && tokens[index + 2]?.t === 'PUNCT' && tokens[index + 2]?.v === '[') {
      if (assignment !== null) return null;
      assignment = parsePhpReturnArray(tokens, index + 2, branch.end);
      continue;
    }
    return null;
  }
  return assignment === null ? null : { shape: assignment, alias: true };
}

/** Prove complete `if`/`elseif`/`else` response alternatives when each branch
 * returns either a direct literal array or a directly assigned literal alias.
 * A missing else, nested control flow, dynamic alias, or shape mismatch is
 * rejected; no partial branch is promoted to response authority. */
function analyzePhpReturnBranches(artifact: SourceAnalyzerArtifact): AnalyzerObservation[] {
  const surfaces = artifact.observationSurfaces;
  const symbol = safeSymbol(artifact.symbol);
  if (symbol === null) return [];
  let tokens: PhpToken[];
  try {
    tokens = tokenizePhp(artifact.sourceText);
  } catch {
    return [];
  }
  const body = findFunctionBody(tokens, symbol);
  if (body === null) return [];
  const branches = topLevelPhpReturnBranches(tokens, body);
  if (branches === null) return [];
  const parsed = branches.map((branch) => branchReturnShape(tokens, branch));
  if (parsed.some((value) => value === null) || parsed.length === 0) {
    return [rejected({ analyzerId: 'PHP_RETURN_BRANCHES', analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: 'PHP', symbol, code: 'BRANCH_SET_INCOMPLETE', detail: 'branch-shape', surfaces })];
  }
  const branchShapes = parsed as PhpReturnBranchShape[];
  if (!branchShapes.some((branch) => branch.alias)) return [];
  const rootType = branchShapes[0]!.shape.rootType;
  if (rootType === null || branchShapes.some((branch) => branch.shape.rootType !== rootType)) {
    return [rejected({ analyzerId: 'PHP_RETURN_BRANCHES', analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: 'PHP', symbol, code: 'BRANCH_SET_INCOMPLETE', detail: 'branch-root-mismatch', surfaces })];
  }
  const result: AnalyzerObservation[] = [proven({ analyzerId: 'PHP_RETURN_BRANCH_ROOT_TYPE', analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: 'PHP', symbol, behaviorClass: 'FIELD_TYPE', shape: { kind: 'FIELD_TYPE', field: 'root', allowedTypes: [rootType] }, surfaces })];
  if (rootType !== 'OBJECT') return result;
  const fields = branchShapes[0]!.shape.fields;
  if (branchShapes.some((branch) => branch.shape.fields.length !== fields.length || branch.shape.fields.some((field, index) => field !== fields[index]))) {
    return [rejected({ analyzerId: 'PHP_RETURN_BRANCHES', analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: 'PHP', symbol, code: 'BRANCH_SET_INCOMPLETE', detail: 'branch-field-mismatch', surfaces })];
  }
  result.push(proven({ analyzerId: 'PHP_RETURN_BRANCH_OBJECT_FIELDS', analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: 'PHP', symbol, behaviorClass: 'REQUIRED_FIELD', shape: { kind: 'FIELD_SET', fields, requiredFields: fields, optionalFields: [] }, surfaces }));
  for (const field of fields) {
    const types = branchShapes.map((branch) => branch.shape.fieldTypes[field] ?? null);
    const type = types[0] ?? null;
    if (type !== null && types.every((candidate) => candidate === type)) {
      result.push(proven({ analyzerId: 'PHP_RETURN_BRANCH_FIELD_TYPE', analyzerVersion: REAL_SOURCE_RESPONSE_ANALYZER_VERSION, language: 'PHP', symbol, behaviorClass: 'FIELD_TYPE', shape: { kind: 'FIELD_TYPE', field, allowedTypes: [type] }, surfaces }));
    }
  }
  return result;
}

function analyzeTypeScript(artifact: SourceAnalyzerArtifact): AnalyzerObservation[] {
  const text = artifact.sourceText;
  const surfaces = artifact.observationSurfaces;
  const out: AnalyzerObservation[] = [];
  const requiredMatches = [...text.matchAll(/required\s*:\s*\[([^\]]{1,2048})\]/g)];
  for (const match of requiredMatches) {
    const values = commaSeparatedLiterals(match[1] ?? "");
    if (values === null || values.some((value) => !/^['\"][A-Za-z][A-Za-z0-9_.-]{0,96}['\"]$/.test(value))) {
      out.push(rejected({ analyzerId: "TS_STATIC_REQUIRED_FIELDS", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "MALFORMED_STATIC_SCHEMA", detail: "required-array", surfaces }));
      continue;
    }
    const fields = values.map((value) => value.slice(1, -1)).sort();
    out.push(proven({ analyzerId: "TS_STATIC_REQUIRED_FIELDS", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "REQUIRED_FIELD", shape: { kind: "FIELD_SET", fields, requiredFields: fields, optionalFields: [] }, surfaces }));
  }

  const enumMatches = [...text.matchAll(/([A-Za-z][A-Za-z0-9_.-]{0,96})\s*:\s*\{\s*enum\s*:\s*\[([^\]]{1,4096})\]/g)];
  for (const match of enumMatches) {
    const field = safeName(match[1] ?? "", "FIELD");
    const values = commaSeparatedLiterals(match[2] ?? "");
    if (values === null) {
      out.push(rejected({ analyzerId: "TS_STATIC_ENUM", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "MALFORMED_STATIC_SCHEMA", detail: "enum-array", surfaces }));
      continue;
    }
    out.push(proven({ analyzerId: "TS_STATIC_ENUM", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "FINITE_ENUM", shape: { kind: "FINITE_ENUM", field, valueCount: values.length, valueSetDigest: sourceEvidenceDigest(values) }, surfaces }));
  }

  const defaultMatches = [...text.matchAll(/([A-Za-z][A-Za-z0-9_.-]{0,96})\s*:\s*\{\s*default\s*:\s*([^,}\n]{1,160})/g)];
  for (const match of defaultMatches) {
    const field = safeName(match[1] ?? "", "FIELD");
    const defaultType = parseLiteralType(match[2] ?? "");
    if (defaultType === null) {
      out.push(rejected({ analyzerId: "TS_STATIC_DEFAULT", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "RUNTIME_VALUE_UNPROVEN", detail: "default-expression", surfaces }));
      continue;
    }
    out.push(proven({ analyzerId: "TS_STATIC_DEFAULT", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "DEFAULT_VALUE", shape: { kind: "DEFAULT", field, defaultType }, surfaces }));
  }

  const typeMatches = [...text.matchAll(/([A-Za-z][A-Za-z0-9_.-]{0,96})\s*:\s*\{\s*type\s*:\s*['\"](NULL|BOOLEAN|NUMBER|STRING|OBJECT|ARRAY)['\"]\s*\}/g)];
  for (const match of typeMatches) {
    const field = safeName(match[1] ?? "", "FIELD");
    const type = jsonType(match[2] ?? "");
    if (type === null) continue;
    out.push(proven({ analyzerId: "TS_STATIC_FIELD_TYPE", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "FIELD_TYPE", shape: { kind: "FIELD_TYPE", field, allowedTypes: [type] }, surfaces }));
  }

  const rangeMatches = [...text.matchAll(/if\s*\(\s*([A-Za-z][A-Za-z0-9_.-]{0,96})\s*(<|<=|>|>=)\s*(-?[0-9]+(?:\.[0-9]+)?)\s*\|\|\s*\1\s*(<|<=|>|>=)\s*(-?[0-9]+(?:\.[0-9]+)?)\s*\)\s*\{?\s*throw\b/g)];
  for (const match of rangeMatches) {
    const field = safeName(match[1] ?? "", "FIELD");
    const leftOperator = match[2];
    const left = Number(match[3]);
    const rightOperator = match[4];
    const right = Number(match[5]);
    // The throw guard proves the complementary interval only for the fixed
    // outward form `field < lower || field > upper` (inclusive endpoints) or
    // `field <= lower || field >= upper` (exclusive endpoints). Reversed
    // operators such as `field > lower || field < upper` are not a range
    // proof: with ordered bounds they are effectively always true. Reject
    // them rather than manufacturing a RANGE_BOUND observation.
    const validOutwardGuard = (leftOperator === "<" || leftOperator === "<=") && (rightOperator === ">" || rightOperator === ">=");
    if (!Number.isFinite(left) || !Number.isFinite(right) || left > right || !validOutwardGuard) {
      out.push(rejected({ analyzerId: "TS_VALIDATION_RANGE", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "UNSUPPORTED_SYNTAX", detail: validOutwardGuard ? "range-order" : "range-orientation", surfaces }));
      continue;
    }
    out.push(proven({ analyzerId: "TS_VALIDATION_RANGE", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "RANGE_BOUND", shape: { kind: "RANGE", field, lowerBound: left, upperBound: right, lowerInclusive: leftOperator === "<", upperInclusive: rightOperator === ">" }, surfaces }));
  }

  const normalizationMatches = [...text.matchAll(/([A-Za-z][A-Za-z0-9_.-]{0,96})\.trim\(\)\.(toLowerCase|toUpperCase)\(\)/g)];
  for (const match of normalizationMatches) {
    const field = safeName(match[1] ?? "", "FIELD");
    const operation = match[2] === "toLowerCase" ? "LOWERCASE" as const : "UPPERCASE" as const;
    out.push(proven({ analyzerId: "TS_NORMALIZATION_FLOW", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "NORMALIZATION", shape: { kind: "NORMALIZATION", field, operations: ["TRIM", operation] }, surfaces }));
  }

  const sortMatches = [...text.matchAll(/([A-Za-z][A-Za-z0-9_.-]{0,96})\.sort\(\(\s*([A-Za-z][A-Za-z0-9_]*)\s*,\s*([A-Za-z][A-Za-z0-9_]*)\s*\)\s*=>\s*\2\.([A-Za-z][A-Za-z0-9_.-]*)\s*-\s*\3\.\4\s*\)/g)];
  for (const match of sortMatches) {
    const collectionPath = safePath(match[1] ?? "", "COLLECTION");
    const itemField = safePath(match[4] ?? "", "ITEM_FIELD");
    out.push(proven({ analyzerId: "TS_SORT_ORDER", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "SORT_ORDER", shape: { kind: "SORT_ORDER", collectionPath, itemField, direction: "ASCENDING" }, surfaces }));
  }

  const reduceMatches = [...text.matchAll(/([A-Za-z][A-Za-z0-9_.-]{0,96})\.reduce\(\(\s*([A-Za-z][A-Za-z0-9_]*)\s*,\s*([A-Za-z][A-Za-z0-9_]*)\s*\)\s*=>\s*\2\s*\+\s*\3\.([A-Za-z][A-Za-z0-9_.-]*)\s*,\s*0\s*\)/g)];
  for (const match of reduceMatches) {
    out.push(proven({ analyzerId: "TS_AGGREGATION_FLOW", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "AGGREGATION", shape: { kind: "AGGREGATION", collectionPath: safePath(match[1] ?? "", "COLLECTION"), numericFieldPath: safePath(match[4] ?? "", "NUMERIC_FIELD"), scalarPath: ["total"], operation: "SUM" }, surfaces }));
  }

  const presenceMatches = [...text.matchAll(/if\s*\(\s*(!?)([A-Za-z][A-Za-z0-9_.-]{0,96})\s*&&\s*(!?)([A-Za-z][A-Za-z0-9_.-]{0,96})\s*\)\s*\{?\s*throw\b/g)];
  for (const match of presenceMatches) {
    const left = safePath(match[2] ?? "", "CONDITION");
    const right = safePath(match[4] ?? "", "TARGET");
    const inverted = (match[1] ?? "") === "!";
    const targetInverted = (match[3] ?? "") === "!";
    if (inverted === targetInverted) {
      out.push(rejected({ analyzerId: "TS_PRESENCE_RELATION", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "RELATION_PROOF_MISSING", detail: "non-conditional-presence", surfaces }));
    } else {
      out.push(proven({ analyzerId: "TS_PRESENCE_RELATION", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "FIELD_PRESENCE_RELATION", shape: { kind: "PRESENCE_RELATION", conditionPath: left, targetPath: right, conditionExpected: !inverted }, surfaces }));
    }
  }

  const filterMatches = [...text.matchAll(/([A-Za-z][A-Za-z0-9_.-]{0,96})\.filter\(\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)\s*=>\s*\2\.([A-Za-z][A-Za-z0-9_.-]*)\s*\)/g)];
  for (const match of filterMatches) {
    out.push(proven({ analyzerId: "TS_FILTERING_FLOW", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "FILTERING", shape: { kind: "FILTERING", collectionPath: safePath(match[1] ?? "", "COLLECTION"), predicateClass: "FIELD_PRESENT" }, surfaces }));
  }

  return out;
}

function analyzeGo(artifact: SourceAnalyzerArtifact): AnalyzerObservation[] {
  const surfaces = artifact.observationSurfaces;
  const match = /type\s+[A-Za-z][A-Za-z0-9_]*\s+struct\s*\{([\s\S]{1,20000})\}/m.exec(artifact.sourceText);
  if (match === null) return [rejected({ analyzerId: "GO_STRUCT_TAGS", language: "GO", symbol: safeSymbol(artifact.symbol), code: "UNSUPPORTED_SYNTAX", detail: "struct-shape", surfaces })];
  const fields: string[] = [];
  const required: string[] = [];
  const optional: string[] = [];
  const types: AnalyzerObservation[] = [];
  const lines = (match[1] ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const field = /^([A-Z][A-Za-z0-9_]*)\s+(\*?)([A-Za-z][A-Za-z0-9_\[\]]*)\s+`json:"([A-Za-z][A-Za-z0-9_.-]{0,96})(,omitempty)?"`$/.exec(line);
    if (field === null) {
      if (line.includes("json:")) return [rejected({ analyzerId: "GO_STRUCT_TAGS", language: "GO", symbol: safeSymbol(artifact.symbol), code: "UNSUPPORTED_SYNTAX", detail: "struct-field", surfaces })];
      continue;
    }
    const name = safeName(field[4] ?? "", "FIELD");
    fields.push(name);
    if (field[2] === "" && field[5] === undefined) required.push(name); else optional.push(name);
    const mapped = field[3] === "string" ? "STRING" : field[3] === "bool" ? "BOOLEAN" : /^(?:int|uint|float)/.test(field[3] ?? "") ? "NUMBER" : field[3]?.startsWith("[]") ? "ARRAY" : "OBJECT";
    types.push(proven({ analyzerId: "GO_STRUCT_FIELD_TYPE", language: "GO", symbol: safeSymbol(artifact.symbol), behaviorClass: "FIELD_TYPE", shape: { kind: "FIELD_TYPE", field: name, allowedTypes: [mapped] }, surfaces }));
  }
  if (fields.length === 0) return [rejected({ analyzerId: "GO_STRUCT_TAGS", language: "GO", symbol: safeSymbol(artifact.symbol), code: "MALFORMED_STATIC_SCHEMA", detail: "no-json-fields", surfaces })];
  return [proven({ analyzerId: "GO_STRUCT_TAGS", language: "GO", symbol: safeSymbol(artifact.symbol), behaviorClass: required.length > 0 ? "REQUIRED_FIELD" : "OPTIONAL_FIELD", shape: { kind: "FIELD_SET", fields: [...new Set(fields)].sort(), requiredFields: [...new Set(required)].sort(), optionalFields: [...new Set(optional)].sort() }, surfaces }), ...types];
}

interface OpenApiProperty {
  readonly type?: unknown;
  readonly enum?: unknown;
  readonly minimum?: unknown;
  readonly maximum?: unknown;
  readonly exclusiveMinimum?: unknown;
  readonly exclusiveMaximum?: unknown;
  readonly default?: unknown;
}

function analyzeOpenApi(artifact: SourceAnalyzerArtifact): AnalyzerObservation[] {
  const surfaces = artifact.observationSurfaces;
  let parsed: unknown;
  try { parsed = JSON.parse(artifact.sourceText); } catch { return [rejected({ analyzerId: "OPENAPI_STATIC_SCHEMA", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), code: "MALFORMED_STATIC_SCHEMA", detail: "json", surfaces })]; }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return [rejected({ analyzerId: "OPENAPI_STATIC_SCHEMA", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), code: "MALFORMED_STATIC_SCHEMA", detail: "root", surfaces })];
  const root = parsed as Record<string, unknown>;
  const properties = root.properties;
  if (properties === null || typeof properties !== "object" || Array.isArray(properties)) return [rejected({ analyzerId: "OPENAPI_STATIC_SCHEMA", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), code: "MALFORMED_STATIC_SCHEMA", detail: "properties", surfaces })];
  const requiredValues = Array.isArray(root.required) ? root.required.filter((value): value is string => typeof value === "string") : [];
  const fields = Object.keys(properties as Record<string, unknown>).filter((value) => SAFE_NAME_RE.test(value)).sort();
  if (fields.length === 0 || fields.length !== Object.keys(properties as Record<string, unknown>).length) return [rejected({ analyzerId: "OPENAPI_STATIC_SCHEMA", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), code: "FIELD_NAME_UNSAFE", detail: "property-name", surfaces })];
  const out: AnalyzerObservation[] = [proven({ analyzerId: "OPENAPI_REQUIRED_FIELDS", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), behaviorClass: requiredValues.length > 0 ? "REQUIRED_FIELD" : "OPTIONAL_FIELD", shape: { kind: "FIELD_SET", fields, requiredFields: requiredValues.map((value) => safeName(value, "REQUIRED_FIELD")).sort(), optionalFields: fields.filter((field) => !requiredValues.includes(field)).sort() }, surfaces })];
  for (const field of fields) {
    const property = (properties as Record<string, OpenApiProperty>)[field];
    if (property === undefined || property === null || typeof property !== "object") return [rejected({ analyzerId: "OPENAPI_STATIC_SCHEMA", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), code: "MALFORMED_STATIC_SCHEMA", detail: "property-shape", surfaces })];
    if (typeof property.type === "string") {
      const type = jsonType(property.type);
      if (type === null) return [rejected({ analyzerId: "OPENAPI_STATIC_SCHEMA", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), code: "RUNTIME_VALUE_UNPROVEN", detail: "property-type", surfaces })];
      out.push(proven({ analyzerId: "OPENAPI_FIELD_TYPE", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), behaviorClass: "FIELD_TYPE", shape: { kind: "FIELD_TYPE", field, allowedTypes: [type] }, surfaces }));
    }
    if (Array.isArray(property.enum) && property.enum.length > 0 && property.enum.length <= 32) {
      out.push(proven({ analyzerId: "OPENAPI_ENUM", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), behaviorClass: "FINITE_ENUM", shape: { kind: "FINITE_ENUM", field, valueCount: property.enum.length, valueSetDigest: sourceEvidenceDigest(property.enum) }, surfaces }));
    }
    const minimum = typeof property.minimum === "number" ? property.minimum : null;
    const maximum = typeof property.maximum === "number" ? property.maximum : null;
    if (minimum !== null || maximum !== null) {
      out.push(proven({ analyzerId: "OPENAPI_RANGE", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), behaviorClass: "RANGE_BOUND", shape: { kind: "RANGE", field, lowerBound: minimum, upperBound: maximum, lowerInclusive: property.exclusiveMinimum !== true, upperInclusive: property.exclusiveMaximum !== true }, surfaces }));
    }
    if (property.default !== undefined) {
      const type = parseLiteralType(JSON.stringify(property.default));
      if (type === null) return [rejected({ analyzerId: "OPENAPI_STATIC_SCHEMA", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), code: "RUNTIME_VALUE_UNPROVEN", detail: "default", surfaces })];
      out.push(proven({ analyzerId: "OPENAPI_DEFAULT", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), behaviorClass: "DEFAULT_VALUE", shape: { kind: "DEFAULT", field, defaultType: type }, surfaces }));
    }
  }
  return out;
}

function analyzePhp(artifact: SourceAnalyzerArtifact): AnalyzerObservation[] {
  const surfaces = artifact.observationSurfaces;
  const symbol = safeSymbol(artifact.symbol);
  if (symbol === null) return [rejected({ analyzerId: "PHP_FIXED_FLOW", language: "PHP", symbol, code: "SOURCE_UNAVAILABLE", detail: "symbol-required", surfaces })];
  const hints = artifact.hints ?? [
    { kind: "PHP_ROW_KEYS", accumulator: "res", pattern: "PUSH" },
    { kind: "PHP_ROW_KEYS", accumulator: "res", pattern: "ASSIGN" },
  ];
  const out: AnalyzerObservation[] = [];
  for (const hint of hints) {
    switch (hint.kind) {
      case "PHP_ROW_KEYS":
        out.push(fromExistingAnalysis({ analysis: analyzeContract({ language: "php", sourceText: artifact.sourceText, symbol, proofClass: "LITERAL_ROW_FIELD_SET", accumulator: hint.accumulator, pattern: hint.pattern }), language: "PHP", symbol, analyzerId: `PHP_ROW_KEYS_${hint.pattern}`, surfaces, requested: "REQUIRED_FIELD" }));
        break;
      case "PHP_FIELD_TYPE":
        out.push(fromExistingAnalysis({ analysis: analyzeContract({ language: "php", sourceText: artifact.sourceText, symbol, proofClass: "SCALAR_TYPE_FROM_CAST", fieldVariable: hint.fieldVariable, pattern: hint.pattern }), language: "PHP", symbol, analyzerId: "PHP_FIELD_TYPE_FLOW", surfaces, requested: "FIELD_TYPE" }));
        break;
      case "PHP_BRANCH_TYPES":
        out.push(fromExistingAnalysis({ analysis: analyzeContract({ language: "php", sourceText: artifact.sourceText, symbol, proofClass: "BRANCH_UNION_TYPE_SET", fieldVariable: hint.fieldVariable }), language: "PHP", symbol, analyzerId: "PHP_BRANCH_TYPE_FLOW", surfaces, requested: "FIELD_TYPE" }));
        break;
      case "PHP_ENVELOPE_FIELDS":
        out.push(fromExistingAnalysis({ analysis: analyzeContract({ language: "php", sourceText: artifact.sourceText, symbol, proofClass: "RETURN_ENVELOPE_FIELD_PRESENCE", accumulator: hint.accumulator, requiredFields: hint.requiredFields }), language: "PHP", symbol, analyzerId: "PHP_ENVELOPE_FIELDS", surfaces, requested: "REQUIRED_FIELD" }));
        break;
      case "PHP_PAGINATION":
        out.push(fromExistingAnalysis({ analysis: analyzeContract({ language: "php", sourceText: artifact.sourceText, symbol, proofClass: "CHUNK_ITEM_METADATA" }), language: "PHP", symbol, analyzerId: "PHP_PAGINATION_FLOW", surfaces, requested: "PAGINATION" }));
        break;
    }
  }
  return artifact.includeExtendedResponseProof === true ? [...out, ...analyzePhpReturnBranches(artifact), ...analyzePhpReturnAliases(artifact), ...analyzePhpDirectReturns(artifact)] : out;
}

/** Analyze one bounded source artifact with fixed syntax-aware patterns. */
export function analyzeSourceArtifact(artifact: SourceAnalyzerArtifact): readonly AnalyzerObservation[] {
  if (typeof artifact.sourceText !== "string" || artifact.sourceText.length > MAX_ANALYZER_SOURCE_CHARS) {
    return [rejected({ analyzerId: "BOUNDARY", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "SOURCE_TOO_LARGE", detail: "source-cap", surfaces: artifact.observationSurfaces })];
  }
  if (/(?:PRIVACY_SENTINEL|CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|Bearer\s+|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(artifact.sourceText)) {
    return [rejected({ analyzerId: "BOUNDARY", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "PRIVACY_UNSAFE_SOURCE", detail: "sentinel", surfaces: artifact.observationSurfaces })];
  }
  if (!SAFE_NAME_RE.test(artifact.artifactId) || !SAFE_REPO_ID_RE.test(artifact.repoId) || !SAFE_SHA_RE.test(artifact.sha) || artifact.relativePath.startsWith("/") || artifact.relativePath.includes("..")) {
    return [rejected({ analyzerId: "BOUNDARY", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "SOURCE_PATH_INVALID", detail: "provenance", surfaces: artifact.observationSurfaces })];
  }
  let output: AnalyzerObservation[];
  switch (artifact.language) {
    case "PHP": output = analyzePhp(artifact); break;
    case "TYPESCRIPT":
    case "JAVASCRIPT": output = analyzeTypeScript(artifact); break;
    case "GO": output = analyzeGo(artifact); break;
    case "OPENAPI": output = analyzeOpenApi(artifact); break;
    default: output = [rejected({ analyzerId: "BOUNDARY", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "UNSUPPORTED_LANGUAGE", surfaces: artifact.observationSurfaces })];
  }
  if (output.length === 0) output = [rejected({ analyzerId: "BOUNDARY", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "UNSUPPORTED_SYNTAX", detail: "no-fixed-pattern", surfaces: artifact.observationSurfaces })];
  if (output.length > MAX_ANALYZER_OUTPUTS) output = output.slice(0, MAX_ANALYZER_OUTPUTS);
  return output;
}

/** Stable summary used by inventory/cache callers; it never includes source. */
export function analyzerSetIdentity(): string {
  return sourceEvidenceDigest({ version: SEMANTIC_SOURCE_ANALYZER_VERSION, existing: CONTRACT_DISCOVERY_VERSION, behaviors: CONTRACT_BEHAVIOR_CLASSES });
}

/** Identity for the approved real-source surface analyzer set. This is kept
 * separate from the historical semantic-discovery identity above so adding a
 * real-source proof family cannot rewrite the Phase 20/21 compatibility
 * baseline, while source-surface cache keys still invalidate correctly. */
export function sourceSurfaceAnalyzerSetIdentity(): string {
  return sourceEvidenceDigest({
    version: REAL_SOURCE_RESPONSE_ANALYZER_VERSION,
    responseFlowVersion: REAL_SOURCE_RESPONSE_FLOW_VERSION,
    legacyAnalyzerSet: analyzerSetIdentity(),
    extendedFamilies: ["PHP_RESPONSE_FLOW", "PHP_RETURN_ALIAS_ROOT_TYPE", "PHP_RETURN_ALIAS_OBJECT_FIELDS", "PHP_RETURN_ALIAS_FIELD_TYPE", "PHP_RETURN_BRANCH_ROOT_TYPE", "PHP_RETURN_BRANCH_OBJECT_FIELDS", "PHP_RETURN_BRANCH_FIELD_TYPE", "PHP_RETURN_ROOT_TYPE", "PHP_RETURN_OBJECT_FIELDS", "PHP_RETURN_FIELD_TYPE"],
  });
}

/** Exposed only for tests that prove the existing analyzer is still composed. */
export function existingAnalyzerIdentity(analysis: ContractAnalysis): string {
  return analyzerEvidenceDigest(analysis);
}
