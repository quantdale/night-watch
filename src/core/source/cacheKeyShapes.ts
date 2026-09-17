// ---------------------------------------------------------------------------
// NW-HIST-005 (Wave 1, Phase 1a) — CACHE_KEY_CONTRACT shapes: the CLOSED key
// shape grammar, bounded PHP/Go extraction, canonical digests, and the pure
// deterministic coverage matcher.
//
// Scope boundary (permanent): this module NEVER executes product code, reads a
// cache, contacts a network/database, or emits a finding. It canonicalizes
// mechanically extractable key-construction structure and answers one question:
// is every consumer key shape covered by a declared producer invalidation
// pattern? A `NOT_COVERED` result is a REPORT OBSERVATION, never a finding.
//
// Grammar (closed; exactly these atoms, nothing else):
//   LITERAL(text)      fixed literal segment
//   NAMESPACE(text)    literal segment equal to the contract's declared namespace
//   ENV_PREFIX         environment discriminator: PHP `getenv(CONST)` on the
//                      consumer side, or the producer placeholder whose argument
//                      the contract declares as its environment carrier
//   VARIABLE           opaque runtime segment (the NAME IS NOT RECORDED, so no
//                      source-level identifier can leak into a report)
//   WILDCARD(kind)     `*` structurally present in a producer pattern; kind is
//                      PREFIX / SUFFIX / INFIX / FULL by position
//
// A canonical shape is `{ delimiter, atoms }`: adjacent atoms are joined by the
// single delimiter string, so a delimiter difference is a first-class mismatch.
//
// Extraction rules (bounded, fail-closed):
//   - PHP: `implode('<literal-delimiter>', [ ... ])` array constructions only.
//     Items: string literal, `getenv(CONST)`, `$var` / `$this->prop`; any other
//     call/expression as a segment is EXTRACTION_AMBIGUOUS.
//   - Go: `fmt.Sprintf('<literal-format>', args...)` call sites only. Each
//     placeholder consumes one argument (positionally, for the declared
//     environment token); the format's literal runs are split on the observed
//     delimiter; `*` becomes a wildcard atom by position.
//   - Unsupported construction calls (`join`, `sprintf`, `vsprintf` in PHP;
//     `Printf`/`Sprint`/`Sprintln` in Go) anywhere in a declared function make
//     that function EXTRACTION_AMBIGUOUS rather than silently uninspected.
//   - A literal segment must look like a structural token (`SAFE_LITERAL_RE`:
//     short, identifier-shaped, no long digit runs). A value-like literal fails
//     closed as EXTRACTION_AMBIGUOUS, so planted sensitive material cannot
//     survive into a report.
//   - Bounded: source chars, atoms, functions and rows all have hard limits;
//     exceeding one is EXTRACTION_AMBIGUOUS (never a partial guess).
//
// Purity: node:crypto is reached only through the canonical digest helper; no
// fs/child_process/network/env/clock/randomness authority.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import { tokenizePhp, findFunctionBody, type PhpToken } from '../../oracles/expectations/extract/php';
import { tokenizeStaticSource, type StaticLexicalToken } from './lexical';

export const CACHE_KEY_SHAPE_GRAMMAR_VERSION = 'nightwatch.cache-key-shape-extraction.v1' as const;

export const MAX_CACHE_KEY_SOURCE_CHARS = 400_000;
export const MAX_CACHE_KEY_ATOMS = 32;
export const MAX_CACHE_KEY_FUNCTIONS = 16;
export const MAX_CACHE_KEY_EXTRACTED = 64;
export const CACHE_KEY_LITERAL_MAX_LENGTH = 64;

const SAFE_LITERAL_RE = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/;
const MAX_LITERAL_DIGIT_RUN = 5;
const UNSUPPORTED_PHP_CONSTRUCTION_CALLS = Object.freeze(['join', 'sprintf', 'vsprintf']);
const UNSUPPORTED_GO_CONSTRUCTION_CALLS = Object.freeze(['Printf', 'Sprint', 'Sprintln']);
const GO_PLACEHOLDER_RE = /^%[sdv]$/;

export type CacheKeyAtom =
  | { readonly kind: 'LITERAL'; readonly text: string }
  | { readonly kind: 'NAMESPACE'; readonly text: string }
  | { readonly kind: 'ENV_PREFIX' }
  | { readonly kind: 'VARIABLE' }
  | { readonly kind: 'WILDCARD'; readonly wildcard: 'PREFIX' | 'SUFFIX' | 'INFIX' | 'FULL' };

export interface CanonicalKeyShape {
  readonly delimiter: string;
  readonly atoms: readonly CacheKeyAtom[];
}

export interface ExtractedShape {
  readonly symbol: string;
  readonly shape: CanonicalKeyShape;
  readonly digest: string;
}

export interface ExtractedPattern {
  readonly symbol: string;
  readonly shape: CanonicalKeyShape;
  readonly digest: string;
  /** 1-based placeholder positions whose argument is the declared env carrier. */
  readonly envPositions: readonly number[];
}

export interface CacheKeyExtraction {
  readonly shapes: readonly ExtractedShape[];
  readonly ambiguous: readonly { readonly symbol: string; readonly detail: string }[];
}

export interface PatternExtraction {
  readonly patterns: readonly ExtractedPattern[];
  readonly ambiguous: readonly { readonly symbol: string; readonly detail: string }[];
}

// ---------------------------------------------------------------------------
// Canonical digests (canonical form, explicitly sorted, timestamp-free).
// ---------------------------------------------------------------------------

function canonicalShapeValue(shape: CanonicalKeyShape): unknown {
  return {
    grammar: CACHE_KEY_SHAPE_GRAMMAR_VERSION,
    delimiter: shape.delimiter,
    atoms: shape.atoms.map((atom) => {
      switch (atom.kind) {
        case 'LITERAL':
        case 'NAMESPACE':
          return { kind: atom.kind, text: atom.text };
        case 'WILDCARD':
          return { kind: atom.kind, wildcard: atom.wildcard };
        default:
          return { kind: atom.kind };
      }
    }),
  };
}

export function shapeDigest(shape: CanonicalKeyShape): string {
  return prefixedDigest24('cks', canonicalShapeValue(shape));
}

export function patternDigest(shape: CanonicalKeyShape): string {
  return prefixedDigest24('ckp', canonicalShapeValue(shape));
}

// ---------------------------------------------------------------------------
// Literal safety (fail closed on value-like material).
// ---------------------------------------------------------------------------

function hasLongDigitRun(value: string): boolean {
  let run = 0;
  for (const character of value) {
    run = character >= '0' && character <= '9' ? run + 1 : 0;
    if (run > MAX_LITERAL_DIGIT_RUN) return true;
  }
  return false;
}

/** True when a literal is structurally safe to canonicalize into a report. */
export function isSafeKeyLiteral(value: string): boolean {
  return value.length > 0
    && value.length <= CACHE_KEY_LITERAL_MAX_LENGTH
    && SAFE_LITERAL_RE.test(value)
    && !hasLongDigitRun(value);
}

function literalAtom(text: string, namespace: string): CacheKeyAtom {
  return text === namespace ? { kind: 'NAMESPACE', text } : { kind: 'LITERAL', text };
}

// ---------------------------------------------------------------------------
// PHP consumer extraction (`implode('<delimiter>', [ ... ])`).
// ---------------------------------------------------------------------------

function phpAtomForSlice(tokens: readonly PhpToken[], namespace: string): CacheKeyAtom | { readonly ambiguous: string } {
  if (tokens.length === 0) return { ambiguous: 'EMPTY_SEGMENT' };
  const first = tokens[0]!;
  if (first.t === 'STRING') {
    if (tokens.length > 1) return { ambiguous: 'CONCATENATED_LITERAL' };
    return isSafeKeyLiteral(first.v) ? literalAtom(first.v, namespace) : { ambiguous: 'VALUE_LIKE_LITERAL' };
  }
  if (first.t === 'VARIABLE') {
    if (tokens.length === 1) return { kind: 'VARIABLE' };
    const second = tokens[1]!;
    if (tokens.length === 3 && second.v === '->' && tokens[2]!.t === 'WORD') return { kind: 'VARIABLE' };
    return { ambiguous: 'DERIVED_VARIABLE_SEGMENT' };
  }
  if (first.t === 'WORD' && first.v === 'getenv') {
    const open = tokens[1];
    const argument = tokens[2];
    const close = tokens[3];
    if (tokens.length === 4
      && open !== undefined && open.t === 'PUNCT' && open.v === '('
      && argument !== undefined && (argument.t === 'WORD' || argument.t === 'STRING')
      && close !== undefined && close.t === 'PUNCT' && close.v === ')') {
      return { kind: 'ENV_PREFIX' };
    }
    return { ambiguous: 'UNSUPPORTED_ENV_EXPRESSION' };
  }
  if (first.t === 'WORD') return { ambiguous: 'CALL_SEGMENT' };
  return { ambiguous: 'UNSUPPORTED_SEGMENT' };
}

function splitTopLevelPhp(tokens: readonly PhpToken[], openIndex: number, closeIndex: number): PhpToken[][] | null {
  const parts: PhpToken[][] = [];
  let current: PhpToken[] = [];
  let depth = 0;
  for (let index = openIndex; index < closeIndex; index += 1) {
    const token = tokens[index]!;
    if (token.t === 'PUNCT' && (token.v === '(' || token.v === '[' || token.v === '{')) depth += 1;
    if (token.t === 'PUNCT' && (token.v === ')' || token.v === ']' || token.v === '}')) {
      depth -= 1;
      if (depth < 0) return null;
    }
    if (token.t === 'PUNCT' && token.v === ',' && depth === 0) {
      parts.push(current);
      current = [];
      continue;
    }
    current.push(token);
  }
  parts.push(current);
  return parts;
}

function extractPhpFunctionShapes(
  tokens: readonly PhpToken[],
  symbol: string,
  namespace: string,
): { shapes: CanonicalKeyShape[]; ambiguous: string | null } {
  const body = findFunctionBody(tokens, symbol);
  if (body === null) return { shapes: [], ambiguous: 'FUNCTION_NOT_FOUND' };
  const shapes: CanonicalKeyShape[] = [];
  let ambiguous: string | null = null;
  const inside = tokens.slice(body.start, body.end + 1);
  for (let index = 0; index + 1 < inside.length; index += 1) {
    const token = inside[index]!;
    if (token.t !== 'WORD') continue;
    if (UNSUPPORTED_PHP_CONSTRUCTION_CALLS.includes(token.v)) {
      ambiguous = ambiguous ?? `UNSUPPORTED_CONSTRUCTION:${token.v}`;
      continue;
    }
    if (token.v !== 'implode') continue;
    const openIndex = index + 1;
    if (inside[openIndex] === undefined || inside[openIndex]!.t !== 'PUNCT' || inside[openIndex]!.v !== '(') continue;
    let depth = 0;
    let closeIndex = -1;
    for (let cursor = openIndex; cursor < inside.length; cursor += 1) {
      const cursorToken = inside[cursor]!;
      if (cursorToken.t === 'PUNCT' && cursorToken.v === '(') depth += 1;
      if (cursorToken.t === 'PUNCT' && cursorToken.v === ')') {
        depth -= 1;
        if (depth === 0) { closeIndex = cursor; break; }
      }
    }
    if (closeIndex === -1) { ambiguous = ambiguous ?? 'UNTERMINATED_CALL'; continue; }
    const parts = splitTopLevelPhp(inside, openIndex + 1, closeIndex);
    if (parts === null) { ambiguous = ambiguous ?? 'UNBALANCED_ARGUMENTS'; continue; }
    const delimiterPart = parts[0] ?? [];
    if (delimiterPart.length !== 1 || delimiterPart[0]!.t !== 'STRING') {
      ambiguous = ambiguous ?? 'DYNAMIC_DELIMITER';
      continue;
    }
    const delimiter = delimiterPart[0]!.v;
    if (delimiter.length === 0 || delimiter.length > 4 || ![...delimiter].every((character) => ':|/._-'.includes(character))) {
      ambiguous = ambiguous ?? 'UNSUPPORTED_DELIMITER';
      continue;
    }
    if (parts.length !== 2) { ambiguous = ambiguous ?? 'EXTRA_ARGUMENTS'; continue; }
    const arrayPart = parts[1] ?? [];
    if (arrayPart.length < 2 || arrayPart[0]!.t !== 'PUNCT' || arrayPart[0]!.v !== '[') {
      ambiguous = ambiguous ?? 'DYNAMIC_SEGMENT_LIST';
      continue;
    }
    let depthBracket = 0;
    let closeBracket = -1;
    const arrayStart = openIndex + 1 + delimiterPart.length + 1;
    for (let cursor = arrayStart; cursor < closeIndex; cursor += 1) {
      const cursorToken = inside[cursor]!;
      if (cursorToken.t === 'PUNCT' && cursorToken.v === '[') depthBracket += 1;
      if (cursorToken.t === 'PUNCT' && cursorToken.v === ']') {
        depthBracket -= 1;
        if (depthBracket === 0) { closeBracket = cursor; break; }
      }
    }
    if (closeBracket === -1) { ambiguous = ambiguous ?? 'UNTERMINATED_SEGMENT_LIST'; continue; }
    const items = splitTopLevelPhp(inside, arrayStart + 1, closeBracket);
    if (items === null) { ambiguous = ambiguous ?? 'UNBALANCED_SEGMENT_LIST'; continue; }
    const atoms: CacheKeyAtom[] = [];
    let failed: string | null = null;
    for (const item of items) {
      const atom = phpAtomForSlice(item, namespace);
      if ('ambiguous' in atom) { failed = atom.ambiguous; break; }
      atoms.push(atom);
      if (atoms.length > MAX_CACHE_KEY_ATOMS) { failed = 'ATOM_LIMIT_EXCEEDED'; break; }
    }
    if (failed !== null) { ambiguous = ambiguous ?? failed; continue; }
    if (atoms.length < 2) { ambiguous = ambiguous ?? 'TOO_FEW_SEGMENTS'; continue; }
    shapes.push({ delimiter, atoms });
    if (shapes.length > MAX_CACHE_KEY_EXTRACTED) { ambiguous = ambiguous ?? 'SHAPE_LIMIT_EXCEEDED'; break; }
  }
  return { shapes, ambiguous };
}

/** Bounded PHP consumer extraction over the declared function symbols. */
export function extractConsumerKeyShapes(
  source: string,
  options: { readonly functions: readonly string[]; readonly namespace: string },
): CacheKeyExtraction {
  if (source.length > MAX_CACHE_KEY_SOURCE_CHARS) return { shapes: [], ambiguous: [{ symbol: '', detail: 'SOURCE_TOO_LARGE' }] };
  if (options.functions.length > MAX_CACHE_KEY_FUNCTIONS) return { shapes: [], ambiguous: [{ symbol: '', detail: 'FUNCTION_LIMIT_EXCEEDED' }] };
  const tokens = tokenizePhp(source);
  const shapes: ExtractedShape[] = [];
  const ambiguous: { symbol: string; detail: string }[] = [];
  for (const symbol of options.functions) {
    const extracted = extractPhpFunctionShapes(tokens, symbol, options.namespace);
    for (const shape of extracted.shapes) shapes.push({ symbol, shape, digest: shapeDigest(shape) });
    if (extracted.ambiguous !== null) ambiguous.push({ symbol, detail: extracted.ambiguous });
  }
  return { shapes, ambiguous };
}

// ---------------------------------------------------------------------------
// Go producer extraction (`fmt.Sprintf('<format>', args...)`).
// ---------------------------------------------------------------------------

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
    const brace = tokens[open];
    if (brace === undefined || brace.kind !== 'PUNCT' || brace.value !== '{') return null;
    let depth = 0;
    for (let scan = open; scan < tokens.length; scan += 1) {
      const scanToken = tokens[scan]!;
      if (scanToken.kind === 'PUNCT' && scanToken.value === '{') depth += 1;
      if (scanToken.kind === 'PUNCT' && scanToken.value === '}') {
        depth -= 1;
        if (depth === 0) return { start: open, end: scan };
      }
    }
    return null;
  }
  return null;
}

function goAtomForFragment(fragment: string, namespace: string): CacheKeyAtom | null {
  if (fragment === '*') return { kind: 'WILDCARD', wildcard: 'FULL' };
  if (fragment.startsWith('*') && fragment.endsWith('*') && fragment.length > 2) {
    const inner = fragment.slice(1, -1);
    return isSafeKeyLiteral(inner) ? { kind: 'WILDCARD', wildcard: 'INFIX' } : null;
  }
  if (fragment.startsWith('*')) return { kind: 'WILDCARD', wildcard: 'PREFIX' };
  if (fragment.endsWith('*')) return { kind: 'WILDCARD', wildcard: 'SUFFIX' };
  return isSafeKeyLiteral(fragment) ? literalAtom(fragment, namespace) : null;
}

function inferDelimiter(format: string, declaredDelimiter: string): string | null {
  if (format.includes(declaredDelimiter)) return declaredDelimiter;
  const separators = new Set<string>();
  for (const character of format) {
    if (character === '*' || character === '%' || /[A-Za-z0-9_]/.test(character)) continue;
    separators.add(character);
  }
  if (separators.size === 0) return declaredDelimiter;
  if (separators.size > 1) return null;
  return [...separators][0] ?? null;
}

function parseGoFormat(
  format: string,
  argumentTokens: readonly string[],
  namespace: string,
  declaredDelimiter: string,
  envToken: string | null,
): { shape: CanonicalKeyShape; envPositions: number[] } | { readonly ambiguous: string } {
  if (format.length > 512) return { ambiguous: 'FORMAT_TOO_LARGE' };
  const delimiter = inferDelimiter(format, declaredDelimiter);
  if (delimiter === null || delimiter.length === 0) return { ambiguous: 'MIXED_DELIMITERS' };
  const atoms: CacheKeyAtom[] = [];
  const envPositions: number[] = [];
  let placeholderIndex = 0;
  let pendingFragment = '';
  let ambiguousDetail: string | null = null;

  const flushFragment = (): void => {
    if (pendingFragment === '' || ambiguousDetail !== null) { pendingFragment = ''; return; }
    const fragment = pendingFragment;
    pendingFragment = '';
    const atom = goAtomForFragment(fragment, namespace);
    if (atom === null) { ambiguousDetail = 'UNSAFE_LITERAL_FRAGMENT'; return; }
    atoms.push(atom);
    if (atoms.length > MAX_CACHE_KEY_ATOMS) ambiguousDetail = 'ATOM_LIMIT_EXCEEDED';
  };

  for (let index = 0; index < format.length && ambiguousDetail === null; index += 1) {
    const character = format[index]!;
    if (character === '%') {
      const verb = format[index + 1] ?? '';
      if (GO_PLACEHOLDER_RE.test(`%${verb}`)) {
        flushFragment();
        if (ambiguousDetail !== null) break;
        const argument = argumentTokens[placeholderIndex];
        if (argument === undefined) { ambiguousDetail = 'PLACEHOLDER_ARGUMENT_MISSING'; break; }
        placeholderIndex += 1;
        if (envToken !== null && argument === envToken) {
          envPositions.push(placeholderIndex);
          atoms.push({ kind: 'ENV_PREFIX' });
        } else {
          atoms.push({ kind: 'VARIABLE' });
        }
        if (atoms.length > MAX_CACHE_KEY_ATOMS) { ambiguousDetail = 'ATOM_LIMIT_EXCEEDED'; break; }
        index += 1;
        continue;
      }
      if (verb === '%') {
        pendingFragment += '%';
        index += 1;
        continue;
      }
      ambiguousDetail = 'UNSUPPORTED_FORMAT_VERB';
      break;
    }
    if (character === delimiter) {
      flushFragment();
      continue;
    }
    pendingFragment += character;
  }
  if (ambiguousDetail === null) flushFragment();
  if (ambiguousDetail !== null) return { ambiguous: ambiguousDetail };
  if (argumentTokens.length > 0 && placeholderIndex !== argumentTokens.length) return { ambiguous: 'PLACEHOLDER_ARGUMENT_MISMATCH' };
  if (argumentTokens.length === 0 && placeholderIndex !== 0) return { ambiguous: 'PLACEHOLDER_ARGUMENT_MISMATCH' };
  if (atoms.length < 2) return { ambiguous: 'TOO_FEW_SEGMENTS' };
  return { shape: { delimiter, atoms }, envPositions };
}

function extractGoFunctionPatterns(
  tokens: readonly StaticLexicalToken[],
  symbol: string,
  namespace: string,
  declaredDelimiter: string,
  envToken: string | null,
): { patterns: { shape: CanonicalKeyShape; envPositions: readonly number[] }[]; ambiguous: string | null } {
  const body = findGoFunctionBody(tokens, symbol);
  if (body === null) return { patterns: [], ambiguous: 'FUNCTION_NOT_FOUND' };
  const patterns: { shape: CanonicalKeyShape; envPositions: readonly number[] }[] = [];
  let ambiguous: string | null = null;
  const inside = tokens.slice(body.start, body.end + 1);
  for (let index = 0; index < inside.length; index += 1) {
    const token = inside[index]!;
    if (token.kind !== 'IDENTIFIER') continue;
    if (UNSUPPORTED_GO_CONSTRUCTION_CALLS.includes(token.value)) {
      ambiguous = ambiguous ?? `UNSUPPORTED_CONSTRUCTION:${token.value}`;
      continue;
    }
    if (token.value !== 'Sprintf') continue;
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
    if (args === null) { ambiguous = ambiguous ?? 'UNBALANCED_ARGUMENTS'; continue; }
    const formatToken = args[0]?.[0];
    if (args.length === 0 || formatToken === undefined || formatToken.kind !== 'STRING' || (args[0]?.length ?? 0) !== 1) {
      ambiguous = ambiguous ?? 'DYNAMIC_FORMAT';
      continue;
    }
    const argumentTokens = args.slice(1).map((argument) => argument.map((entry) => entry.value).join(''));
    const parsed = parseGoFormat(formatToken.value, argumentTokens, namespace, declaredDelimiter, envToken);
    if ('ambiguous' in parsed) { ambiguous = ambiguous ?? parsed.ambiguous; continue; }
    patterns.push({ shape: parsed.shape, envPositions: parsed.envPositions });
    if (patterns.length > MAX_CACHE_KEY_EXTRACTED) { ambiguous = ambiguous ?? 'PATTERN_LIMIT_EXCEEDED'; break; }
  }
  return { patterns, ambiguous };
}

function splitGoArguments(
  tokens: readonly StaticLexicalToken[],
  openIndex: number,
  closeIndex: number,
): StaticLexicalToken[][] | null {
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

/** Bounded Go producer extraction over the declared function symbols. */
export function extractProducerPatterns(
  source: string,
  options: { readonly functions: readonly string[]; readonly namespace: string; readonly delimiter: string; readonly envToken: string | null },
): PatternExtraction {
  if (source.length > MAX_CACHE_KEY_SOURCE_CHARS) return { patterns: [], ambiguous: [{ symbol: '', detail: 'SOURCE_TOO_LARGE' }] };
  if (options.functions.length > MAX_CACHE_KEY_FUNCTIONS) return { patterns: [], ambiguous: [{ symbol: '', detail: 'FUNCTION_LIMIT_EXCEEDED' }] };
  const tokens = tokenizeStaticSource(source, 'GO');
  if (tokens === null) return { patterns: [], ambiguous: [{ symbol: '', detail: 'LEXICAL_LIMIT_EXCEEDED' }] };
  const patterns: ExtractedPattern[] = [];
  const ambiguous: { symbol: string; detail: string }[] = [];
  for (const symbol of options.functions) {
    const extracted = extractGoFunctionPatterns(tokens, symbol, options.namespace, options.delimiter, options.envToken);
    for (const pattern of extracted.patterns) {
      patterns.push({ symbol, shape: pattern.shape, digest: patternDigest(pattern.shape), envPositions: pattern.envPositions });
    }
    if (extracted.ambiguous !== null) ambiguous.push({ symbol, detail: extracted.ambiguous });
  }
  return { patterns, ambiguous };
}

// ---------------------------------------------------------------------------
// Coverage matcher (pure, deterministic; no fuzzy similarity, no name matching).
// ---------------------------------------------------------------------------

export const CACHE_KEY_COVERAGE_VERDICTS = [
  'COVERED',
  'NOT_COVERED',
  'EXCLUDED_BY_DECLARATION',
  'EXTRACTION_AMBIGUOUS',
  'SOURCE_STALE',
  'SOURCE_UNAVAILABLE',
  'DECLARATION_INVALID',
  'NOT_APPLICABLE',
] as const;
export type CacheKeyCoverageVerdict = (typeof CACHE_KEY_COVERAGE_VERDICTS)[number];

/**
 * Closed reason-code vocabulary for NOT_COVERED. A reason is added only when a
 * mechanically necessary producer/consumer combination exists and is tested;
 * there is deliberately no WILDCARD_KIND_MISMATCH because no Wave 1 producer /
 * consumer combination can exercise it (consumer shapes are concrete).
 */
export const CACHE_KEY_REASON_CODES = [
  'SEGMENT_MISMATCH',
  'DELIMITER_MISMATCH',
  'ENV_PREFIX_MISMATCH',
  'MISSING_WILDCARD',
  'EXACT_PATTERN_ON_VARIABLE_SHAPE',
  'OPAQUE_SEGMENT_ON_LITERAL_SHAPE',
] as const;
export type CacheKeyReasonCode = (typeof CACHE_KEY_REASON_CODES)[number];

export interface CacheKeyCoverageRow {
  readonly consumerShapeDigest: string;
  readonly producerPatternDigest: string | null;
  readonly verdict: CacheKeyCoverageVerdict;
  readonly reasonCode: CacheKeyReasonCode | null;
}

export interface CacheKeyEnvMap {
  readonly producerEnvToken: string | null;
  readonly pairs: readonly { readonly producer: string; readonly consumer: string }[];
}

function envLiteralMapped(value: string, envMap: CacheKeyEnvMap): boolean {
  return envMap.pairs.some((pair) => pair.producer === value);
}

type AlignmentFailure = { readonly reason: CacheKeyReasonCode };

/**
 * Does one producer pattern cover one consumer shape? Exact, segment-wise,
 * order-preserving; wildcards may over-cover (a glob `*` can match delimiters,
 * so FULL/SUFFIX/INFIX cover the remainder); under-coverage is a failure.
 */
export function patternCoversShape(
  shape: CanonicalKeyShape,
  pattern: CanonicalKeyShape,
  envMap: CacheKeyEnvMap,
): true | AlignmentFailure {
  if (shape.delimiter !== pattern.delimiter) return { reason: 'DELIMITER_MISMATCH' };
  let shapeIndex = 0;
  let patternIndex = 0;
  while (true) {
    const patternAtom = pattern.atoms[patternIndex];
    const shapeAtom = shape.atoms[shapeIndex];
    if (patternAtom === undefined && shapeAtom === undefined) return true;
    if (patternAtom === undefined) {
      if (shapeAtom === undefined) return true;
      return { reason: shapeAtom.kind === 'VARIABLE' ? 'MISSING_WILDCARD' : 'SEGMENT_MISMATCH' };
    }
    if (patternAtom.kind === 'WILDCARD') {
      if (patternAtom.wildcard !== 'PREFIX') return true;
      if (shapeAtom === undefined) return { reason: 'SEGMENT_MISMATCH' };
      shapeIndex += 1;
      patternIndex += 1;
      continue;
    }
    if (shapeAtom === undefined) return { reason: 'SEGMENT_MISMATCH' };
    if (patternAtom.kind === 'LITERAL' || patternAtom.kind === 'NAMESPACE') {
      if (shapeAtom.kind === 'LITERAL' || shapeAtom.kind === 'NAMESPACE') {
        if (patternAtom.text !== shapeAtom.text) return { reason: 'SEGMENT_MISMATCH' };
      } else if (shapeAtom.kind === 'ENV_PREFIX') {
        if (!envLiteralMapped(patternAtom.text, envMap)) return { reason: 'ENV_PREFIX_MISMATCH' };
      } else if (shapeAtom.kind === 'VARIABLE') {
        return { reason: 'EXACT_PATTERN_ON_VARIABLE_SHAPE' };
      } else {
        return { reason: 'SEGMENT_MISMATCH' };
      }
    } else if (shapeAtom.kind === 'ENV_PREFIX') {
      if (patternAtom.kind !== 'ENV_PREFIX') return { reason: 'ENV_PREFIX_MISMATCH' };
    } else if (shapeAtom.kind === 'VARIABLE') {
      if (patternAtom.kind !== 'VARIABLE') return { reason: 'ENV_PREFIX_MISMATCH' };
    } else if (shapeAtom.kind === 'LITERAL' || shapeAtom.kind === 'NAMESPACE') {
      return { reason: patternAtom.kind === 'ENV_PREFIX' ? 'ENV_PREFIX_MISMATCH' : 'OPAQUE_SEGMENT_ON_LITERAL_SHAPE' };
    } else {
      return { reason: 'SEGMENT_MISMATCH' };
    }
    shapeIndex += 1;
    patternIndex += 1;
  }
}

/**
 * Evaluate declared coverage. Rows are deterministic and sorted by the consumer
 * shape digest; an exclusion is matched by the full shape digest only.
 */
export function evaluateKeyCoverage(input: {
  readonly shapes: readonly ExtractedShape[];
  readonly patterns: readonly ExtractedPattern[];
  readonly envMap: CacheKeyEnvMap;
  readonly exclusions: readonly string[];
}): readonly CacheKeyCoverageRow[] {
  const rows: CacheKeyCoverageRow[] = [];
  for (const shape of input.shapes) {
    if (input.exclusions.includes(shape.digest)) {
      rows.push({ consumerShapeDigest: shape.digest, producerPatternDigest: null, verdict: 'EXCLUDED_BY_DECLARATION', reasonCode: null });
      continue;
    }
    let failure: AlignmentFailure | null = null;
    let coveredBy: string | null = null;
    for (const pattern of input.patterns) {
      const result = patternCoversShape(shape.shape, pattern.shape, input.envMap);
      if (result === true) { coveredBy = pattern.digest; break; }
      failure = failure ?? result;
    }
    if (coveredBy !== null) {
      rows.push({ consumerShapeDigest: shape.digest, producerPatternDigest: coveredBy, verdict: 'COVERED', reasonCode: null });
    } else if (input.patterns.length === 0) {
      rows.push({ consumerShapeDigest: shape.digest, producerPatternDigest: null, verdict: 'NOT_APPLICABLE', reasonCode: null });
    } else {
      rows.push({ consumerShapeDigest: shape.digest, producerPatternDigest: null, verdict: 'NOT_COVERED', reasonCode: failure?.reason ?? 'MISSING_WILDCARD' });
    }
  }
  return rows.sort((left, right) => (left.consumerShapeDigest < right.consumerShapeDigest ? -1 : left.consumerShapeDigest > right.consumerShapeDigest ? 1 : 0));
}
