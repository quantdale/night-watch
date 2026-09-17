// ---------------------------------------------------------------------------
// NW-HIST-004 (Wave 2) — bounded Go record-identity extraction.
//
// Scope boundary (permanent): this module NEVER executes product code, reads a
// store, contacts a network/database, or emits a finding. It extracts, from
// owner-declared functions only:
//
//   1. key shapes from `fmt.Sprintf('<format>', args...)` calls that are
//      structurally key-like (>= 2 delimiter-separated segments, every
//      fragment a safe structural literal, supported placeholder verbs).
//      Formats that are clearly message-like (any fragment carrying spaces or
//      unsafe characters) are counted as `nonKeyFormats` and skipped: a
//      declared function legitimately contains log/error strings. A format
//      that IS key-like but cannot be parsed (dynamic format, unsupported
//      verb, mixed delimiters) fails closed as EXTRACTION_AMBIGUOUS.
//   2. operation-role call tokens from a CLOSED vocabulary;
//   3. conditional-guard marker presence (`ConditionExpression`,
//      `attribute_not_exists`);
//   4. best-effort warning presence (`Warning`, `Warningf`).
//
// The shape grammar is deliberately narrower than C4's cache-key grammar and
// is NOT a general Go analysis framework: no dataflow, no call graph, no AST.
//
// Purity: tokenizer + pure functions only; no fs/child_process/network/env.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import { RECORD_IDENTITY_EXTRACTION_IDENTITY } from './recordIdentityContract';
import { tokenizeStaticSource, type StaticLexicalToken } from './lexical';

export const MAX_RECORD_IDENTITY_SOURCE_CHARS = 400_000;
export const MAX_RECORD_IDENTITY_ATOMS = 24;
export const MAX_RECORD_IDENTITY_SHAPES = 32;

const KEY_LITERAL_RE = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/;
const MAX_LITERAL_DIGIT_RUN = 5;
const KEY_DELIMITERS = ':|/._-';
const GO_PLACEHOLDER_RE = /^%[sdv]$/;

const CREATE_TOKENS = ['PutItem', 'PutRequest', 'CreateItem', 'CreateRequest', 'Put'] as const;
const READ_TOKENS = ['GetItem', 'GetRequest', 'Query', 'Scan'] as const;
const UPDATE_TOKENS = ['UpdateItem', 'UpdateRequest', 'Update'] as const;
const DELETE_TOKENS = ['DeleteItem', 'DeleteRequest', 'DeleteItemSingle', 'Delete'] as const;
const GUARD_TOKENS = ['ConditionExpression', 'attribute_not_exists'] as const;
const WARNING_TOKENS = ['Warning', 'Warningf'] as const;

export type RecordKeyAtom =
  | { readonly kind: 'LITERAL'; readonly text: string }
  | { readonly kind: 'VARIABLE' };

export interface RecordKeyShape {
  readonly delimiter: string;
  readonly atoms: readonly RecordKeyAtom[];
}

export interface RecordIdentityFunctionFacts {
  readonly symbol: string;
  readonly shapes: readonly { readonly shape: RecordKeyShape; readonly digest: string }[];
  readonly nonKeyFormats: number;
  readonly operations: {
    readonly creates: number;
    readonly reads: number;
    readonly updates: number;
    readonly deletes: number;
  };
  readonly conditionalGuard: 'PRESENT' | 'ABSENT' | 'NOT_APPLICABLE';
  readonly warningOnFailure: boolean;
}

export interface RecordIdentityExtraction {
  readonly functions: readonly RecordIdentityFunctionFacts[];
  readonly ambiguous: readonly { readonly symbol: string; readonly detail: string }[];
}

function shapeDigestValue(shape: RecordKeyShape): unknown {
  return {
    grammar: RECORD_IDENTITY_EXTRACTION_IDENTITY,
    delimiter: shape.delimiter,
    atoms: shape.atoms.map((atom) => (atom.kind === 'LITERAL' ? { kind: atom.kind, text: atom.text } : { kind: atom.kind })),
  };
}

export function recordKeyShapeDigest(shape: RecordKeyShape): string {
  return prefixedDigest24('rks', shapeDigestValue(shape));
}

function hasLongDigitRun(value: string): boolean {
  let run = 0;
  for (const character of value) {
    run = character >= '0' && character <= '9' ? run + 1 : 0;
    if (run > MAX_LITERAL_DIGIT_RUN) return true;
  }
  return false;
}

function isSafeFragment(value: string): boolean {
  return value.length > 0 && value.length <= 64 && KEY_LITERAL_RE.test(value) && !hasLongDigitRun(value);
}

function findGoFunctionBody(tokens: readonly StaticLexicalToken[], symbol: string): { start: number; end: number } | null {
  for (let index = 0; index + 1 < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.kind !== 'IDENTIFIER' || token.value !== 'func') continue;
    let cursor = index + 1;
    if (tokens[cursor]?.kind === 'PUNCT' && tokens[cursor]?.value === '(') {
      let depth = 0;
      for (; cursor < tokens.length; cursor += 1) {
        if (tokens[cursor]!.value === '(') depth += 1;
        if (tokens[cursor]!.value === ')') {
          depth -= 1;
          if (depth === 0) { cursor += 1; break; }
        }
      }
    }
    const name = tokens[cursor];
    if (name === undefined || name.kind !== 'IDENTIFIER' || name.value !== symbol) continue;
    let open = cursor + 1;
    if (tokens[open]?.kind === 'PUNCT' && tokens[open]?.value === '(') {
      let depth = 0;
      for (; open < tokens.length; open += 1) {
        if (tokens[open]!.value === '(') depth += 1;
        if (tokens[open]!.value === ')') {
          depth -= 1;
          if (depth === 0) { open += 1; break; }
        }
      }
    }
    let braceIndex = -1;
    for (let scan = open; scan < Math.min(tokens.length, open + 64); scan += 1) {
      const candidate = tokens[scan]!;
      if (candidate.kind === 'PUNCT' && candidate.value === '{') { braceIndex = scan; break; }
    }
    if (braceIndex === -1) return null;
    let depth = 0;
    for (let scan = braceIndex; scan < tokens.length; scan += 1) {
      const scanToken = tokens[scan]!;
      if (scanToken.kind === 'PUNCT' && scanToken.value === '{') depth += 1;
      if (scanToken.kind === 'PUNCT' && scanToken.value === '}') {
        depth -= 1;
        if (depth === 0) return { start: braceIndex, end: scan };
      }
    }
    return null;
  }
  return null;
}

function splitGoArguments(tokens: readonly StaticLexicalToken[], openIndex: number, closeIndex: number): StaticLexicalToken[][] | null {
  const parts: StaticLexicalToken[][] = [];
  let current: StaticLexicalToken[] = [];
  let depth = 0;
  for (let index = openIndex; index < closeIndex; index += 1) {
    const token = tokens[index]!;
    if (token.kind === 'PUNCT' && ['(', '[', '{'].includes(token.value)) depth += 1;
    if (token.kind === 'PUNCT' && [')', ']', '}'].includes(token.value)) {
      depth -= 1;
      if (depth < 0) return null;
    }
    if (token.kind === 'PUNCT' && token.value === ',' && depth === 0) {
      parts.push(current);
      current = [];
      continue;
    }
    current.push(token);
  }
  if (current.length > 0) parts.push(current);
  return parts;
}

type ParsedFormat =
  | { readonly kind: 'KEY_SHAPE'; readonly shape: RecordKeyShape }
  | { readonly kind: 'NON_KEY' }
  | { readonly kind: 'AMBIGUOUS'; readonly detail: string };

function parseIdentityFormat(format: string): ParsedFormat {
  if (format.length === 0 || format.length > 512) return { kind: 'AMBIGUOUS', detail: 'FORMAT_SIZE' };
  const separators = new Set<string>();
  for (const character of format) {
    if (character === '%' || /[A-Za-z0-9_]/.test(character)) continue;
    if (!KEY_DELIMITERS.includes(character)) return { kind: 'NON_KEY' };
    separators.add(character);
  }
  if (separators.size === 0) return { kind: 'NON_KEY' };
  if (separators.size > 1) return { kind: 'AMBIGUOUS', detail: 'MIXED_DELIMITERS' };
  const delimiter = [...separators][0]!;
  const atoms: RecordKeyAtom[] = [];
  let fragment = '';
  const flush = (): 'OK' | 'NON_KEY' | 'LIMIT' => {
    if (fragment === '') return 'OK';
    const value = fragment;
    fragment = '';
    if (!isSafeFragment(value)) return 'NON_KEY';
    atoms.push({ kind: 'LITERAL', text: value });
    if (atoms.length > MAX_RECORD_IDENTITY_ATOMS) return 'LIMIT';
    return 'OK';
  };
  for (let index = 0; index < format.length; index += 1) {
    const character = format[index]!;
    if (character === '%') {
      const verb = format[index + 1] ?? '';
      if (GO_PLACEHOLDER_RE.test(`%${verb}`)) {
        const flushed = flush();
        if (flushed === 'NON_KEY') return { kind: 'NON_KEY' };
        if (flushed === 'LIMIT') return { kind: 'AMBIGUOUS', detail: 'ATOM_LIMIT_EXCEEDED' };
        atoms.push({ kind: 'VARIABLE' });
        if (atoms.length > MAX_RECORD_IDENTITY_ATOMS) return { kind: 'AMBIGUOUS', detail: 'ATOM_LIMIT_EXCEEDED' };
        index += 1;
        continue;
      }
      if (verb === '%') {
        fragment += '%';
        index += 1;
        continue;
      }
      return { kind: 'AMBIGUOUS', detail: 'UNSUPPORTED_FORMAT_VERB' };
    }
    if (character === delimiter) {
      const flushed = flush();
      if (flushed === 'NON_KEY') return { kind: 'NON_KEY' };
      if (flushed === 'LIMIT') return { kind: 'AMBIGUOUS', detail: 'ATOM_LIMIT_EXCEEDED' };
      continue;
    }
    fragment += character;
  }
  const flushed = flush();
  if (flushed === 'NON_KEY') return { kind: 'NON_KEY' };
  if (flushed === 'LIMIT') return { kind: 'AMBIGUOUS', detail: 'ATOM_LIMIT_EXCEEDED' };
  const literals = atoms.filter((atom) => atom.kind === 'LITERAL').length;
  if (atoms.length < 2 || literals === 0) return { kind: 'NON_KEY' };
  return { kind: 'KEY_SHAPE', shape: { delimiter, atoms } };
}

function extractFunctionFacts(
  tokens: readonly StaticLexicalToken[],
  symbol: string,
): { facts: RecordIdentityFunctionFacts | null; ambiguous: string | null } {
  const body = findGoFunctionBody(tokens, symbol);
  if (body === null) return { facts: null, ambiguous: 'FUNCTION_NOT_FOUND' };
  const inside = tokens.slice(body.start, body.end + 1);
  const shapes: { shape: RecordKeyShape; digest: string }[] = [];
  let nonKeyFormats = 0;
  let ambiguous: string | null = null;
  let creates = 0;
  let reads = 0;
  let updates = 0;
  let deletes = 0;
  let guard = false;
  let warning = false;
  for (let index = 0; index < inside.length; index += 1) {
    const token = inside[index]!;
    if (token.kind !== 'IDENTIFIER') continue;
    const value = token.value;
    if ((CREATE_TOKENS as readonly string[]).includes(value)) { creates += 1; continue; }
    if ((READ_TOKENS as readonly string[]).includes(value)) { reads += 1; continue; }
    if ((UPDATE_TOKENS as readonly string[]).includes(value)) { updates += 1; continue; }
    if ((DELETE_TOKENS as readonly string[]).includes(value)) { deletes += 1; continue; }
    if ((GUARD_TOKENS as readonly string[]).includes(value)) { guard = true; continue; }
    if ((WARNING_TOKENS as readonly string[]).includes(value)) { warning = true; continue; }
    if (value !== 'Sprintf') continue;
    const open = inside[index + 1];
    if (open === undefined || open.kind !== 'PUNCT' || open.value !== '(') continue;
    let depth = 0;
    let close = -1;
    for (let cursor = index + 1; cursor < inside.length; cursor += 1) {
      if (inside[cursor]!.value === '(') depth += 1;
      if (inside[cursor]!.value === ')') {
        depth -= 1;
        if (depth === 0) { close = cursor; break; }
      }
    }
    if (close === -1) { ambiguous = ambiguous ?? 'UNTERMINATED_CALL'; continue; }
    const args = splitGoArguments(inside, index + 2, close);
    const formatToken = args?.[0]?.[0];
    if (args === null || args.length === 0 || formatToken === undefined || formatToken.kind !== 'STRING' || (args[0]?.length ?? 0) !== 1) {
      ambiguous = ambiguous ?? 'DYNAMIC_FORMAT';
      continue;
    }
    const parsed = parseIdentityFormat(formatToken.value);
    if (parsed.kind === 'NON_KEY') { nonKeyFormats += 1; continue; }
    if (parsed.kind === 'AMBIGUOUS') { ambiguous = ambiguous ?? parsed.detail; continue; }
    shapes.push({ shape: parsed.shape, digest: recordKeyShapeDigest(parsed.shape) });
    if (shapes.length > MAX_RECORD_IDENTITY_SHAPES) { ambiguous = ambiguous ?? 'SHAPE_LIMIT_EXCEEDED'; break; }
  }
  const writeOps = creates + updates + deletes;
  const conditionalGuard: RecordIdentityFunctionFacts['conditionalGuard'] =
    guard ? 'PRESENT' : writeOps > 0 ? 'ABSENT' : 'NOT_APPLICABLE';
  return {
    facts: {
      symbol,
      shapes,
      nonKeyFormats,
      operations: { creates, reads, updates, deletes },
      conditionalGuard,
      warningOnFailure: warning,
    },
    ambiguous,
  };
}

/** Bounded extraction over the declared function symbols of one source text. */
export function extractRecordIdentityFacts(
  source: string,
  options: { readonly functions: readonly string[] },
): RecordIdentityExtraction {
  if (source.length > MAX_RECORD_IDENTITY_SOURCE_CHARS) {
    return { functions: [], ambiguous: [{ symbol: '', detail: 'SOURCE_TOO_LARGE' }] };
  }
  const tokens = tokenizeStaticSource(source, 'GO');
  if (tokens === null) return { functions: [], ambiguous: [{ symbol: '', detail: 'LEXICAL_LIMIT_EXCEEDED' }] };
  const functions: RecordIdentityFunctionFacts[] = [];
  const ambiguous: { symbol: string; detail: string }[] = [];
  for (const symbol of options.functions) {
    const extracted = extractFunctionFacts(tokens, symbol);
    if (extracted.facts !== null) functions.push(extracted.facts);
    if (extracted.ambiguous !== null) ambiguous.push({ symbol, detail: extracted.ambiguous });
  }
  return { functions, ambiguous };
}
