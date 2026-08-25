// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — bounded syntax-aware PHP source extractor (SPEC
// §13, §14, §41).
//
// Deterministic lexical extraction ONLY: this module tokenizes PHP source
// text and finds bounded structural patterns (function bodies, `$acc[] = [...]`
// / `$acc = [...]` row literals, `return $acc;`, builder pushes, Routing.yaml
// route bindings). It NEVER executes application code, never imports sibling
// code, never runs child processes, never evaluates expressions, and never
// uses unbounded regex as semantic authority. Unsupported constructs fail
// with bounded classifications — admission is never weakened to fit the
// source.
//
// This module performs NO persistence and NO network I/O (hardening guard).
// ---------------------------------------------------------------------------

import type {
  RealSourceDerivationFailure,
  SourceExtraction,
} from '../recipes/types';
import type { ProjectionNodeType } from '../../projections/types';

export type PhpLexFailure =
  | 'SOURCE_TOO_LARGE'
  | 'FUNCTION_NOT_FOUND'
  | 'ACCUMULATOR_NOT_FOUND'
  | 'NO_ROW_LITERAL'
  | 'TOP_LEVEL_NOT_ARRAY'
  | 'ITEM_KEYS_MISMATCH'
  | 'ROUTE_NOT_FOUND'
  | 'ROUTE_BINDING_MISMATCH'
  | 'BUILDER_PUSH_NOT_FOUND'
  | 'TYPE_FLOW_AMBIGUOUS';

export type PhpExtractionResult =
  | { readonly ok: true; readonly extraction: SourceExtraction }
  | { readonly ok: false; readonly failure: PhpLexFailure; readonly detail?: string };

const MAX_SOURCE_CHARS = 2_000_000;
const MAX_TOKENS = 500_000;
const MAX_ROW_LITERAL_KEYS = 64;
const MAX_KEY_LENGTH = 128;
const MAX_FUNCTION_CHARS = 400_000;
const MAX_ROUTE_BLOCK_LINES = 60;

// ---------------------------------------------------------------------------
// Tokenizer (deterministic, bounded).
// ---------------------------------------------------------------------------

export type PhpToken =
  | { readonly t: 'WORD'; readonly v: string }
  | { readonly t: 'VARIABLE'; readonly v: string }
  | { readonly t: 'STRING'; readonly v: string; readonly oversized?: boolean }
  | { readonly t: 'NUMBER'; readonly v: string }
  | { readonly t: 'PUNCT'; readonly v: string }
  | { readonly t: 'OP'; readonly v: string };

export function tokenizePhp(sourceText: string): PhpToken[] {
  const tokens: PhpToken[] = [];
  const n = sourceText.length;
  let i = 0;
  while (i < n) {
    if (tokens.length > MAX_TOKENS) throw new Error('PHP_LEX:token-limit');
    const ch = sourceText[i]!;
    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n' || ch === '\f' || ch === '\v') {
      i += 1;
      continue;
    }
    // Comments
    if (ch === '/' && sourceText[i + 1] === '/') {
      while (i < n && sourceText[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '#') {
      while (i < n && sourceText[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && sourceText[i + 1] === '*') {
      const end = sourceText.indexOf('*/', i + 2);
      if (end === -1) break; // unterminated comment: treat as EOF
      i = end + 2;
      continue;
    }
    // Single-quoted string
    if (ch === "'") {
      let j = i + 1;
      let out = '';
      let oversized = false;
      const append = (value: string): void => {
        if (oversized) return;
        if (out.length + value.length > MAX_KEY_LENGTH) {
          // String contents are never semantic authority here. Preserve only
          // the fact that this was an oversized opaque literal so callers can
          // reject it when it appears in a structural-key position while
          // still allowing unrelated string values to be lexed.
          out = '';
          oversized = true;
          return;
        }
        out += value;
      };
      while (j < n) {
        const c = sourceText[j]!;
        if (c === '\\' && (sourceText[j + 1] === "'" || sourceText[j + 1] === '\\')) {
          append(sourceText[j + 1]!);
          j += 2;
          continue;
        }
        if (c === "'") break;
        append(c);
        j += 1;
      }
      tokens.push(oversized ? { t: 'STRING', v: '', oversized: true } : { t: 'STRING', v: out });
      i = Math.min(j + 1, n);
      continue;
    }
    // Double-quoted string (simple scan: no interpolation expansion; the
    // admitted sources use single-quoted keys).
    if (ch === '"') {
      let j = i + 1;
      let out = '';
      let oversized = false;
      const append = (value: string): void => {
        if (oversized) return;
        if (out.length + value.length > MAX_KEY_LENGTH) {
          out = '';
          oversized = true;
          return;
        }
        out += value;
      };
      while (j < n) {
        const c = sourceText[j]!;
        if (c === '\\') {
          append(c);
          j += 1;
          if (j < n) {
            append(sourceText[j]!);
            j += 1;
          }
          continue;
        }
        if (c === '"') break;
        append(c);
        j += 1;
      }
      tokens.push(oversized ? { t: 'STRING', v: '', oversized: true } : { t: 'STRING', v: out });
      i = Math.min(j + 1, n);
      continue;
    }
    // Variable
    if (ch === '$') {
      let j = i + 1;
      let name = '';
      while (j < n && /[A-Za-z0-9_]/.test(sourceText[j]!)) {
        name += sourceText[j]!;
        j += 1;
      }
      if (name.length === 0) {
        tokens.push({ t: 'PUNCT', v: '$' });
        i += 1;
        continue;
      }
      tokens.push({ t: 'VARIABLE', v: name });
      i = j;
      continue;
    }
    // Word / identifier
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      let name = '';
      while (j < n && /[A-Za-z0-9_]/.test(sourceText[j]!)) {
        name += sourceText[j]!;
        j += 1;
      }
      tokens.push({ t: 'WORD', v: name });
      i = j;
      continue;
    }
    // Number
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < n && /[0-9.]/.test(sourceText[j]!)) j += 1;
      tokens.push({ t: 'NUMBER', v: sourceText.slice(i, j) });
      i = j;
      continue;
    }
    // Two-char operators we care about
    const pair = sourceText.slice(i, i + 2);
    if (pair === '=>' || pair === '->' || pair === '::' || pair === '??' || pair === '?->') {
      tokens.push({ t: 'OP', v: pair });
      i += 2;
      continue;
    }
    // Single punctuation / operator char
    tokens.push({ t: 'PUNCT', v: ch });
    i += 1;
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Structural helpers
// ---------------------------------------------------------------------------

export function findFunctionBody(tokens: PhpToken[], symbol: string): { start: number; end: number } | null {
  for (let i = 0; i + 1 < tokens.length; i++) {
    const current = tokens[i]!;
    if (current.t !== 'WORD' || current.v !== 'function') continue;
    const name = tokens[i + 1];
    if (name === undefined || name.t !== 'WORD' || name.v !== symbol) continue;
    let depth = 0;
    let j = i + 2;
    let sawParen = false;
    for (; j < tokens.length; j++) {
      const token = tokens[j]!;
      if (token.t === 'PUNCT' && token.v === '(') {
        sawParen = true;
        depth += 1;
      } else if (token.t === 'PUNCT' && token.v === ')') {
        depth -= 1;
        if (depth === 0 && sawParen) {
          for (let k = j + 1; k < tokens.length; k++) {
            const next = tokens[k]!;
            if (next.t === 'PUNCT' && next.v === '{') return { start: k, end: findMatchingBrace(tokens, k) };
            if (next.t === 'PUNCT' && next.v === ';') break; // abstract method
          }
        }
      }
    }
    return null;
  }
  return null;
}

export function findMatchingBrace(tokens: PhpToken[], openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.t === 'PUNCT' && token.v === '{') depth += 1;
    if (token.t === 'PUNCT' && token.v === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return tokens.length;
}

/** Find the matching `]` for a `[` at openIndex (bracket depth tracking). */
export function findMatchingBracket(tokens: PhpToken[], openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.t === 'PUNCT' && token.v === '[') depth += 1;
    if (token.t === 'PUNCT' && token.v === ']') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return tokens.length;
}

/** Extract top-level `'key' =>` string-key entries of an array literal whose
 *  opening `[` is at openIndex. Returns keys in source order. */
export function extractLiteralKeys(tokens: PhpToken[], openIndex: number): string[] {
  const close = findMatchingBracket(tokens, openIndex);
  const keys: string[] = [];
  let depth = 0;
  for (let i = openIndex + 1; i < close; i++) {
    const token = tokens[i]!;
    if (token.t === 'PUNCT' && token.v === '[') {
      depth += 1;
      continue;
    }
    if (token.t === 'PUNCT' && token.v === ']') {
      depth -= 1;
      continue;
    }
    if (depth !== 0) continue;
    if (token.t === 'STRING' && token.oversized !== true) {
      const next = tokens[i + 1];
      if (next !== undefined && next.t === 'OP' && next.v === '=>') {
        if (keys.length < MAX_ROW_LITERAL_KEYS) keys.push(token.v);
      }
    }
  }
  return keys;
}

function isReturnOfAccumulator(tokens: PhpToken[], returnIndex: number, accumulator: string): boolean {
  const next = tokens[returnIndex + 1];
  if (next === undefined) return false;
  if (next.t === 'VARIABLE' && next.v === accumulator) return true;
  // `return $this->...->method($acc, ...)` — the accumulator as the FIRST
  // argument of a row-level method call (e.g. rbac->filter), skipping any
  // number of `->method` hops.
  if (next.t === 'VARIABLE' && next.v === 'this') {
    let i = returnIndex + 2;
    while (
      i + 1 < tokens.length &&
      tokens[i]?.t === 'OP' &&
      tokens[i]?.v === '->' &&
      tokens[i + 1]?.t === 'WORD'
    ) {
      i += 2;
      if (tokens[i]?.t === 'PUNCT' && tokens[i]?.v === '(') {
        const firstArg = tokens[i + 1];
        if (firstArg !== undefined && firstArg.t === 'VARIABLE' && firstArg.v === accumulator) return true;
        return false;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Extractor 1 — PHP_FUNCTION_LIST_ROW_KEYS (PUSH | ASSIGN)
// ---------------------------------------------------------------------------

export function extractPhpFunctionListRowKeys(
  sourceText: string,
  symbol: string,
  accumulator: string,
  pattern: 'PUSH' | 'ASSIGN',
): PhpExtractionResult {
  if (sourceText.length > MAX_SOURCE_CHARS) return { ok: false, failure: 'SOURCE_TOO_LARGE' };
  let tokens: PhpToken[];
  try {
    tokens = tokenizePhp(sourceText);
  } catch {
    return { ok: false, failure: 'SOURCE_TOO_LARGE', detail: 'token-limit' };
  }
  const body = findFunctionBody(tokens, symbol);
  if (body === null) return { ok: false, failure: 'FUNCTION_NOT_FOUND', detail: symbol };
  if (body.end - body.start > MAX_FUNCTION_CHARS) return { ok: false, failure: 'SOURCE_TOO_LARGE', detail: 'function-body' };

  const literalOpeners: number[] = [];
  let foundReturn = false;
  let topLevelReturnOfAccumulator = false;
  for (let i = body.start + 1; i < body.end; i++) {
    const token = tokens[i]!;
    if (token.t === 'WORD' && token.v === 'return') {
      foundReturn = true;
      if (isReturnOfAccumulator(tokens, i, accumulator)) topLevelReturnOfAccumulator = true;
      continue;
    }
    if (token.t !== 'VARIABLE' || token.v !== accumulator) continue;
    const at = tokens[i + 1];
    if (pattern === 'PUSH') {
      if (
        at?.t === 'PUNCT' && at.v === '[' &&
        tokens[i + 2]?.t === 'PUNCT' && tokens[i + 2]?.v === ']' &&
        tokens[i + 3]?.t === 'PUNCT' && tokens[i + 3]?.v === '=' &&
        tokens[i + 4]?.t === 'PUNCT' && tokens[i + 4]?.v === '['
      ) {
        literalOpeners.push(i + 4);
      }
    } else {
      // ASSIGN: `$acc = [` (not `$acc[] = [`).
      if (
        at?.t === 'PUNCT' && at.v === '=' &&
        tokens[i + 2]?.t === 'PUNCT' && tokens[i + 2]?.v === '['
      ) {
        literalOpeners.push(i + 2);
      }
    }
  }

  if (literalOpeners.length === 0) {
    return { ok: false, failure: 'ACCUMULATOR_NOT_FOUND', detail: accumulator };
  }
  if (!foundReturn) return { ok: false, failure: 'TOP_LEVEL_NOT_ARRAY', detail: 'no-return' };
  if (!topLevelReturnOfAccumulator) {
    return { ok: false, failure: 'TOP_LEVEL_NOT_ARRAY', detail: 'return-not-accumulator' };
  }

  const keySets = literalOpeners.map((openIndex) => extractLiteralKeys(tokens, openIndex));
  const nonEmpty = keySets.filter((keys) => keys.length > 0);
  if (nonEmpty.length === 0) return { ok: false, failure: 'NO_ROW_LITERAL' };
  const first = [...nonEmpty[0]!].sort();
  for (const keys of nonEmpty) {
    const sorted = [...keys].sort();
    if (sorted.length !== first.length || sorted.some((k, idx) => k !== first[idx])) {
      return { ok: false, failure: 'ITEM_KEYS_MISMATCH' };
    }
  }
  return {
    ok: true,
    extraction: {
      kind: 'PHP_FUNCTION_LIST_ROW_KEYS',
      symbol,
      pattern,
      itemKeys: first,
      rowLiteralCount: literalOpeners.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Extractor 2 — PHP_FUNCTION_RETURNS_LIST_OF_BUILDER
// ---------------------------------------------------------------------------

export function extractPhpFunctionReturnsListOfBuilder(
  sourceText: string,
  symbol: string,
  accumulator: string,
  builderSymbol: string,
): PhpExtractionResult {
  if (sourceText.length > MAX_SOURCE_CHARS) return { ok: false, failure: 'SOURCE_TOO_LARGE' };
  let tokens: PhpToken[];
  try {
    tokens = tokenizePhp(sourceText);
  } catch {
    return { ok: false, failure: 'SOURCE_TOO_LARGE', detail: 'token-limit' };
  }
  const body = findFunctionBody(tokens, symbol);
  if (body === null) return { ok: false, failure: 'FUNCTION_NOT_FOUND', detail: symbol };
  if (body.end - body.start > MAX_FUNCTION_CHARS) return { ok: false, failure: 'SOURCE_TOO_LARGE', detail: 'function-body' };

  let pushCount = 0;
  let returnsAccumulatorList = false;
  for (let i = body.start + 1; i < body.end; i++) {
    const token = tokens[i]!;
    if (
      token.t === 'VARIABLE' && token.v === accumulator &&
      tokens[i + 1]?.t === 'PUNCT' && tokens[i + 1]?.v === '[' &&
      tokens[i + 2]?.t === 'PUNCT' && tokens[i + 2]?.v === ']' &&
      tokens[i + 3]?.t === 'PUNCT' && tokens[i + 3]?.v === '=' &&
      tokens[i + 4]?.t === 'VARIABLE' && tokens[i + 4]?.v === 'this' &&
      tokens[i + 5]?.t === 'OP' && tokens[i + 5]?.v === '->' &&
      tokens[i + 6]?.t === 'WORD' && tokens[i + 6]?.v === builderSymbol &&
      tokens[i + 7]?.t === 'PUNCT' && tokens[i + 7]?.v === '('
    ) {
      pushCount += 1;
    }
    if (token.t === 'WORD' && token.v === 'return' && isReturnOfAccumulator(tokens, i, accumulator)) {
      returnsAccumulatorList = true;
    }
  }

  if (pushCount === 0) {
    return { ok: false, failure: 'BUILDER_PUSH_NOT_FOUND', detail: builderSymbol };
  }
  if (!returnsAccumulatorList) {
    return { ok: false, failure: 'TOP_LEVEL_NOT_ARRAY', detail: 'return-not-accumulator' };
  }
  return {
    ok: true,
    extraction: {
      kind: 'PHP_FUNCTION_RETURNS_LIST_OF_BUILDER',
      symbol,
      builderSymbol,
      pushCount,
      returnsAccumulatorList: true,
    },
  };
}

// ---------------------------------------------------------------------------
// Extractor 3 — PHP_ROUTE_GET_BINDING (Routing.yaml)
// ---------------------------------------------------------------------------

export function extractPhpRouteGetBinding(
  sourceText: string,
  routePath: string,
  client: string,
  method: string,
): PhpExtractionResult {
  if (sourceText.length > MAX_SOURCE_CHARS) return { ok: false, failure: 'SOURCE_TOO_LARGE' };
  const lines = sourceText.split(/\r?\n/);
  if (lines.length > 100_000) return { ok: false, failure: 'SOURCE_TOO_LARGE', detail: 'lines' };
  const routeKey = `"get:${routePath}":`;
  let routeLine = -1;
  let routeIndent = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (trimmed === routeKey) {
      routeLine = i;
      routeIndent = line.length - trimmed.length;
      break;
    }
  }
  if (routeLine === -1) return { ok: false, failure: 'ROUTE_NOT_FOUND', detail: routePath };

  let foundClient: string | null = null;
  let foundMethod: string | null = null;
  for (let i = routeLine + 1; i < lines.length && i <= routeLine + MAX_ROUTE_BLOCK_LINES; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    if (indent <= routeIndent) break; // block ended
    const clientMatch = /^client:\s*(.+)$/.exec(trimmed);
    if (clientMatch !== null && foundClient === null) foundClient = clientMatch[1]!.trim();
    const methodMatch = /^method:\s*(.+)$/.exec(trimmed);
    if (methodMatch !== null && foundMethod === null) foundMethod = methodMatch[1]!.trim();
  }
  if (foundClient === null || foundMethod === null) {
    return { ok: false, failure: 'ROUTE_BINDING_MISMATCH', detail: 'binding-missing' };
  }
  if (foundClient !== client || foundMethod !== method) {
    return {
      ok: false,
      failure: 'ROUTE_BINDING_MISMATCH',
      detail: `client:${foundClient} method:${foundMethod}`,
    };
  }
  return {
    ok: true,
    extraction: { kind: 'PHP_ROUTE_GET_BINDING', routePath, client, method, found: true },
  };
}

// ---------------------------------------------------------------------------
// Extractor 4 — PHP_ITEM_FIELD_TYPE_FLOW (Phase 10A)
//
// Proves the JSON type set a row field variable can serialize to, from a
// FIXED assignment-pattern vocabulary inside ONE function body:
//
//   EMPTY_CAST_OBJECT          `$var = []` inits + at least one
//                              `if (empty($var)) { $var = (object)$var; }`
//                              + no other assignment + row-literal binding
//                              => allowedJsonTypes ['OBJECT']
//   EMPTY_ARRAY_OR_STRING_KEYS `$var = []` inits + ZERO casts + at least one
//                              `$var[...] =` subscript + no other assignment
//                              + row-literal binding
//                              => allowedJsonTypes ['OBJECT','ARRAY']
//
// The decision table is fixed and exhaustive: any other assignment pattern
// (reassignment to a scalar, a cast of a different variable, an unguarded
// cast, a missing row binding, ...) is TYPE_FLOW_AMBIGUOUS — admission is
// NEVER weakened to fit the source. Type is never inferred from variable
// names; only these literal token patterns count.
//
// `$var = (object)$var` is the ONLY recognized cast assignment; `$var = []`
// is the ONLY recognized non-subscript value assignment. A `$var[...] =`
// subscript is counted as subscriptAssignments regardless of the key
// expression (runtime keys keep the JSON class OBJECT as long as the keys
// are strings; numeric-string key collapse is a product config defect, not
// a legitimate representation — documented residual, SPEC Phase 10A §5).
// ---------------------------------------------------------------------------

export function extractPhpItemFieldTypeFlow(
  sourceText: string,
  symbol: string,
  fieldVariable: string,
  pattern: 'EMPTY_CAST_OBJECT' | 'EMPTY_ARRAY_OR_STRING_KEYS',
): PhpExtractionResult {
  if (sourceText.length > MAX_SOURCE_CHARS) return { ok: false, failure: 'SOURCE_TOO_LARGE' };
  let tokens: PhpToken[];
  try {
    tokens = tokenizePhp(sourceText);
  } catch {
    return { ok: false, failure: 'SOURCE_TOO_LARGE', detail: 'token-limit' };
  }
  const body = findFunctionBody(tokens, symbol);
  if (body === null) return { ok: false, failure: 'FUNCTION_NOT_FOUND', detail: symbol };
  if (body.end - body.start > MAX_FUNCTION_CHARS) return { ok: false, failure: 'SOURCE_TOO_LARGE', detail: 'function-body' };

  let arrayInitSites = 0;
  let emptyGuardedCastSites = 0;
  let subscriptAssignments = 0;
  let otherAssignments = 0;
  let rowFieldBinding = false;

  for (let i = body.start + 1; i < body.end; i++) {
    const token = tokens[i]!;
    // `'<field>' => $<fieldVariable>` row-literal binding (anywhere in the
    // function body; the field name is unique per row literal).
    if (
      token.t === 'STRING' && token.v === fieldVariable &&
      tokens[i + 1]?.t === 'OP' && tokens[i + 1]?.v === '=>' &&
      tokens[i + 2]?.t === 'VARIABLE' && tokens[i + 2]?.v === fieldVariable
    ) {
      rowFieldBinding = true;
      continue;
    }
    if (token.t !== 'VARIABLE' || token.v !== fieldVariable) continue;
    const at = tokens[i + 1];
    if (at === undefined) continue;
    // `$var[` — subscript assignment `$var[...] =`.
    if (at.t === 'PUNCT' && at.v === '[') {
      const close = findMatchingBracket(tokens, i + 1);
      if (close < tokens.length && tokens[close + 1]?.t === 'PUNCT' && tokens[close + 1]?.v === '=') {
        subscriptAssignments += 1;
      }
      continue;
    }
    if (at.t === 'PUNCT' && at.v === '=') {
      const rhs = tokens[i + 2];
      // `$var = []` (empty or non-empty array literal initialization).
      if (rhs?.t === 'PUNCT' && rhs.v === '[') {
        arrayInitSites += 1;
        continue;
      }
      // `$var = (object)$var` — the recognized cast assignment.
      if (
        rhs?.t === 'PUNCT' && rhs.v === '(' &&
        tokens[i + 3]?.t === 'WORD' && tokens[i + 3]?.v === 'object' &&
        tokens[i + 4]?.t === 'PUNCT' && tokens[i + 4]?.v === ')' &&
        tokens[i + 5]?.t === 'VARIABLE' && tokens[i + 5]?.v === fieldVariable
      ) {
        // Only an empty-guarded cast counts: the cast statement must sit
        // inside a body whose nearest preceding `if (...)` condition tests
        // `empty($fieldVariable)`.
        if (isEmptyGuardedCast(tokens, body.start, i, fieldVariable)) {
          emptyGuardedCastSites += 1;
        } else {
          otherAssignments += 1;
        }
        continue;
      }
      // Any other `$var =` RHS is an unproven assignment pattern.
      otherAssignments += 1;
    }
  }

  let allowedJsonTypes: readonly ProjectionNodeType[];
  if (pattern === 'EMPTY_CAST_OBJECT') {
    if (arrayInitSites >= 1 && emptyGuardedCastSites >= 1 && otherAssignments === 0 && rowFieldBinding) {
      allowedJsonTypes = ['OBJECT'];
    } else {
      return {
        ok: false,
        failure: 'TYPE_FLOW_AMBIGUOUS',
        detail: `pattern:${pattern} init:${arrayInitSites} cast:${emptyGuardedCastSites} other:${otherAssignments} binding:${rowFieldBinding}`,
      };
    }
  } else {
    if (arrayInitSites >= 1 && emptyGuardedCastSites === 0 && subscriptAssignments >= 1 && otherAssignments === 0 && rowFieldBinding) {
      allowedJsonTypes = ['OBJECT', 'ARRAY'];
    } else {
      return {
        ok: false,
        failure: 'TYPE_FLOW_AMBIGUOUS',
        detail: `pattern:${pattern} init:${arrayInitSites} cast:${emptyGuardedCastSites} subscript:${subscriptAssignments} other:${otherAssignments} binding:${rowFieldBinding}`,
      };
    }
  }

  return {
    ok: true,
    extraction: {
      kind: 'PHP_ITEM_FIELD_TYPE_FLOW',
      symbol,
      fieldVariable,
      pattern,
      arrayInitSites,
      emptyGuardedCastSites,
      subscriptAssignments,
      otherAssignments,
      rowFieldBinding,
      allowedJsonTypes,
    },
  };
}

/** Whether the assignment at `assignIndex` (`$var = (object)$var`) is guarded
 *  by a preceding `if (empty($var)) {` at the same nesting level. Scans the
 *  function body backwards for the nearest `if` whose condition contains
 *  `empty($fieldVariable)` and whose body `{` immediately precedes the
 *  assignment. Bounded lexical check; no control-flow interpretation. */
function isEmptyGuardedCast(tokens: PhpToken[], bodyStart: number, assignIndex: number, fieldVariable: string): boolean {
  let depth = 0;
  for (let i = assignIndex - 1; i > bodyStart; i--) {
    const token = tokens[i]!;
    if (token.t === 'PUNCT' && token.v === '}') {
      depth += 1;
      continue;
    }
    if (token.t === 'PUNCT' && token.v === '{') {
      if (depth === 0) {
        // The block that contains the cast assignment — find its opening
        // `if (` and check the condition for `empty($fieldVariable)`.
        if (tokens[i - 1]?.t === 'PUNCT' && tokens[i - 1]?.v === ')') {
          let j = i - 2;
          let condDepth = 1;
          while (j > bodyStart && condDepth > 0) {
            const c = tokens[j]!;
            if (c.t === 'PUNCT' && c.v === ')') condDepth += 1;
            if (c.t === 'PUNCT' && c.v === '(') condDepth -= 1;
            j -= 1;
          }
          // The token before the condition parens must be WORD 'if'.
          if (tokens[j]?.t !== 'WORD' || tokens[j]?.v !== 'if') return false;
          // Condition must contain empty($fieldVariable).
          for (let m = j + 1; m < i - 1; m++) {
            const c = tokens[m]!;
            if (
              c.t === 'WORD' && c.v === 'empty' &&
              tokens[m + 1]?.t === 'PUNCT' && tokens[m + 1]?.v === '(' &&
              tokens[m + 2]?.t === 'VARIABLE' && tokens[m + 2]?.v === fieldVariable
            ) {
              return true;
            }
          }
          return false;
        }
        return false;
      }
      depth -= 1;
      continue;
    }
  }
  return false;
}

/** Map a lexical failure to the recipe-level derivation failure vocabulary. */
export function phpFailureToDerivationFailure(failure: PhpLexFailure): RealSourceDerivationFailure {
  switch (failure) {
    case 'SOURCE_TOO_LARGE':
      return 'EXTRACTION_UNSUPPORTED';
    case 'FUNCTION_NOT_FOUND':
      return 'FUNCTION_NOT_FOUND';
    case 'ACCUMULATOR_NOT_FOUND':
      return 'ACCUMULATOR_NOT_FOUND';
    case 'NO_ROW_LITERAL':
      return 'NO_ROW_LITERAL';
    case 'TOP_LEVEL_NOT_ARRAY':
      return 'TOP_LEVEL_NOT_ARRAY';
    case 'ITEM_KEYS_MISMATCH':
      return 'ITEM_KEYS_MISMATCH';
    case 'ROUTE_NOT_FOUND':
      return 'ROUTE_NOT_FOUND';
    case 'ROUTE_BINDING_MISMATCH':
      return 'ROUTE_BINDING_MISMATCH';
    case 'BUILDER_PUSH_NOT_FOUND':
      return 'BUILDER_PUSH_NOT_FOUND';
    case 'TYPE_FLOW_AMBIGUOUS':
      return 'TYPE_FLOW_AMBIGUOUS';
  }
}
