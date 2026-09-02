// ---------------------------------------------------------------------------
// Nightwatch C-02b — bounded protobuf lexer.
//
// This is the ONLY module in the protobuf path that understands comment and
// string syntax, and that is a load-bearing design choice rather than tidiness.
// Comments and string bodies are resolved here, so a declaration rule
// downstream cannot observe a comment even by accident: there is no code path
// from comment text to a fact for a later change to open.
//
// It is data-in / data-out. It has no filesystem, process, or network
// authority; it takes source TEXT and returns tokens. Every loop is bounded by
// an explicit ceiling and every exhaustion is a categorical state, never a
// silent stop.
// ---------------------------------------------------------------------------

export const PROTO_LEXER_VERSION = 'nightwatch.proto-lexer.v1' as const;

/** Token ceiling. `billing/v1/billing.proto` (129,892 bytes, the largest file
 * in the approved universe) lexes to well under a tenth of this. */
export const PROTO_MAX_TOKENS = 200_000;

/** Brace-nesting ceiling. Real protobuf nests a handful deep; anything near
 * this is either generated pathology or an attack on the reader. */
export const PROTO_MAX_DEPTH = 64;

/** Byte ceiling applied by the lexer itself, independent of the scan budget. */
export const PROTO_MAX_SOURCE_BYTES = 8_000_000;

export const PROTO_TOKEN_KINDS = ['IDENTIFIER', 'STRING', 'NUMBER', 'PUNCTUATION'] as const;
export type ProtoTokenKind = (typeof PROTO_TOKEN_KINDS)[number];

export const PROTO_LEX_STATES = [
  'COMPLETE',
  'TOKEN_BUDGET_EXHAUSTED',
  'DEPTH_EXCEEDED',
  'UNTERMINATED_COMMENT',
  'UNTERMINATED_STRING',
  'BYTE_BUDGET_EXHAUSTED',
] as const;
export type ProtoLexState = (typeof PROTO_LEX_STATES)[number];

export interface ProtoToken {
  readonly kind: ProtoTokenKind;
  /** For STRING, the decoded literal value. Never the surrounding quotes. */
  readonly value: string;
  readonly line: number;
}

export interface ProtoLexResult {
  readonly schemaVersion: typeof PROTO_LEXER_VERSION;
  readonly state: ProtoLexState;
  readonly tokens: readonly ProtoToken[];
  readonly tokenCount: number;
  readonly commentsDiscarded: number;
  readonly maxDepthObserved: number;
}

export interface ProtoLexOptions {
  readonly maxTokens?: number;
  readonly maxDepth?: number;
  readonly maxSourceBytes?: number;
}

const IDENTIFIER_START = /[A-Za-z_]/;
const IDENTIFIER_PART = /[A-Za-z0-9_.]/;
const DIGIT = /[0-9]/;

/** Minimal, closed escape table. An unknown escape keeps its literal
 * character, which is deliberate: the reader never invents a byte it did not
 * see, and route-template safety validation is what rejects the result. */
function decodeEscape(character: string): string {
  if (character === 'n') return '\n';
  if (character === 'r') return '\r';
  if (character === 't') return '\t';
  if (character === '0') return '\0';
  return character;
}

function result(
  state: ProtoLexState,
  tokens: readonly ProtoToken[],
  commentsDiscarded: number,
  maxDepthObserved: number,
): ProtoLexResult {
  return {
    schemaVersion: PROTO_LEXER_VERSION,
    state,
    tokens,
    tokenCount: tokens.length,
    commentsDiscarded,
    maxDepthObserved,
  };
}

/**
 * Tokenize protobuf source.
 *
 * Order matters and is asserted by the suite: comments are recognized before
 * strings, so a quote inside a comment cannot open a string, and strings are
 * consumed atomically, so `//` inside a literal cannot open a comment.
 */
export function lexProto(sourceText: string, options: ProtoLexOptions = {}): ProtoLexResult {
  const maxTokens = options.maxTokens ?? PROTO_MAX_TOKENS;
  const maxDepth = options.maxDepth ?? PROTO_MAX_DEPTH;
  const maxSourceBytes = options.maxSourceBytes ?? PROTO_MAX_SOURCE_BYTES;

  if (sourceText.length > maxSourceBytes) return result('BYTE_BUDGET_EXHAUSTED', [], 0, 0);

  const tokens: ProtoToken[] = [];
  let commentsDiscarded = 0;
  let depth = 0;
  let maxDepthObserved = 0;
  let line = 1;
  let index = 0;

  // Bounded by construction: `index` advances by at least one on every branch
  // and the guard is the source length, so the loop cannot spin.
  while (index < sourceText.length) {
    const character = sourceText[index] as string;

    if (character === '\n') {
      line += 1;
      index += 1;
      continue;
    }
    if (character === ' ' || character === '\t' || character === '\r' || character === '\f' || character === '\v') {
      index += 1;
      continue;
    }

    // Comments first.
    if (character === '/' && sourceText[index + 1] === '/') {
      const newline = sourceText.indexOf('\n', index + 2);
      index = newline === -1 ? sourceText.length : newline;
      commentsDiscarded += 1;
      continue;
    }
    if (character === '/' && sourceText[index + 1] === '*') {
      const close = sourceText.indexOf('*/', index + 2);
      if (close === -1) return result('UNTERMINATED_COMMENT', tokens, commentsDiscarded, maxDepthObserved);
      for (let scan = index; scan < close; scan += 1) if (sourceText[scan] === '\n') line += 1;
      index = close + 2;
      commentsDiscarded += 1;
      continue;
    }

    if (tokens.length >= maxTokens) return result('TOKEN_BUDGET_EXHAUSTED', tokens, commentsDiscarded, maxDepthObserved);

    // Strings, consumed atomically.
    if (character === '"' || character === "'") {
      const quote = character;
      const startLine = line;
      let cursor = index + 1;
      let value = '';
      let terminated = false;
      while (cursor < sourceText.length) {
        const current = sourceText[cursor] as string;
        if (current === '\\') {
          const next = sourceText[cursor + 1];
          if (next === undefined) break;
          value += decodeEscape(next);
          cursor += 2;
          continue;
        }
        if (current === quote) {
          terminated = true;
          cursor += 1;
          break;
        }
        if (current === '\n') line += 1;
        value += current;
        cursor += 1;
      }
      if (!terminated) return result('UNTERMINATED_STRING', tokens, commentsDiscarded, maxDepthObserved);
      tokens.push({ kind: 'STRING', value, line: startLine });
      index = cursor;
      continue;
    }

    if (IDENTIFIER_START.test(character)) {
      let cursor = index + 1;
      while (cursor < sourceText.length && IDENTIFIER_PART.test(sourceText[cursor] as string)) cursor += 1;
      tokens.push({ kind: 'IDENTIFIER', value: sourceText.slice(index, cursor), line });
      index = cursor;
      continue;
    }

    if (DIGIT.test(character) || (character === '-' && DIGIT.test(sourceText[index + 1] ?? ''))) {
      let cursor = index + 1;
      while (cursor < sourceText.length && /[0-9.eExXa-fA-F+-]/.test(sourceText[cursor] as string)) cursor += 1;
      tokens.push({ kind: 'NUMBER', value: sourceText.slice(index, cursor), line });
      index = cursor;
      continue;
    }

    if (character === '{') {
      depth += 1;
      if (depth > maxDepth) return result('DEPTH_EXCEEDED', tokens, commentsDiscarded, maxDepthObserved);
      if (depth > maxDepthObserved) maxDepthObserved = depth;
    } else if (character === '}') {
      depth = depth > 0 ? depth - 1 : 0;
    }

    tokens.push({ kind: 'PUNCTUATION', value: character, line });
    index += 1;
  }

  return result('COMPLETE', tokens, commentsDiscarded, maxDepthObserved);
}
