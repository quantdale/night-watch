// ---------------------------------------------------------------------------
// Nightwatch Phase 14A — versioned, deterministic mechanical-contract analyzer
// (SPEC §5, §6; WORKSTREAM_B).
//
// A theorem prover over a deliberately SMALL source vocabulary. It never
// executes application code, never imports sibling code, never runs child
// processes, never evaluates expressions, and never uses unbounded regex as
// semantic authority. Every admitted fact must be mechanically derivable from
// bounded static source (PHP source text or an authoritative generated/
// interface schema blob) or it fails closed with a precise blocker code.
//
// Runtime likelihood is NOT proof:
//   - a database column named `exchange_rate` does not prove a type;
//   - a route named `billing-groups` does not prove an envelope shape;
//   - a comment saying "chunked" does not prove transport semantics;
//   - one conditional branch with a literal schema does not prove all
//     branches share that schema.
//
// The analyzer VERSION is load-bearing in the derivation identity (SPEC §5):
// it participates in the normalized evidence digest.
//
// This module performs NO persistence and NO network I/O (hardening guard).
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import {
  extractLiteralKeys,
  extractPhpFunctionListRowKeys,
  extractPhpItemFieldTypeFlow,
  findFunctionBody,
  findMatchingBrace,
  findMatchingBracket,
  tokenizePhp,
  type PhpToken,
} from './php';

/** Load-bearing analyzer version (participates in evidence/derivation identity). */
export const MECHANICAL_ANALYZER_VERSION = 'nightwatch.mechanical-contract-analyzer.v1' as const;

const MAX_SOURCE_CHARS = 2_000_000;
const MAX_TOKENS = 500_000;
const MAX_BRANCHES = 256;

// ---------------------------------------------------------------------------
// Vocabularies.
// ---------------------------------------------------------------------------

/** SPEC §6 — positive proof classes the analyzer can mechanically establish. */
export type AnalyzerProofClass =
  | 'LITERAL_ROW_FIELD_SET'
  | 'SCALAR_TYPE_FROM_CAST'
  | 'BRANCH_UNION_TYPE_SET'
  | 'EMPTY_NONEMPTY_BIFURCATION'
  | 'ALIAS_COPY_FLOW'
  | 'RETURN_ENVELOPE_FIELD_PRESENCE'
  | 'GENERATED_INTERFACE_FIELD_SHAPE'
  | 'CHUNK_ITEM_METADATA';

/** SPEC §6 — required rejection classes (fail-closed, never a guessed contract). */
export type AnalyzerBlockerCode =
  | 'SOURCE_UNAVAILABLE'
  | 'SOURCE_STALE'
  | 'SYMBOL_UNAVAILABLE'
  | 'UNSUPPORTED_SYNTAX'
  | 'DYNAMIC_KEY_FLOW'
  | 'RUNTIME_VALUE_TYPE_UNPROVEN'
  | 'BRANCH_SET_INCOMPLETE'
  | 'CONDITIONAL_BLOB_AMBIGUOUS'
  | 'GENERATED_SCHEMA_UNAVAILABLE'
  | 'TRANSPORT_CONTRACT_UNPROVEN'
  | 'PARTIAL_PROOF_ONLY';

export type AnalyzerStatus = 'PROVEN' | 'AMBIGUOUS' | 'UNSUPPORTED' | 'UNAVAILABLE';

export interface AnalyzerFact {
  readonly proofClass: AnalyzerProofClass;
  readonly fieldName?: string;
  readonly itemKeys?: readonly string[];
  readonly allowedTypes?: readonly string[];
  readonly cardinality?: number;
  readonly edge?: readonly [string, string];
  readonly branchCount?: number;
  readonly detail?: string;
}

export interface ContractAnalysis {
  readonly analyzerVersion: typeof MECHANICAL_ANALYZER_VERSION;
  readonly language: 'php' | 'generated-interface' | 'unknown';
  readonly symbol: string | null;
  readonly status: AnalyzerStatus;
  readonly proofClass: AnalyzerProofClass | null;
  readonly facts: readonly AnalyzerFact[];
  readonly blockerCode: AnalyzerBlockerCode | null;
  /** Normalized safe evidence payload (no raw values; privacy-safe). */
  readonly safeEvidence: string;
}

// ---------------------------------------------------------------------------
// Privacy guard — sentinels must never reach safe derived evidence (C10/H06).
// ---------------------------------------------------------------------------

export const PRIVACY_SENTINELS = [
  'PRIVACY_SENTINEL',
  'AKIA',
  'sk-',
  'Bearer ',
  'password=',
  'secret=',
  'aws_secret',
] as const;

export function containsAnySentinel(text: string, sentinels: readonly string[] = PRIVACY_SENTINELS): boolean {
  return sentinels.some((s) => text.includes(s));
}

// ---------------------------------------------------------------------------
// Bounded helpers.
// ---------------------------------------------------------------------------

type JsonLeafType = 'NULL' | 'BOOLEAN' | 'NUMBER' | 'STRING' | 'OBJECT' | 'ARRAY';
const KNOWN_JSON_TYPES: readonly JsonLeafType[] = ['NULL', 'BOOLEAN', 'NUMBER', 'STRING', 'OBJECT', 'ARRAY'];

function isRecognizedJsonType(value: string): value is JsonLeafType {
  return (KNOWN_JSON_TYPES as readonly string[]).includes(value);
}

/** Determine the STATIC JSON leaf type of a bounded RHS expression starting at
 *  token index `rhsIndex`. Returns null when the RHS is not statically
 *  enumerable (non-literal copy, function/method call, subscript read, etc.). */
function staticLeafTypeOfRhs(tokens: PhpToken[], rhsIndex: number): JsonLeafType | null {
  const token = tokens[rhsIndex];
  if (token === undefined) return null;
  if (token.t === 'PUNCT' && token.v === '[') return 'ARRAY';
  if (token.t === 'PUNCT' && token.v === '(') {
    // `(object)$x` / `(array)$x` cast.
    if (token.v === '(' && tokens[rhsIndex + 1]?.t === 'WORD' && (tokens[rhsIndex + 1] as { v: string }).v === 'object') {
      return 'OBJECT';
    }
    return null;
  }
  if (token.t === 'WORD') {
    if (token.v === 'true' || token.v === 'false') return 'BOOLEAN';
    if (token.v === 'null') return 'NULL';
    return null; // function call / unknown word => unenumerable
  }
  if (token.t === 'NUMBER') return 'NUMBER';
  if (token.t === 'STRING') return 'STRING';
  if (token.t === 'VARIABLE') return null; // copy of unknown source => unenumerable
  return null;
}

/** Find bounded branch blocks (if/elseif/else) at function-relative depth 0.
 *  The implicit "base" block (assignments before the first branch) is included
 *  when present. Nested ifs inside a branch are NOT treated as separate
 *  top-level branches (depth tracking). Each returned range covers the inner
 *  block tokens. */
function findBranchBlocks(
  tokens: PhpToken[],
  bodyStart: number,
  bodyEnd: number,
): { blocks: ReadonlyArray<{ start: number; end: number }>; hasElse: boolean; branchCount: number } {
  const blocks: { start: number; end: number }[] = [];
  let hasElse = false;
  let depth = 0;
  let baseEnd = bodyStart + 1;
  let sawBranch = false;
  for (let i = bodyStart + 1; i < bodyEnd; i++) {
    const token = tokens[i]!;
    if (token.t === 'PUNCT' && token.v === '{') {
      depth += 1;
      continue;
    }
    if (token.t === 'PUNCT' && token.v === '}') {
      depth -= 1;
      continue;
    }
    if (depth !== 0) continue; // only top-level branch keywords
    if (token.t === 'WORD' && (token.v === 'if' || token.v === 'elseif' || token.v === 'else')) {
      if (!sawBranch) {
        if (i > bodyStart + 1) blocks.push({ start: bodyStart + 1, end: i });
        baseEnd = i;
        sawBranch = true;
      }
      if (token.v === 'else') hasElse = true;
      // `if`/`elseif` carry a condition in parens; `else` does not. Skip the
      // condition (balanced parens, own depth counter) for the former, then
      // locate the block open brace.
      let k: number;
      if (token.v === 'else') {
        k = i + 1;
      } else {
        let j = i + 1;
        let condDepth = 0;
        while (j < bodyEnd) {
          const c = tokens[j]!;
          if (c.t === 'PUNCT' && c.v === '(') condDepth += 1;
          else if (c.t === 'PUNCT' && c.v === ')') {
            condDepth -= 1;
            if (condDepth === 0) break;
          }
          j += 1;
        }
        k = j + 1;
      }
      while (k < bodyEnd && !(tokens[k]?.t === 'PUNCT' && tokens[k]?.v === '{')) k += 1;
      if (tokens[k]?.t === 'PUNCT' && tokens[k]?.v === '{') {
        const close = findMatchingBrace(tokens, k);
        blocks.push({ start: k + 1, end: close });
        i = close; // continue after the branch block (nested ifs skipped via depth)
      }
    }
  }
  if (!sawBranch) {
    blocks.push({ start: bodyStart + 1, end: bodyEnd });
  }
  return { blocks, hasElse, branchCount: blocks.length };
}

/** Scan a token range for `$var = <rhs>` assignments at range depth 0 and
 *  return the static leaf type of each RHS (null when unenumerable). */
function collectFieldRhsLeafTypes(
  tokens: PhpToken[],
  rangeStart: number,
  rangeEnd: number,
  fieldVariable: string,
): (JsonLeafType | null)[] {
  const results: (JsonLeafType | null)[] = [];
  let depth = 0;
  for (let i = rangeStart; i < rangeEnd; i++) {
    const token = tokens[i]!;
    if (token.t === 'PUNCT' && token.v === '{') depth += 1;
    else if (token.t === 'PUNCT' && token.v === '}') depth -= 1;
    if (depth !== 0) continue;
    if (token.t === 'VARIABLE' && token.v === fieldVariable) {
      const at = tokens[i + 1];
      if (at?.t === 'PUNCT' && at.v === '=') {
        results.push(staticLeafTypeOfRhs(tokens, i + 2));
      }
    }
  }
  return results;
}

function allReturnsAreAccumulator(
  tokens: PhpToken[],
  bodyStart: number,
  bodyEnd: number,
  accumulator: string,
): { returnCount: number; allAccumulator: boolean } {
  let returnCount = 0;
  let nonAccumulator = 0;
  for (let i = bodyStart + 1; i < bodyEnd; i++) {
    const token = tokens[i]!;
    if (token.t !== 'WORD' || token.v !== 'return') continue;
    returnCount += 1;
    const next = tokens[i + 1];
    if (next?.t === 'VARIABLE' && next.v === accumulator) continue;
    // `$this->...->method($acc, ...)` first-arg accumulator (e.g. rbac->filter).
    if (next?.t === 'VARIABLE' && next.v === 'this') {
      let j = i + 2;
      let ok = false;
      while (j + 1 < bodyEnd && tokens[j]?.t === 'OP' && tokens[j]?.v === '->' && tokens[j + 1]?.t === 'WORD') {
        j += 2;
        if (tokens[j]?.t === 'PUNCT' && tokens[j]?.v === '(') {
          const firstArg = tokens[j + 1];
          if (firstArg?.t === 'VARIABLE' && firstArg.v === accumulator) ok = true;
          break;
        }
      }
      if (ok) continue;
    }
    nonAccumulator += 1;
  }
  return { returnCount, allAccumulator: returnCount > 0 && nonAccumulator === 0 };
}

// ---------------------------------------------------------------------------
// Proof-class analyzers.
// ---------------------------------------------------------------------------

/** Detect a NON-EMPTY dynamic subscript on the accumulator (e.g.
 *  `$acc[$key] = ...`) — a dynamic key flow that must fail closed with
 *  DYNAMIC_KEY_FLOW rather than being treated as a finite row-key set. */
function hasDynamicSubscript(tokens: PhpToken[], bodyStart: number, bodyEnd: number, accumulator: string): boolean {
  for (let i = bodyStart + 1; i < bodyEnd; i++) {
    const token = tokens[i]!;
    if (token.t !== 'VARIABLE' || token.v !== accumulator) continue;
    const at = tokens[i + 1];
    if (at?.t !== 'PUNCT' || at.v !== '[') continue;
    const next = tokens[i + 2];
    // `$acc[]` (empty subscript) is the legitimate row-literal accumulation; a
    // non-`]` token as the first subscript element is a dynamic key.
    if (next !== undefined && !(next.t === 'PUNCT' && next.v === ']')) return true;
  }
  return false;
}

function literalRowFieldSet(text: string, symbol: string, accumulator: string, pattern: 'PUSH' | 'ASSIGN'): ContractAnalysis {
  if (text.length > MAX_SOURCE_CHARS) return unavailable('SOURCE_UNAVAILABLE', 'php', symbol);
  let tokens: PhpToken[];
  try {
    tokens = tokenizePhp(text);
  } catch {
    return blocker('UNSUPPORTED_SYNTAX', 'php', symbol, 'LITERAL_ROW_FIELD_SET', 'token-limit');
  }
  const body = findFunctionBody(tokens, symbol);
  if (body === null) return blocker('SYMBOL_UNAVAILABLE', 'php', symbol, 'LITERAL_ROW_FIELD_SET');
  if (hasDynamicSubscript(tokens, body.start, body.end, accumulator)) {
    return blocker('DYNAMIC_KEY_FLOW', 'php', symbol, 'LITERAL_ROW_FIELD_SET', 'dynamic-subscript-key');
  }
  const result = extractPhpFunctionListRowKeys(text, symbol, accumulator, pattern);
  if (!result.ok) {
    if (result.failure === 'FUNCTION_NOT_FOUND') return blocker('SYMBOL_UNAVAILABLE', 'php', symbol, 'LITERAL_ROW_FIELD_SET');
    return blocker('UNSUPPORTED_SYNTAX', 'php', symbol, 'LITERAL_ROW_FIELD_SET', result.failure);
  }
  if (result.extraction.kind !== 'PHP_FUNCTION_LIST_ROW_KEYS') {
    return blocker('UNSUPPORTED_SYNTAX', 'php', symbol, 'LITERAL_ROW_FIELD_SET', 'unexpected-extraction-kind');
  }
  return proven('php', symbol, 'LITERAL_ROW_FIELD_SET', {
    facts: [{ proofClass: 'LITERAL_ROW_FIELD_SET', itemKeys: [...result.extraction.itemKeys].sort(), branchCount: result.extraction.rowLiteralCount }],
  });
}

function scalarTypeFromCast(
  text: string,
  symbol: string,
  fieldVariable: string,
  pattern: 'EMPTY_CAST_OBJECT' | 'EMPTY_ARRAY_OR_STRING_KEYS',
): ContractAnalysis {
  if (text.length > MAX_SOURCE_CHARS) return unavailable('SOURCE_UNAVAILABLE', 'php', symbol);
  const result = extractPhpItemFieldTypeFlow(text, symbol, fieldVariable, pattern);
  if (!result.ok) {
    // The field type cannot be proven from fixed source patterns => runtime/DB
    // value type is unproven (never inferred from the variable name).
    return blocker('RUNTIME_VALUE_TYPE_UNPROVEN', 'php', symbol, 'SCALAR_TYPE_FROM_CAST', result.failure);
  }
  if (result.extraction.kind !== 'PHP_ITEM_FIELD_TYPE_FLOW') {
    return blocker('RUNTIME_VALUE_TYPE_UNPROVEN', 'php', symbol, 'SCALAR_TYPE_FROM_CAST', 'unexpected-extraction-kind');
  }
  return proven('php', symbol, 'SCALAR_TYPE_FROM_CAST', {
    facts: [{ proofClass: 'SCALAR_TYPE_FROM_CAST', fieldName: fieldVariable, allowedTypes: [...result.extraction.allowedJsonTypes].sort() }],
  });
}

function branchUnionTypeSet(text: string, symbol: string, fieldVariable: string): ContractAnalysis {
  if (text.length > MAX_SOURCE_CHARS) return unavailable('SOURCE_UNAVAILABLE', 'php', symbol);
  let tokens: PhpToken[];
  try {
    tokens = tokenizePhp(text);
  } catch {
    return blocker('UNSUPPORTED_SYNTAX', 'php', symbol, 'BRANCH_UNION_TYPE_SET', 'token-limit');
  }
  const body = findFunctionBody(tokens, symbol);
  if (body === null) return blocker('SYMBOL_UNAVAILABLE', 'php', symbol, 'BRANCH_UNION_TYPE_SET');

  const { blocks, hasElse } = findBranchBlocks(tokens, body.start, body.end);
  if (blocks.length === 0 || blocks.length > MAX_BRANCHES) {
    return blocker('BRANCH_SET_INCOMPLETE', 'php', symbol, 'BRANCH_UNION_TYPE_SET', 'no-branches');
  }
  // Without an `else`, an implicit fall-through path has no assignment => only
  // a PARTIAL proof is possible (SPEC §6: partial proof is not full proof).
  if (!hasElse && blocks.length > 1) {
    return blocker('PARTIAL_PROOF_ONLY', 'php', symbol, 'BRANCH_UNION_TYPE_SET', 'no-else');
  }

  const union = new Set<JsonLeafType>();
  for (const block of blocks) {
    const leaves = collectFieldRhsLeafTypes(tokens, block.start, block.end, fieldVariable);
    if (leaves.length === 0) {
      return blocker('BRANCH_SET_INCOMPLETE', 'php', symbol, 'BRANCH_UNION_TYPE_SET', 'branch-without-assignment');
    }
    for (const leaf of leaves) {
      if (leaf === null) {
        // At least one branch assigns a non-literal (runtime/DB/copy) value.
        return blocker('BRANCH_SET_INCOMPLETE', 'php', symbol, 'BRANCH_UNION_TYPE_SET', 'unenumerable-branch');
      }
      union.add(leaf);
    }
  }
  if (union.size === 0) return blocker('UNSUPPORTED_SYNTAX', 'php', symbol, 'BRANCH_UNION_TYPE_SET', 'empty-union');
  return proven('php', symbol, 'BRANCH_UNION_TYPE_SET', {
    facts: [{ proofClass: 'BRANCH_UNION_TYPE_SET', fieldName: fieldVariable, allowedTypes: [...union].sort(), branchCount: blocks.length }],
  });
}

function emptyNonEmptyBifurcation(text: string, symbol: string, fieldVariable: string): ContractAnalysis {
  if (text.length > MAX_SOURCE_CHARS) return unavailable('SOURCE_UNAVAILABLE', 'php', symbol);
  let tokens: PhpToken[];
  try {
    tokens = tokenizePhp(text);
  } catch {
    return blocker('UNSUPPORTED_SYNTAX', 'php', symbol, 'EMPTY_NONEMPTY_BIFURCATION', 'token-limit');
  }
  const body = findFunctionBody(tokens, symbol);
  if (body === null) return blocker('SYMBOL_UNAVAILABLE', 'php', symbol, 'EMPTY_NONEMPTY_BIFURCATION');

  // Require `$field = []` initialization within the body (top-level).
  let hasArrayInit = false;
  for (let i = body.start + 1; i < body.end; i++) {
    const t = tokens[i]!;
    if (t.t === 'VARIABLE' && t.v === fieldVariable && tokens[i + 1]?.t === 'PUNCT' && tokens[i + 1]?.v === '=' && tokens[i + 2]?.t === 'PUNCT' && tokens[i + 2]?.v === '[') {
      hasArrayInit = true;
      break;
    }
  }
  if (!hasArrayInit) return blocker('RUNTIME_VALUE_TYPE_UNPROVEN', 'php', symbol, 'EMPTY_NONEMPTY_BIFURCATION', 'no-array-init');

  // Find `if (empty($field)) { ... }` then its `else { ... }`.
  for (let i = body.start + 1; i < body.end; i++) {
    const t = tokens[i]!;
    if (t.t === 'WORD' && t.v === 'if') {
      // Confirm condition tests empty($field) (bounded lexical scan).
      let j = i + 1;
      let depth = 0;
      let emptyFound = false;
      while (j < body.end) {
        const c = tokens[j]!;
        if (c.t === 'PUNCT' && c.v === '(') depth += 1;
        else if (c.t === 'PUNCT' && c.v === ')') {
          depth -= 1;
          if (depth === 0) break;
        } else if (c.t === 'WORD' && c.v === 'empty' && tokens[j + 1]?.t === 'PUNCT' && tokens[j + 1]?.v === '(' && tokens[j + 2]?.t === 'VARIABLE' && tokens[j + 2]?.v === fieldVariable) {
          emptyFound = true;
        }
        j += 1;
      }
      if (!emptyFound) continue;
      // Find the `if` block open brace.
      let k = j + 1;
      while (k < body.end && !(tokens[k]?.t === 'PUNCT' && tokens[k]?.v === '{')) k += 1;
      if (!(tokens[k]?.t === 'PUNCT' && tokens[k]?.v === '{')) continue;
      const ifClose = findMatchingBrace(tokens, k);
      // After the if-block close, expect `else` then `{` (bounded; no nested
      // branch keyword other than `else` is allowed here).
      let e = ifClose + 1;
      while (e < body.end && !(tokens[e]?.t === 'WORD' && tokens[e]?.v === 'else')) {
        if (tokens[e]?.t === 'PUNCT' && tokens[e]?.v === '{') break; // no else follow
        e += 1;
      }
      if (!(tokens[e]?.t === 'WORD' && tokens[e]?.v === 'else')) {
        return blocker('RUNTIME_VALUE_TYPE_UNPROVEN', 'php', symbol, 'EMPTY_NONEMPTY_BIFURCATION', 'no-else');
      }
      // Else block brace.
      let m = e + 1;
      while (m < body.end && !(tokens[m]?.t === 'PUNCT' && tokens[m]?.v === '{')) m += 1;
      if (!(tokens[m]?.t === 'PUNCT' && tokens[m]?.v === '{')) {
        return blocker('RUNTIME_VALUE_TYPE_UNPROVEN', 'php', symbol, 'EMPTY_NONEMPTY_BIFURCATION', 'no-else-block');
      }
      const elseClose = findMatchingBrace(tokens, m);
      const emptyBranchType = collectFieldRhsLeafTypes(tokens, k + 1, ifClose, fieldVariable).find((x) => x !== null) ?? null;
      const nonEmptyBranchType = collectFieldRhsLeafTypes(tokens, m + 1, elseClose, fieldVariable).find((x) => x !== null) ?? null;
      if (emptyBranchType === null || nonEmptyBranchType === null) {
        return blocker('CONDITIONAL_BLOB_AMBIGUOUS', 'php', symbol, 'EMPTY_NONEMPTY_BIFURCATION', 'branch-unenumerable');
      }
      if (emptyBranchType === nonEmptyBranchType) {
        return blocker('RUNTIME_VALUE_TYPE_UNPROVEN', 'php', symbol, 'EMPTY_NONEMPTY_BIFURCATION', 'no-bifurcation');
      }
      return proven('php', symbol, 'EMPTY_NONEMPTY_BIFURCATION', {
        facts: [{ proofClass: 'EMPTY_NONEMPTY_BIFURCATION', fieldName: fieldVariable, allowedTypes: [emptyBranchType, nonEmptyBranchType].sort() }],
      });
    }
  }
  return blocker('RUNTIME_VALUE_TYPE_UNPROVEN', 'php', symbol, 'EMPTY_NONEMPTY_BIFURCATION', 'no-guarded-bifurcation');
}

function aliasCopyFlow(text: string, symbol: string, sourceVar: string, aliasVar: string): ContractAnalysis {
  if (text.length > MAX_SOURCE_CHARS) return unavailable('SOURCE_UNAVAILABLE', 'php', symbol);
  let tokens: PhpToken[];
  try {
    tokens = tokenizePhp(text);
  } catch {
    return blocker('UNSUPPORTED_SYNTAX', 'php', symbol, 'ALIAS_COPY_FLOW', 'token-limit');
  }
  const body = findFunctionBody(tokens, symbol);
  if (body === null) return blocker('SYMBOL_UNAVAILABLE', 'php', symbol, 'ALIAS_COPY_FLOW');

  let aliasAssigned = false;
  for (let i = body.start + 1; i < body.end; i++) {
    const t = tokens[i]!;
    if (t.t !== 'VARIABLE' || t.v !== aliasVar) continue;
    const at = tokens[i + 1];
    if (at?.t !== 'PUNCT' || at.v !== '=') continue;
    aliasAssigned = true;
    const rhs = tokens[i + 2];
    // Bounded copy flow: RHS must be exactly `$source` or a recognized literal.
    const isPureCopy = rhs?.t === 'VARIABLE' && rhs.v === sourceVar;
    const isLiteral = rhs !== undefined && (staticLeafTypeOfRhs(tokens, i + 2) !== null || (rhs.t === 'WORD' && (rhs.v === 'true' || rhs.v === 'false' || rhs.v === 'null')));
    if (!isPureCopy && !isLiteral) {
      // Alias flows from an unbounded source (function call, subscript read,
      // dynamic copy) => the copy is not mechanically bounded.
      return blocker('RUNTIME_VALUE_TYPE_UNPROVEN', 'php', symbol, 'ALIAS_COPY_FLOW', 'unbounded-copy');
    }
  }
  if (!aliasAssigned) return blocker('SYMBOL_UNAVAILABLE', 'php', symbol, 'ALIAS_COPY_FLOW', 'alias-never-assigned');
  return proven('php', symbol, 'ALIAS_COPY_FLOW', {
    facts: [{ proofClass: 'ALIAS_COPY_FLOW', edge: [sourceVar, aliasVar] }],
  });
}

function returnEnvelopeFieldPresence(
  text: string,
  symbol: string,
  accumulator: string,
  requiredFields: readonly string[],
): ContractAnalysis {
  if (text.length > MAX_SOURCE_CHARS) return unavailable('SOURCE_UNAVAILABLE', 'php', symbol);
  const row = extractPhpFunctionListRowKeys(text, symbol, accumulator, 'ASSIGN');
  const push = extractPhpFunctionListRowKeys(text, symbol, accumulator, 'PUSH');
  let rowKeys: readonly string[] | null = null;
  if (row.ok && row.extraction.kind === 'PHP_FUNCTION_LIST_ROW_KEYS') rowKeys = row.extraction.itemKeys;
  if (rowKeys === null && push.ok && push.extraction.kind === 'PHP_FUNCTION_LIST_ROW_KEYS') rowKeys = push.extraction.itemKeys;
  if (rowKeys === null) {
    if (row.ok === false && row.failure === 'FUNCTION_NOT_FOUND') return blocker('SYMBOL_UNAVAILABLE', 'php', symbol, 'RETURN_ENVELOPE_FIELD_PRESENCE');
    return blocker('UNSUPPORTED_SYNTAX', 'php', symbol, 'RETURN_ENVELOPE_FIELD_PRESENCE', 'no-row-literal');
  }
  const missing = requiredFields.filter((f) => !rowKeys.includes(f));
  if (missing.length > 0) {
    return blocker('UNSUPPORTED_SYNTAX', 'php', symbol, 'RETURN_ENVELOPE_FIELD_PRESENCE', `missing-fields:${missing.join(',')}`);
  }
  let tokens: PhpToken[];
  try {
    tokens = tokenizePhp(text);
  } catch {
    return blocker('UNSUPPORTED_SYNTAX', 'php', symbol, 'RETURN_ENVELOPE_FIELD_PRESENCE', 'token-limit');
  }
  const body = findFunctionBody(tokens, symbol);
  if (body === null) return blocker('SYMBOL_UNAVAILABLE', 'php', symbol, 'RETURN_ENVELOPE_FIELD_PRESENCE');
  const { returnCount, allAccumulator } = allReturnsAreAccumulator(tokens, body.start, body.end, accumulator);
  if (returnCount === 0) return blocker('UNSUPPORTED_SYNTAX', 'php', symbol, 'RETURN_ENVELOPE_FIELD_PRESENCE', 'no-return');
  if (!allAccumulator) {
    return blocker('BRANCH_SET_INCOMPLETE', 'php', symbol, 'RETURN_ENVELOPE_FIELD_PRESENCE', 'non-accumulator-return');
  }
  return proven('php', symbol, 'RETURN_ENVELOPE_FIELD_PRESENCE', {
    facts: [{ proofClass: 'RETURN_ENVELOPE_FIELD_PRESENCE', itemKeys: [...rowKeys].sort(), branchCount: returnCount }],
  });
}

function generatedInterfaceFieldShape(jsonText: string): ContractAnalysis {
  if (jsonText.length > MAX_SOURCE_CHARS) return unavailable('SOURCE_UNAVAILABLE', 'generated-interface', null);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return blocker('GENERATED_SCHEMA_UNAVAILABLE', 'generated-interface', null, 'GENERATED_INTERFACE_FIELD_SHAPE', 'not-json');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return blocker('GENERATED_SCHEMA_UNAVAILABLE', 'generated-interface', null, 'GENERATED_INTERFACE_FIELD_SHAPE', 'not-object');
  }
  const obj = parsed as Record<string, unknown>;
  const fields = obj['fields'];
  if (!Array.isArray(fields)) {
    return blocker('GENERATED_SCHEMA_UNAVAILABLE', 'generated-interface', null, 'GENERATED_INTERFACE_FIELD_SHAPE', 'no-fields-array');
  }
  const names: string[] = [];
  const types: JsonLeafType[] = [];
  for (const raw of fields) {
    if (raw === null || typeof raw !== 'object') return blocker('GENERATED_SCHEMA_UNAVAILABLE', 'generated-interface', null, 'GENERATED_INTERFACE_FIELD_SHAPE', 'malformed-field');
    const f = raw as Record<string, unknown>;
    if (typeof f['name'] !== 'string') return blocker('GENERATED_SCHEMA_UNAVAILABLE', 'generated-interface', null, 'GENERATED_INTERFACE_FIELD_SHAPE', 'field-no-name');
    if (typeof f['type'] !== 'string') return blocker('GENERATED_SCHEMA_UNAVAILABLE', 'generated-interface', null, 'GENERATED_INTERFACE_FIELD_SHAPE', 'field-no-type');
    const normType = f['type'].toUpperCase() as JsonLeafType;
    if (!isRecognizedJsonType(normType)) {
      return blocker('RUNTIME_VALUE_TYPE_UNPROVEN', 'generated-interface', null, 'GENERATED_INTERFACE_FIELD_SHAPE', 'unrecognized-field-type');
    }
    names.push(f['name']);
    types.push(normType);
  }
  if (names.length === 0) return blocker('GENERATED_SCHEMA_UNAVAILABLE', 'generated-interface', null, 'GENERATED_INTERFACE_FIELD_SHAPE', 'empty-fields');
  return proven('generated-interface', null, 'GENERATED_INTERFACE_FIELD_SHAPE', {
    facts: [{ proofClass: 'GENERATED_INTERFACE_FIELD_SHAPE', itemKeys: [...names].sort(), allowedTypes: [...new Set(types)].sort() }],
  });
}

function chunkItemMetadata(text: string, symbol: string | null): ContractAnalysis {
  if (text.length > MAX_SOURCE_CHARS) return unavailable('SOURCE_UNAVAILABLE', symbol === null ? 'generated-interface' : 'php', symbol);
  let tokens: PhpToken[];
  try {
    tokens = tokenizePhp(text);
  } catch {
    return blocker('UNSUPPORTED_SYNTAX', symbol === null ? 'generated-interface' : 'php', symbol, 'CHUNK_ITEM_METADATA', 'token-limit');
  }
  let lang: 'php' | 'generated-interface' = symbol === null ? 'generated-interface' : 'php';
  // Comment-only transport assertion must NOT be accepted (C07/E05): scan for a
  // structural chunk marker (`chunkSize`/`pageSize`/`itemsPerPage`) bound to an
  // integer literal OUTSIDE of comments. Track comment state during tokenization
  // is not available post-hoc, so we instead require the marker as a token (no
  // leading comment token precedes it on the same scan) — comment tokens were
  // already stripped by the tokenizer, so any surviving marker token is code.
  let cardinality: number | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if ((t.t === 'WORD' || t.t === 'VARIABLE') && (t.v === 'chunkSize' || t.v === 'pageSize' || t.v === 'itemsPerPage')) {
      const at = tokens[i + 1];
      const rhs = tokens[i + 2];
      if ((at?.t === 'PUNCT' && at.v === '=') || (at?.t === 'OP' && at.v === ':')) {
        if (rhs?.t === 'NUMBER') {
          const n = Number(rhs.v);
          if (Number.isFinite(n) && n > 0) cardinality = n;
        }
      }
    }
  }
  if (cardinality !== null) {
    return proven(lang, symbol, 'CHUNK_ITEM_METADATA', {
      facts: [{ proofClass: 'CHUNK_ITEM_METADATA', cardinality }],
    });
  }
  // No structural marker. If the source merely mentions chunking in prose/route
  // names, that is NOT proof (E05): reject as transport-unproven.
  return blocker('TRANSPORT_CONTRACT_UNPROVEN', lang, symbol, 'CHUNK_ITEM_METADATA', 'no-structural-marker');
}

// ---------------------------------------------------------------------------
// Result constructors (deterministic + privacy-safe).
// ---------------------------------------------------------------------------

function build(language: 'php' | 'generated-interface' | 'unknown', symbol: string | null, status: AnalyzerStatus, proofClass: AnalyzerProofClass | null, facts: readonly AnalyzerFact[], blockerCode: AnalyzerBlockerCode | null): ContractAnalysis {
  const ordered = [...facts].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const safeEvidence = JSON.stringify({ language, symbol, status, proofClass, facts: ordered, blockerCode });
  return {
    analyzerVersion: MECHANICAL_ANALYZER_VERSION,
    language,
    symbol,
    status,
    proofClass,
    facts: ordered,
    blockerCode,
    safeEvidence,
  };
}

function proven(language: 'php' | 'generated-interface', symbol: string | null, proofClass: AnalyzerProofClass, opts: { facts: readonly AnalyzerFact[] }): ContractAnalysis {
  return build(language, symbol, 'PROVEN', proofClass, opts.facts, null);
}

function blocker(blockerCode: AnalyzerBlockerCode, language: 'php' | 'generated-interface', symbol: string | null, proofClass: AnalyzerProofClass, detail?: string): ContractAnalysis {
  const facts: AnalyzerFact[] = detail === undefined ? [] : [{ proofClass, detail }];
  return build(language, symbol, 'AMBIGUOUS', proofClass, facts, blockerCode);
}

function unavailable(blockerCode: AnalyzerBlockerCode, language: 'php' | 'generated-interface' | 'unknown', symbol: string | null): ContractAnalysis {
  return build(language, symbol, 'UNAVAILABLE', null, [], blockerCode);
}

// ---------------------------------------------------------------------------
// Dispatcher (single entry point for the inventory/canary layers).
// ---------------------------------------------------------------------------

export type AnalyzerQuery =
  | { language: 'php'; sourceText: string; symbol: string; proofClass: 'LITERAL_ROW_FIELD_SET'; accumulator: string; pattern: 'PUSH' | 'ASSIGN' }
  | { language: 'php'; sourceText: string; symbol: string; proofClass: 'SCALAR_TYPE_FROM_CAST'; fieldVariable: string; pattern: 'EMPTY_CAST_OBJECT' | 'EMPTY_ARRAY_OR_STRING_KEYS' }
  | { language: 'php'; sourceText: string; symbol: string; proofClass: 'BRANCH_UNION_TYPE_SET'; fieldVariable: string }
  | { language: 'php'; sourceText: string; symbol: string; proofClass: 'EMPTY_NONEMPTY_BIFURCATION'; fieldVariable: string }
  | { language: 'php'; sourceText: string; symbol: string; proofClass: 'ALIAS_COPY_FLOW'; sourceVar: string; aliasVar: string }
  | { language: 'php'; sourceText: string; symbol: string; proofClass: 'RETURN_ENVELOPE_FIELD_PRESENCE'; accumulator: string; requiredFields: readonly string[] }
  | { language: 'generated-interface'; sourceText: string; symbol: null; proofClass: 'GENERATED_INTERFACE_FIELD_SHAPE' }
  | { language: 'php' | 'generated-interface'; sourceText: string; symbol: string | null; proofClass: 'CHUNK_ITEM_METADATA' };

export function analyzeContract(query: AnalyzerQuery): ContractAnalysis {
  switch (query.proofClass) {
    case 'LITERAL_ROW_FIELD_SET':
      return literalRowFieldSet(query.sourceText, query.symbol, query.accumulator, query.pattern);
    case 'SCALAR_TYPE_FROM_CAST':
      return scalarTypeFromCast(query.sourceText, query.symbol, query.fieldVariable, query.pattern);
    case 'BRANCH_UNION_TYPE_SET':
      return branchUnionTypeSet(query.sourceText, query.symbol, query.fieldVariable);
    case 'EMPTY_NONEMPTY_BIFURCATION':
      return emptyNonEmptyBifurcation(query.sourceText, query.symbol, query.fieldVariable);
    case 'ALIAS_COPY_FLOW':
      return aliasCopyFlow(query.sourceText, query.symbol, query.sourceVar, query.aliasVar);
    case 'RETURN_ENVELOPE_FIELD_PRESENCE':
      return returnEnvelopeFieldPresence(query.sourceText, query.symbol, query.accumulator, query.requiredFields);
    case 'GENERATED_INTERFACE_FIELD_SHAPE':
      return generatedInterfaceFieldShape(query.sourceText);
    case 'CHUNK_ITEM_METADATA':
      return chunkItemMetadata(query.sourceText, query.symbol);
  }
}

/** Deterministic canonical evidence digest (includes the analyzer version so
 *  the version is load-bearing in derivation identity — SPEC §5). */
export function analyzerEvidenceDigest(analysis: ContractAnalysis): string {
  const canonical = JSON.stringify({
    analyzerVersion: MECHANICAL_ANALYZER_VERSION,
    language: analysis.language,
    symbol: analysis.symbol,
    status: analysis.status,
    proofClass: analysis.proofClass,
    facts: analysis.facts,
    blockerCode: analysis.blockerCode,
  });
  const digest = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24);
  return `ev:sha256:${digest}`;
}
