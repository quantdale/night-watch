// Phase 27 — bounded exact PHP response-flow resolution.
//
// This module indexes only declaration metadata and keeps source text in a
// short-lived closure while the current discovery is running. It does not
// execute PHP, resolve a container, follow inheritance, interpret a factory,
// or infer framework serialization. A flow is useful only when every return
// branch is an exact static call to one mechanically selected declaration and
// the terminal declaration can be handed back to the existing Phase 26
// response analyzers.

import { findMatchingBrace, tokenizePhp, type PhpToken } from '../../oracles/expectations/extract/php';
import { safeSemanticDigest } from '../semanticCoverage/types';
import { sourceContentDigest, type RealSourceSnapshotInventory, type SourceSnapshotFileRecord } from './scanTypes';
import type { SiblingSourceAccess } from './siblingSource';

export const REAL_SOURCE_RESPONSE_FLOW_VERSION = 'nightwatch.real-source-response-flow.v2' as const;
export const MAX_RESPONSE_FLOW_DEPTH = 2;
export const MAX_RESPONSE_FLOW_DECLARATIONS = 16;
export const MAX_RESPONSE_FLOW_INDEX_DECLARATIONS = 4096;
export const MAX_RESPONSE_FLOW_SOURCE_BYTES = 400_000;
export const MAX_RESPONSE_FLOW_RETURN_SITES = 64;

const SAFE_REPO_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const SAFE_PATH_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,239}$/;
const SAFE_SYMBOL_RE = /^[A-Za-z_][A-Za-z0-9_]{0,159}$/;
const SAFE_CLASS_RE = /^[A-Za-z_][A-Za-z0-9_]{0,159}$/;
const UNSUPPORTED_BUILTIN_CALLS = new Set(['call_user_func', 'call_user_func_array', 'forward_static_call', 'forward_static_call_array']);

export const RESPONSE_FLOW_REJECTION_CODES = [
  'RESPONSE_FLOW_DEPTH_EXCEEDED',
  'RESPONSE_FLOW_CYCLE',
  'RESPONSE_SYMBOL_AMBIGUOUS',
  'RESPONSE_SYMBOL_MISSING',
  'RESPONSE_DECLARATION_UNAPPROVED',
  'RESPONSE_DECLARATION_STALE',
  'RESPONSE_DECLARATION_UNAVAILABLE',
  'RESPONSE_SOURCE_BUDGET_EXCEEDED',
  'RESPONSE_DECLARATION_INDEX_BUDGET_EXCEEDED',
  'RESPONSE_BRANCH_INCOMPLETE',
  'RESPONSE_BRANCH_BUDGET_EXCEEDED',
  'RESPONSE_FLOW_DECLARATIONS_EXCEEDED',
  'RESPONSE_DYNAMIC_DISPATCH',
  'RESPONSE_UNSUPPORTED_HELPER_SYNTAX',
] as const;
export type ResponseFlowRejectionCode = (typeof RESPONSE_FLOW_REJECTION_CODES)[number];

export type ResponseFlowStatus = 'NOT_APPLICABLE' | 'PROVEN' | 'REJECTED';
export type ResponseFlowDeclarationKind = 'FUNCTION' | 'METHOD';
export type ResponseFlowCallKind = 'SAME_CLASS_METHOD' | 'SELF_METHOD' | 'NAMED_FUNCTION' | 'NAMED_STATIC_METHOD';

/** Safe declaration identity. No source text or runtime value is retained. */
export interface ResponseFlowDeclaration {
  readonly declarationId: string;
  readonly repoId: string;
  readonly sourceSha: string;
  readonly relativePath: string;
  readonly contentDigest: string;
  readonly symbol: string;
  readonly kind: ResponseFlowDeclarationKind;
  readonly className: string | null;
}

export interface ResponseFlowEdge {
  readonly callsiteId: string;
  readonly fromDeclarationId: string;
  readonly toDeclarationId: string;
  readonly callKind: ResponseFlowCallKind;
  readonly ordinal: number;
}

export interface ResponseFlowProof {
  readonly schemaVersion: typeof REAL_SOURCE_RESPONSE_FLOW_VERSION;
  readonly status: ResponseFlowStatus;
  readonly depth: number;
  readonly maxDepth: number;
  readonly rootDeclaration: ResponseFlowDeclaration | null;
  readonly declarations: readonly ResponseFlowDeclaration[];
  readonly edges: readonly ResponseFlowEdge[];
  readonly terminalDeclarationIds: readonly string[];
  readonly rejectionCode: ResponseFlowRejectionCode | null;
  readonly proofDigest: string;
}

interface IndexedDeclaration extends ResponseFlowDeclaration {
  readonly body: { readonly start: number; readonly end: number };
  readonly tokens: readonly PhpToken[];
  readonly namespacePresent: boolean;
  readonly classUnsupported: boolean;
  readonly isStatic: boolean;
  readonly visibility: ResponseFlowVisibility;
}

type ResponseFlowVisibility = 'PUBLIC' | 'PROTECTED' | 'PRIVATE' | 'UNKNOWN';

interface ClassRange {
  readonly name: string;
  readonly start: number;
  readonly end: number;
  readonly unsupported: boolean;
}

interface FileIndexState {
  readonly status: 'READY' | 'SOURCE_UNAVAILABLE' | 'SOURCE_STALE' | 'LEXICAL_UNSUPPORTED' | 'SOURCE_BUDGET_EXCEEDED' | 'DECLARATION_INDEX_BUDGET_EXCEEDED';
  readonly file: SourceSnapshotFileRecord;
}

export interface ResponseFlowIndex {
  readonly declarations: readonly ResponseFlowDeclaration[];
  readonly metrics: ResponseFlowIndexMetrics;
  readonly find: (input: { readonly repoId: string; readonly relativePath?: string; readonly symbol: string; readonly className?: string | null; readonly kind?: ResponseFlowDeclarationKind; readonly sourceSha?: string }) => readonly ResponseFlowDeclaration[];
  readonly body: (declaration: ResponseFlowDeclaration) => IndexedDeclaration | null;
  readonly fileState: (repoId: string, relativePath: string) => FileIndexState['status'] | 'NOT_INDEXED';
}

export interface ResponseFlowIndexMetrics {
  readonly filesConsidered: number;
  readonly filesTokenized: number;
  readonly filesReady: number;
  readonly declarationsIndexed: number;
  readonly maxDeclarationsPerFile: number;
  readonly maxTokens: number;
  readonly maxSourceBytes: number;
}

interface ResponseFlowOperation {
  readonly repository: string;
  readonly sourceSha: string;
  readonly handlerPath: string | null;
  readonly handlerSymbol: string | null;
}

interface ReturnSite {
  readonly expression: readonly PhpToken[];
  readonly ordinal: number;
}

interface CallTarget {
  readonly kind: ResponseFlowCallKind;
  readonly symbol: string;
  readonly className: string | null;
}

type CallClassification =
  | { readonly kind: 'NONE' }
  | { readonly kind: 'CALL'; readonly target: CallTarget }
  | { readonly kind: 'REJECT'; readonly code: ResponseFlowRejectionCode };

function invalid(reason: string): never {
  throw new Error(`RESPONSE_FLOW_INVALID:${reason}`);
}

function safeValue(value: string, expression: RegExp, label: string): string {
  if (!expression.test(value)) invalid(`${label}_UNSAFE`);
  return value;
}

function declarationId(input: Omit<ResponseFlowDeclaration, 'declarationId'>): string {
  return safeSemanticDigest(input, 'response-declaration');
}

function callsiteId(input: { readonly fromDeclarationId: string; readonly ordinal: number; readonly target: CallTarget }): string {
  return safeSemanticDigest(input, 'response-callsite');
}

function declarationCore(input: Omit<ResponseFlowDeclaration, 'declarationId'>): ResponseFlowDeclaration {
  return { ...input, declarationId: declarationId(input) };
}

function fileKey(repoId: string, relativePath: string): string {
  return `${repoId}:${relativePath}`;
}

function findFunctionBodyAt(tokens: readonly PhpToken[], functionIndex: number): { readonly start: number; readonly end: number } | null {
  let parenDepth = 0;
  let sawParen = false;
  for (let index = functionIndex + 1; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.t === 'PUNCT' && token.v === '(') {
      sawParen = true;
      parenDepth += 1;
      continue;
    }
    if (token.t === 'PUNCT' && token.v === ')') {
      parenDepth -= 1;
      if (parenDepth === 0 && sawParen) {
        for (let next = index + 1; next < tokens.length; next += 1) {
          const after = tokens[next]!;
          if (after.t === 'PUNCT' && after.v === '{') {
            const close = findMatchingBrace(tokens, next);
            return close < tokens.length ? { start: next, end: close } : null;
          }
          if (after.t === 'PUNCT' && after.v === ';') return null;
        }
        return null;
      }
    }
  }
  return null;
}

function classRanges(tokens: readonly PhpToken[]): readonly ClassRange[] {
  const ranges: ClassRange[] = [];
  for (let index = 0; index + 1 < tokens.length; index += 1) {
    if (tokens[index]?.t !== 'WORD' || tokens[index]?.v !== 'class') continue;
    const name = tokens[index + 1];
    if (name?.t !== 'WORD' || !SAFE_CLASS_RE.test(name.v)) continue;
    let open = -1;
    for (let cursor = index + 2; cursor < tokens.length; cursor += 1) {
      const token = tokens[cursor]!;
      if (token.t === 'PUNCT' && token.v === '{') {
        open = cursor;
        break;
      }
      if (token.t === 'PUNCT' && token.v === ';') break;
    }
    if (open < 0) continue;
    const close = findMatchingBrace(tokens, open);
    if (close >= tokens.length) continue;
    const header = tokens.slice(index + 2, open);
    const unsupported = header.some((token) => token.t === 'WORD' && (token.v === 'extends' || token.v === 'implements'))
      || tokens.slice(open + 1, close).some((token) => token.t === 'WORD' && (token.v === 'trait' || token.v === 'interface' || token.v === 'enum' || token.v === 'use'))
      || tokens.slice(open + 1, close).some((token) => token.t === 'WORD' && (token.v === '__call' || token.v === '__callStatic'));
    ranges.push({ name: name.v, start: index, end: close, unsupported });
  }
  return ranges.sort((left, right) => left.start - right.start || left.name.localeCompare(right.name));
}

function containingClass(ranges: readonly ClassRange[], functionIndex: number): ClassRange | null {
  const matches = ranges.filter((range) => range.start < functionIndex && functionIndex < range.end);
  if (matches.length === 0) return null;
  if (matches.length > 1) return null;
  return matches[0] ?? null;
}

const DECLARATION_MODIFIERS = new Set(['abstract', 'final', 'private', 'protected', 'public', 'readonly', 'static']);

function declarationModifiers(tokens: readonly PhpToken[], functionIndex: number): { readonly isStatic: boolean; readonly visibility: ResponseFlowVisibility } {
  let isStatic = false;
  let visibility: ResponseFlowVisibility = 'PUBLIC';
  let sawVisibility = false;
  for (let index = functionIndex - 1; index >= 0; index -= 1) {
    const token = tokens[index]!;
    if (token.t !== 'WORD' || !DECLARATION_MODIFIERS.has(token.v)) break;
    if (token.v === 'static') isStatic = true;
    if (token.v === 'public' || token.v === 'protected' || token.v === 'private') {
      if (sawVisibility && visibility !== token.v.toUpperCase()) visibility = 'UNKNOWN';
      else visibility = token.v.toUpperCase() as Extract<ResponseFlowVisibility, 'PUBLIC' | 'PROTECTED' | 'PRIVATE'>;
      sawVisibility = true;
    }
  }
  return { isStatic, visibility };
}

function declarationRecords(input: { readonly file: SourceSnapshotFileRecord; readonly sourceText: string; readonly tokens: readonly PhpToken[] }): readonly IndexedDeclaration[] {
  const ranges = classRanges(input.tokens);
  const namespacePresent = input.tokens.some((token) => token.t === 'WORD' && token.v === 'namespace');
  const declarations: IndexedDeclaration[] = [];
  for (let index = 0; index + 1 < input.tokens.length; index += 1) {
    const token = input.tokens[index]!;
    if (token.t !== 'WORD' || token.v !== 'function') continue;
    const name = input.tokens[index + 1];
    if (name?.t !== 'WORD' || !SAFE_SYMBOL_RE.test(name.v)) continue;
    const body = findFunctionBodyAt(input.tokens, index);
    if (body === null) continue;
    const range = containingClass(ranges, index);
    const className = range?.name ?? null;
    const modifiers = declarationModifiers(input.tokens, index);
    const core = {
      repoId: safeValue(input.file.repoId, SAFE_REPO_RE, 'REPOSITORY'),
      sourceSha: input.file.sourceSha ?? invalid('SOURCE_SHA_MISSING'),
      relativePath: safeValue(input.file.relativePath, SAFE_PATH_RE, 'PATH'),
      contentDigest: input.file.contentDigest ?? invalid('CONTENT_DIGEST_MISSING'),
      symbol: name.v,
      kind: className === null ? 'FUNCTION' as const : 'METHOD' as const,
      className,
    };
    declarations.push({ ...declarationCore(core), body, tokens: input.tokens, namespacePresent, classUnsupported: range?.unsupported ?? false, ...modifiers });
  }
  return declarations;
}

/** Build a bounded declaration index from the already-scanned approved files. */
export function createResponseFlowIndex(input: { readonly access: SiblingSourceAccess; readonly inventory: RealSourceSnapshotInventory }): ResponseFlowIndex {
  const indexed: IndexedDeclaration[] = [];
  const states = new Map<string, FileIndexState>();
  const files = [...input.inventory.files]
    .filter((file) => file.status === 'ELIGIBLE' && file.language === 'PHP')
    .sort((left, right) => fileKey(left.repoId, left.relativePath).localeCompare(fileKey(right.repoId, right.relativePath)));
  let filesTokenized = 0;
  let filesReady = 0;
  let maxDeclarationsPerFile = 0;
  let maxTokens = 0;
  let maxSourceBytes = 0;
  for (const file of files) {
    const key = fileKey(file.repoId, file.relativePath);
    const sourceText = input.access.reader.readFile(file.repoId, file.relativePath);
    if (sourceText === null) {
      states.set(key, { status: 'SOURCE_UNAVAILABLE', file });
      continue;
    }
    if (file.contentDigest === null || sourceContentDigest(sourceText) !== file.contentDigest) {
      states.set(key, { status: 'SOURCE_STALE', file });
      continue;
    }
    const sourceBytes = Buffer.byteLength(sourceText, 'utf8');
    maxSourceBytes = Math.max(maxSourceBytes, sourceBytes);
    if (sourceBytes > MAX_RESPONSE_FLOW_SOURCE_BYTES) {
      states.set(key, { status: 'SOURCE_BUDGET_EXCEEDED', file });
      continue;
    }
    let tokens: PhpToken[];
    try {
      tokens = tokenizePhp(sourceText);
    } catch {
      states.set(key, { status: 'LEXICAL_UNSUPPORTED', file });
      continue;
    }
    filesTokenized += 1;
    maxTokens = Math.max(maxTokens, tokens.length);
    const records = declarationRecords({ file, sourceText, tokens });
    maxDeclarationsPerFile = Math.max(maxDeclarationsPerFile, records.length);
    if (indexed.length + records.length > MAX_RESPONSE_FLOW_INDEX_DECLARATIONS) {
      states.set(key, { status: 'DECLARATION_INDEX_BUDGET_EXCEEDED', file });
      continue;
    }
    states.set(key, { status: 'READY', file });
    filesReady += 1;
    indexed.push(...records);
  }
  const declarations = [...indexed].sort((left, right) => left.declarationId.localeCompare(right.declarationId));
  const byId = new Map(declarations.map((declaration) => [declaration.declarationId, declaration]));
  return {
    declarations: declarations.map(({ declarationId: id, repoId, sourceSha, relativePath, contentDigest, symbol, kind, className }) => ({ declarationId: id, repoId, sourceSha, relativePath, contentDigest, symbol, kind, className })),
    metrics: {
      filesConsidered: files.length,
      filesTokenized,
      filesReady,
      declarationsIndexed: declarations.length,
      maxDeclarationsPerFile,
      maxTokens,
      maxSourceBytes,
    },
    find(query) {
      return declarations.filter((declaration) => declaration.repoId === query.repoId
        && (query.relativePath === undefined || declaration.relativePath === query.relativePath)
        && declaration.symbol === query.symbol
        && (query.className === undefined || declaration.className === query.className)
        && (query.kind === undefined || declaration.kind === query.kind)
        && (query.sourceSha === undefined || declaration.sourceSha === query.sourceSha))
        .map(({ declarationId: id, repoId, sourceSha, relativePath, contentDigest, symbol, kind, className }) => ({ declarationId: id, repoId, sourceSha, relativePath, contentDigest, symbol, kind, className }));
    },
    body(declaration) {
      return byId.get(declaration.declarationId) ?? null;
    },
    fileState(repoId, relativePath) {
      return states.get(fileKey(repoId, relativePath))?.status ?? 'NOT_INDEXED';
    },
  };
}

type ReturnSiteResult = readonly ReturnSite[] | { readonly rejectionCode: 'RESPONSE_BRANCH_BUDGET_EXCEEDED' };

function isReturnSiteBudgetFailure(result: ReturnSiteResult): result is { readonly rejectionCode: 'RESPONSE_BRANCH_BUDGET_EXCEEDED' } {
  return !Array.isArray(result);
}

function returnSites(tokens: readonly PhpToken[], body: { readonly start: number; readonly end: number }): ReturnSiteResult | null {
  const sites: ReturnSite[] = [];
  for (let index = body.start + 1; index < body.end; index += 1) {
    const token = tokens[index]!;
    if (token.t === 'WORD' && token.v === 'function') return null;
    if (token.t !== 'WORD' || token.v !== 'return') continue;
    const expression: PhpToken[] = [];
    let square = 0;
    let paren = 0;
    let brace = 0;
    let terminated = false;
    for (let cursor = index + 1; cursor < body.end; cursor += 1) {
      const next = tokens[cursor]!;
      if (next.t === 'PUNCT' && next.v === '[') square += 1;
      else if (next.t === 'PUNCT' && next.v === ']') square -= 1;
      else if (next.t === 'PUNCT' && next.v === '(') paren += 1;
      else if (next.t === 'PUNCT' && next.v === ')') paren -= 1;
      else if (next.t === 'PUNCT' && next.v === '{') brace += 1;
      else if (next.t === 'PUNCT' && next.v === '}') brace -= 1;
      if (next.t === 'PUNCT' && next.v === ';' && square === 0 && paren === 0 && brace === 0) {
        terminated = true;
        break;
      }
      expression.push(next);
    }
    if (!terminated) return null;
    sites.push({ expression, ordinal: sites.length });
    if (sites.length > MAX_RESPONSE_FLOW_RETURN_SITES) return { rejectionCode: 'RESPONSE_BRANCH_BUDGET_EXCEEDED' };
  }
  return sites;
}

function onlyCallExpression(expression: readonly PhpToken[], openIndex: number): boolean {
  let depth = 0;
  for (let index = openIndex; index < expression.length; index += 1) {
    const token = expression[index]!;
    if (token.t === 'PUNCT' && token.v === '(') depth += 1;
    else if (token.t === 'PUNCT' && token.v === ')') {
      depth -= 1;
      if (depth === 0) return index === expression.length - 1;
    }
  }
  return false;
}

function classifyCall(input: { readonly declaration: IndexedDeclaration; readonly expression: readonly PhpToken[] }): CallClassification {
  const [first, second, third, fourth] = input.expression;
  if (first === undefined) return { kind: 'REJECT', code: 'RESPONSE_BRANCH_INCOMPLETE' };
  if (first.t === 'VARIABLE') {
    if (first.v !== 'this') {
      if (second?.t === 'PUNCT' && second.v === '(') return { kind: 'REJECT', code: 'RESPONSE_DYNAMIC_DISPATCH' };
      return { kind: 'NONE' };
    }
    if (second?.t !== 'OP' || second.v !== '->' || third?.t !== 'WORD') return { kind: 'REJECT', code: 'RESPONSE_DYNAMIC_DISPATCH' };
    if (fourth?.t !== 'PUNCT' || fourth.v !== '(' || !onlyCallExpression(input.expression, 3)) return { kind: 'REJECT', code: 'RESPONSE_DYNAMIC_DISPATCH' };
    if (input.declaration.className === null) return { kind: 'REJECT', code: 'RESPONSE_DECLARATION_UNAPPROVED' };
    return { kind: 'CALL', target: { kind: 'SAME_CLASS_METHOD', symbol: third.v, className: input.declaration.className } };
  }
  if (first.t !== 'WORD') return { kind: 'NONE' };
  if (first.v === 'static') return { kind: 'REJECT', code: 'RESPONSE_DYNAMIC_DISPATCH' };
  if (first.v === 'self') {
    if (second?.t !== 'OP' || second.v !== '::' || third?.t !== 'WORD' || fourth?.t !== 'PUNCT' || fourth.v !== '(' || !onlyCallExpression(input.expression, 3)) return { kind: 'REJECT', code: 'RESPONSE_DYNAMIC_DISPATCH' };
    if (input.declaration.className === null) return { kind: 'REJECT', code: 'RESPONSE_DECLARATION_UNAPPROVED' };
    return { kind: 'CALL', target: { kind: 'SELF_METHOD', symbol: third.v, className: input.declaration.className } };
  }
  if (first.v === 'new') return { kind: 'REJECT', code: 'RESPONSE_UNSUPPORTED_HELPER_SYNTAX' };
  if (second?.t === 'OP' && second.v === '::' && third?.t === 'WORD') {
    if (fourth?.t !== 'PUNCT' || fourth.v !== '(' || !onlyCallExpression(input.expression, 3)) return { kind: 'REJECT', code: 'RESPONSE_UNSUPPORTED_HELPER_SYNTAX' };
    if (input.declaration.namespacePresent) return { kind: 'REJECT', code: 'RESPONSE_DECLARATION_UNAPPROVED' };
    return { kind: 'CALL', target: { kind: 'NAMED_STATIC_METHOD', symbol: third.v, className: first.v } };
  }
  if (second?.t === 'PUNCT' && second.v === '(') {
    if (!onlyCallExpression(input.expression, 1)) return { kind: 'REJECT', code: 'RESPONSE_UNSUPPORTED_HELPER_SYNTAX' };
    if (UNSUPPORTED_BUILTIN_CALLS.has(first.v)) return { kind: 'REJECT', code: 'RESPONSE_DYNAMIC_DISPATCH' };
    return { kind: 'CALL', target: { kind: 'NAMED_FUNCTION', symbol: first.v, className: null } };
  }
  return { kind: 'NONE' };
}

function proofDigest(input: Omit<ResponseFlowProof, 'proofDigest'>): string {
  return safeSemanticDigest(input, 'response-flow');
}

function buildProof(input: {
  readonly status: ResponseFlowStatus;
  readonly depth: number;
  readonly rootDeclaration: ResponseFlowDeclaration | null;
  readonly declarations: readonly ResponseFlowDeclaration[];
  readonly edges: readonly ResponseFlowEdge[];
  readonly terminalDeclarationIds: readonly string[];
  readonly rejectionCode: ResponseFlowRejectionCode | null;
}): ResponseFlowProof {
  const core = {
    schemaVersion: REAL_SOURCE_RESPONSE_FLOW_VERSION,
    status: input.status,
    depth: input.depth,
    maxDepth: MAX_RESPONSE_FLOW_DEPTH,
    rootDeclaration: input.rootDeclaration,
    declarations: [...input.declarations].sort((left, right) => left.declarationId.localeCompare(right.declarationId)),
    edges: [...input.edges].sort((left, right) => left.callsiteId.localeCompare(right.callsiteId)),
    terminalDeclarationIds: [...new Set(input.terminalDeclarationIds)].sort(),
    rejectionCode: input.rejectionCode,
  } as const;
  return { ...core, proofDigest: proofDigest(core) };
}

function sourceBoundCandidates(input: {
  readonly index: ResponseFlowIndex;
  readonly query: { readonly repoId: string; readonly relativePath?: string; readonly symbol: string; readonly className?: string | null; readonly kind?: ResponseFlowDeclarationKind };
  readonly sourceSha: string;
}): { readonly candidates: readonly ResponseFlowDeclaration[]; readonly rejectionCode: ResponseFlowRejectionCode | null } {
  const candidates = input.index.find(input.query);
  if (candidates.some((candidate) => candidate.sourceSha !== input.sourceSha)) {
    return { candidates: [], rejectionCode: 'RESPONSE_DECLARATION_STALE' };
  }
  return { candidates, rejectionCode: null };
}

function resolveTarget(input: { readonly index: ResponseFlowIndex; readonly from: IndexedDeclaration; readonly target: CallTarget }): { readonly declaration: ResponseFlowDeclaration | null; readonly rejectionCode: ResponseFlowRejectionCode | null } {
  const target = input.target;
  if (target.kind === 'SAME_CLASS_METHOD' || target.kind === 'SELF_METHOD') {
    if (input.from.classUnsupported) return { declaration: null, rejectionCode: 'RESPONSE_DECLARATION_UNAPPROVED' };
    const result = sourceBoundCandidates({
      index: input.index,
      query: { repoId: input.from.repoId, relativePath: input.from.relativePath, symbol: target.symbol, className: target.className, kind: 'METHOD' },
      sourceSha: input.from.sourceSha,
    });
    if (result.rejectionCode !== null) return { declaration: null, rejectionCode: result.rejectionCode };
    if (result.candidates.length !== 1) return { declaration: null, rejectionCode: result.candidates.length === 0 ? 'RESPONSE_SYMBOL_MISSING' : 'RESPONSE_SYMBOL_AMBIGUOUS' };
    const declaration = result.candidates[0]!;
    const indexed = input.index.body(declaration);
    if (indexed === null) return { declaration: null, rejectionCode: 'RESPONSE_DECLARATION_UNAVAILABLE' };
    if (indexed.classUnsupported || (target.kind === 'SAME_CLASS_METHOD' ? indexed.isStatic : !indexed.isStatic)) {
      return { declaration: null, rejectionCode: 'RESPONSE_DECLARATION_UNAPPROVED' };
    }
    return { declaration, rejectionCode: null };
  }
  if (target.kind === 'NAMED_STATIC_METHOD') {
    if (input.from.namespacePresent || !SAFE_CLASS_RE.test(target.className ?? '')) return { declaration: null, rejectionCode: 'RESPONSE_DECLARATION_UNAPPROVED' };
    const result = sourceBoundCandidates({
      index: input.index,
      query: { repoId: input.from.repoId, symbol: target.symbol, className: target.className, kind: 'METHOD' },
      sourceSha: input.from.sourceSha,
    });
    if (result.rejectionCode !== null) return { declaration: null, rejectionCode: result.rejectionCode };
    if (result.candidates.length !== 1) return { declaration: null, rejectionCode: result.candidates.length === 0 ? 'RESPONSE_SYMBOL_MISSING' : 'RESPONSE_SYMBOL_AMBIGUOUS' };
    const declaration = result.candidates[0]!;
    const indexed = input.index.body(declaration);
    if (indexed === null) return { declaration: null, rejectionCode: 'RESPONSE_DECLARATION_UNAVAILABLE' };
    if (indexed.namespacePresent || indexed.classUnsupported || !indexed.isStatic || indexed.visibility !== 'PUBLIC') {
      return { declaration: null, rejectionCode: 'RESPONSE_DECLARATION_UNAPPROVED' };
    }
    return { declaration, rejectionCode: null };
  }
  if (input.from.namespacePresent) return { declaration: null, rejectionCode: 'RESPONSE_DECLARATION_UNAPPROVED' };
  const result = sourceBoundCandidates({
    index: input.index,
    query: { repoId: input.from.repoId, relativePath: input.from.relativePath, symbol: target.symbol, className: null, kind: 'FUNCTION' },
    sourceSha: input.from.sourceSha,
  });
  if (result.rejectionCode !== null) return { declaration: null, rejectionCode: result.rejectionCode };
  return result.candidates.length === 1 ? { declaration: result.candidates[0]!, rejectionCode: null } : { declaration: null, rejectionCode: result.candidates.length === 0 ? 'RESPONSE_SYMBOL_MISSING' : 'RESPONSE_SYMBOL_AMBIGUOUS' };
}

/** Resolve only exact static helper calls; all other flows return a category. */
export function resolveResponseFlow(input: { readonly index: ResponseFlowIndex; readonly operation: ResponseFlowOperation }): ResponseFlowProof {
  if (input.operation.handlerPath === null || input.operation.handlerSymbol === null) {
    return buildProof({ status: 'REJECTED', depth: 0, rootDeclaration: null, declarations: [], edges: [], terminalDeclarationIds: [], rejectionCode: 'RESPONSE_SYMBOL_MISSING' });
  }
  const rootCandidates = input.index.find({ repoId: input.operation.repository, relativePath: input.operation.handlerPath, symbol: input.operation.handlerSymbol });
  if (rootCandidates.some((candidate) => candidate.sourceSha !== input.operation.sourceSha)) {
    return buildProof({ status: 'REJECTED', depth: 0, rootDeclaration: null, declarations: [], edges: [], terminalDeclarationIds: [], rejectionCode: 'RESPONSE_DECLARATION_STALE' });
  }
  const roots = rootCandidates.filter((candidate) => candidate.sourceSha === input.operation.sourceSha);
  if (roots.length === 0) {
    const state = input.index.fileState(input.operation.repository, input.operation.handlerPath);
    const rejectionCode = state === 'SOURCE_STALE' ? 'RESPONSE_DECLARATION_STALE'
      : state === 'SOURCE_BUDGET_EXCEEDED' ? 'RESPONSE_SOURCE_BUDGET_EXCEEDED'
        : state === 'DECLARATION_INDEX_BUDGET_EXCEEDED' ? 'RESPONSE_DECLARATION_INDEX_BUDGET_EXCEEDED'
          : state === 'SOURCE_UNAVAILABLE' || state === 'LEXICAL_UNSUPPORTED' ? 'RESPONSE_DECLARATION_UNAVAILABLE'
            : 'RESPONSE_SYMBOL_MISSING';
    return buildProof({ status: 'REJECTED', depth: 0, rootDeclaration: null, declarations: [], edges: [], terminalDeclarationIds: [], rejectionCode });
  }
  if (roots.length !== 1) {
    return buildProof({ status: 'REJECTED', depth: 0, rootDeclaration: null, declarations: roots, edges: [], terminalDeclarationIds: [], rejectionCode: 'RESPONSE_SYMBOL_AMBIGUOUS' });
  }
  const root = roots[0]!;
  const declarations = new Map<string, ResponseFlowDeclaration>([[root.declarationId, root]]);
  const edges: ResponseFlowEdge[] = [];
  const terminals = new Set<string>();
  let maximumDepth = 0;
  let rejectionCode: ResponseFlowRejectionCode | null = null;
  let sawCall = false;

  const visit = (declaration: ResponseFlowDeclaration, depth: number, stack: readonly string[]): void => {
    if (rejectionCode !== null) return;
    maximumDepth = Math.max(maximumDepth, depth);
    const indexed = input.index.body(declaration);
    if (indexed === null) {
      rejectionCode = 'RESPONSE_DECLARATION_UNAVAILABLE';
      return;
    }
    const sitesResult = returnSites(indexed.tokens, indexed.body);
    if (sitesResult === null || (sitesResult !== null && isReturnSiteBudgetFailure(sitesResult))) {
      if (sitesResult !== null && isReturnSiteBudgetFailure(sitesResult)) rejectionCode = sitesResult.rejectionCode;
      else rejectionCode = 'RESPONSE_BRANCH_INCOMPLETE';
      return;
    }
    const sites = sitesResult;
    if (sites.length === 0) {
      rejectionCode = 'RESPONSE_BRANCH_INCOMPLETE';
      return;
    }
    const classifications = sites.map((site) => ({ site, classification: classifyCall({ declaration: indexed, expression: site.expression }) }));
    const rejected = classifications.find((entry) => entry.classification.kind === 'REJECT');
    if (rejected !== undefined) {
      rejectionCode = rejected.classification.kind === 'REJECT' ? rejected.classification.code : null;
      return;
    }
    const calls = classifications.filter((entry): entry is { readonly site: ReturnSite; readonly classification: { readonly kind: 'CALL'; readonly target: CallTarget } } => entry.classification.kind === 'CALL');
    if (calls.length === 0) {
      terminals.add(declaration.declarationId);
      return;
    }
    sawCall = true;
    if (calls.length !== sites.length) {
      rejectionCode = 'RESPONSE_BRANCH_INCOMPLETE';
      return;
    }
    if (depth >= MAX_RESPONSE_FLOW_DEPTH) {
      rejectionCode = 'RESPONSE_FLOW_DEPTH_EXCEEDED';
      return;
    }
    for (const entry of calls) {
      const targetResult = resolveTarget({ index: input.index, from: indexed, target: entry.classification.target });
      if (targetResult.declaration === null || targetResult.rejectionCode !== null) {
        rejectionCode = targetResult.rejectionCode ?? 'RESPONSE_DECLARATION_UNAPPROVED';
        return;
      }
      if (stack.includes(targetResult.declaration.declarationId)) {
        rejectionCode = 'RESPONSE_FLOW_CYCLE';
        return;
      }
      const alreadyKnown = declarations.has(targetResult.declaration.declarationId);
      if (!alreadyKnown && declarations.size >= MAX_RESPONSE_FLOW_DECLARATIONS) {
        rejectionCode = 'RESPONSE_FLOW_DECLARATIONS_EXCEEDED';
        return;
      }
      if (!alreadyKnown) declarations.set(targetResult.declaration.declarationId, targetResult.declaration);
      edges.push({
        callsiteId: callsiteId({ fromDeclarationId: declaration.declarationId, ordinal: entry.site.ordinal, target: entry.classification.target }),
        fromDeclarationId: declaration.declarationId,
        toDeclarationId: targetResult.declaration.declarationId,
        callKind: entry.classification.target.kind,
        ordinal: entry.site.ordinal,
      });
      if (!alreadyKnown) visit(targetResult.declaration, depth + 1, [...stack, targetResult.declaration.declarationId]);
      if (rejectionCode !== null) return;
    }
  };

  const rootBody = input.index.body(root);
  if (rootBody === null) return buildProof({ status: 'REJECTED', depth: 0, rootDeclaration: root, declarations: [root], edges: [], terminalDeclarationIds: [], rejectionCode: 'RESPONSE_DECLARATION_UNAVAILABLE' });
  const rootSitesResult = returnSites(rootBody.tokens, rootBody.body);
  if (rootSitesResult !== null && isReturnSiteBudgetFailure(rootSitesResult)) return buildProof({ status: 'REJECTED', depth: 0, rootDeclaration: root, declarations: [root], edges: [], terminalDeclarationIds: [], rejectionCode: rootSitesResult.rejectionCode });
  if (rootSitesResult === null || rootSitesResult.length === 0) return buildProof({ status: 'NOT_APPLICABLE', depth: 0, rootDeclaration: root, declarations: [root], edges: [], terminalDeclarationIds: [], rejectionCode: null });
  const rootSites = rootSitesResult;
  const rootClassifications = rootSites.map((site) => classifyCall({ declaration: rootBody, expression: site.expression }));
  if (!rootClassifications.some((classification) => classification.kind === 'CALL' || classification.kind === 'REJECT')) {
    return buildProof({ status: 'NOT_APPLICABLE', depth: 0, rootDeclaration: root, declarations: [root], edges: [], terminalDeclarationIds: [], rejectionCode: null });
  }
  visit(root, 0, [root.declarationId]);
  if (!sawCall || rejectionCode !== null || terminals.size === 0) {
    return buildProof({ status: 'REJECTED', depth: maximumDepth, rootDeclaration: root, declarations: [...declarations.values()], edges, terminalDeclarationIds: [...terminals], rejectionCode: rejectionCode ?? 'RESPONSE_BRANCH_INCOMPLETE' });
  }
  return buildProof({ status: 'PROVEN', depth: maximumDepth, rootDeclaration: root, declarations: [...declarations.values()], edges, terminalDeclarationIds: [...terminals], rejectionCode: null });
}
