// ---------------------------------------------------------------------------
// Nightwatch Phase 25 — bounded lexical support for static route discovery.
//
// This is deliberately a small tokenizer, not a language parser. It emits
// only identifiers, opaque string literals, and punctuation so route discovery
// can ignore comments and code-like text inside strings without executing or
// evaluating source. Malformed lexical constructs fail closed for the caller.
// ---------------------------------------------------------------------------

export type StaticLexicalLanguage = 'TYPESCRIPT' | 'JAVASCRIPT' | 'GO';
export type StaticLexicalTokenKind = 'IDENTIFIER' | 'STRING' | 'PUNCT';
export type StaticLexicalQuote = "'" | '"' | '`';

export interface StaticLexicalToken {
  readonly kind: StaticLexicalTokenKind;
  readonly value: string;
  readonly quote?: StaticLexicalQuote;
}

const MAX_STATIC_SOURCE_CHARS = 2_000_000;
const MAX_STATIC_TOKENS = 500_000;
const MAX_STATIC_STRING_CHARS = 4_096;

function identifierStart(value: string, language: StaticLexicalLanguage): boolean {
  if (value.length !== 1) return false;
  const code = value.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || value === '_' || (language !== 'GO' && value === '$');
}

function identifierPart(value: string, language: StaticLexicalLanguage): boolean {
  if (identifierStart(value, language)) return true;
  if (value.length !== 1) return false;
  const code = value.charCodeAt(0);
  return code >= 48 && code <= 57;
}

function canStartJavascriptRegex(tokens: readonly StaticLexicalToken[]): boolean {
  const previous = tokens.at(-1);
  if (previous === undefined) return true;
  if (previous.kind === 'IDENTIFIER') {
    return new Set(['await', 'case', 'delete', 'else', 'in', 'instanceof', 'new', 'of', 'return', 'throw', 'typeof', 'void', 'yield']).has(previous.value);
  }
  return previous.kind === 'PUNCT' && new Set(['!', '&', '(', ',', ':', ';', '=', '?', '[', '{', '|', '~']).has(previous.value);
}

function skipRegexLiteral(sourceText: string, start: number): number | null {
  let index = start + 1;
  let inClass = false;
  while (index < sourceText.length) {
    const character = sourceText[index]!;
    if (character === '\\') {
      if (index + 1 >= sourceText.length) return null;
      index += 2;
      continue;
    }
    if (character === '[') {
      inClass = true;
      index += 1;
      continue;
    }
    if (character === ']') {
      inClass = false;
      index += 1;
      continue;
    }
    if (character === '/' && !inClass) {
      index += 1;
      while (index < sourceText.length && /[A-Za-z]/.test(sourceText[index]!)) index += 1;
      return index;
    }
    if (character === '\n' || character === '\r') return null;
    index += 1;
  }
  return null;
}

function readQuotedString(sourceText: string, start: number, quote: "'" | '"'): { readonly value: string; readonly next: number } | null {
  let index = start + 1;
  let value = '';
  while (index < sourceText.length) {
    const character = sourceText[index]!;
    if (character === quote) return { value, next: index + 1 };
    if (character === '\n' || character === '\r') return null;
    if (character !== '\\') {
      if (value.length >= MAX_STATIC_STRING_CHARS) return null;
      value += character;
      index += 1;
      continue;
    }
    if (index + 1 >= sourceText.length) return null;
    const escaped = sourceText[index + 1]!;
    const decoded = escaped === 'n' ? '\n' : escaped === 'r' ? '\r' : escaped === 't' ? '\t' : escaped;
    if (value.length + decoded.length > MAX_STATIC_STRING_CHARS) return null;
    value += decoded;
    index += 2;
  }
  return null;
}

function skipTemplateOrRawString(sourceText: string, start: number, language: StaticLexicalLanguage): number | null {
  let index = start + 1;
  while (index < sourceText.length) {
    const character = sourceText[index]!;
    if (language !== 'GO' && character === '\\') {
      if (index + 1 >= sourceText.length) return null;
      index += 2;
      continue;
    }
    if (character === '`') return index + 1;
    index += 1;
  }
  return null;
}

/** Tokenize only the lexical material needed by static route discovery. */
export interface StaticLexicalOptions {
  /** C-04 — keep the raw text of a template literal.
   *
   * Route discovery has never needed it: a template is not a literal route, so
   * dropping the body was the safe default and remains the default. C-04 needs
   * the body to decide whether an interpolation fills a whole path segment
   * (`/v1/accounts/{}`) or splits one (`/v1/acc${x}`), which is the difference
   * between a structural fact and an inference. Off unless asked for, so every
   * existing caller lexes byte-identically. */
  readonly preserveTemplates?: boolean;
}

export function tokenizeStaticSource(sourceText: string, language: StaticLexicalLanguage, options: StaticLexicalOptions = {}): readonly StaticLexicalToken[] | null {
  if (sourceText.length > MAX_STATIC_SOURCE_CHARS) return null;
  const tokens: StaticLexicalToken[] = [];
  let index = 0;
  while (index < sourceText.length) {
    if (tokens.length >= MAX_STATIC_TOKENS) return null;
    const character = sourceText[index]!;
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    if (character === '/' && sourceText[index + 1] === '/') {
      index += 2;
      while (index < sourceText.length && sourceText[index] !== '\n') index += 1;
      continue;
    }
    if (character === '/' && sourceText[index + 1] === '*') {
      const end = sourceText.indexOf('*/', index + 2);
      if (end === -1) return null;
      index = end + 2;
      continue;
    }
    if (character === '`') {
      const next = skipTemplateOrRawString(sourceText, index, language);
      if (next === null) return null;
      const raw = options.preserveTemplates === true ? sourceText.slice(index + 1, Math.max(index + 1, next - 1)) : '';
      tokens.push({ kind: 'STRING', value: raw.length > MAX_STATIC_STRING_CHARS ? '' : raw, quote: '`' });
      index = next;
      continue;
    }
    if (character === "'" || character === '"') {
      const parsed = readQuotedString(sourceText, index, character);
      if (parsed === null) return null;
      tokens.push({ kind: 'STRING', value: parsed.value, quote: character });
      index = parsed.next;
      continue;
    }
    if (language !== 'GO' && character === '/' && canStartJavascriptRegex(tokens)) {
      const next = skipRegexLiteral(sourceText, index);
      if (next === null) return null;
      index = next;
      continue;
    }
    if (identifierStart(character, language)) {
      let next = index + 1;
      while (next < sourceText.length && identifierPart(sourceText[next]!, language)) next += 1;
      tokens.push({ kind: 'IDENTIFIER', value: sourceText.slice(index, next) });
      index = next;
      continue;
    }
    tokens.push({ kind: 'PUNCT', value: character });
    index += 1;
  }
  return tokens;
}
