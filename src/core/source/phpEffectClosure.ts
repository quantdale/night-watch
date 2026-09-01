// ---------------------------------------------------------------------------
// Nightwatch C-06 — bounded PHP effect closure.
//
// Rooted at a route's fully resolved middleware pipeline PLUS its handler, not
// at the handler alone (independent review F-01). The walk is bounded in
// depth, declarations, callsites, files and tokens, and every way of leaving
// the analysable region is a distinct categorical refusal:
//
//   * a callee name that does not predict the executed member  → DYNAMIC
//   * a callee the vocabulary does not classify                → UNCLASSIFIED
//   * a symbol that is absent, or declared more than once      → UNRESOLVED
//   * any bound exceeded                                       → OVERFLOW
//
// Cross-file `$this` binding is deliberately NOT performed: D-79 reproduced
// exactly that as a false-positive admission. Recursion is confined to
// declarations in the same file as the caller.
//
// The analyzer distinguishes two terminal negatives. `EFFECTFUL` is a DECIDED
// fact — a disqualifying effect kind was observed. `AMBIGUOUS` is an absence
// of knowledge. Neither is a proof, and the distinction is never used to
// upgrade either one.
// ---------------------------------------------------------------------------

import { sourceEvidenceDigest } from '../semanticCoverage';
import { findFunctionBody, tokenizePhp, type PhpToken } from '../../oracles/expectations/extract/php';
import {
  EFFECT_KINDS,
  EFFECT_KIND_POLICY,
  MAX_EFFECT_CLOSURE_CALLSITES,
  MAX_EFFECT_CLOSURE_DECLARATIONS,
  MAX_EFFECT_CLOSURE_DEPTH,
  MAX_EFFECT_CLOSURE_FILES,
  MAX_EFFECT_CLOSURE_TOKENS,
  PHP_DYNAMIC_DISPATCH_MEMBERS,
  isPhpControlConstruct,
  isPhpDynamicDispatchCallee,
  phpCalleeEffectKind,
  phpEffectVocabularyDigest,
  type EffectKind,
} from './effectVocabulary';

export const PHP_EFFECT_CLOSURE_VERSION = 'nightwatch.php-effect-closure.v1' as const;

export const PHP_CLOSURE_REJECTION_CODES = [
  'CLOSURE_SOURCE_UNAVAILABLE',
  'CLOSURE_SOURCE_UNSUPPORTED',
  'CLOSURE_SYMBOL_MISSING',
  'CLOSURE_SYMBOL_AMBIGUOUS',
  'CLOSURE_DYNAMIC_DISPATCH',
  'CLOSURE_CALLEE_UNCLASSIFIED',
  'CLOSURE_DEPTH_OVERFLOW',
  'CLOSURE_DECLARATION_BUDGET',
  'CLOSURE_CALLSITE_BUDGET',
  'CLOSURE_FILE_BUDGET',
  'CLOSURE_TOKEN_BUDGET',
  'CLOSURE_NO_ENTRYPOINT',
] as const;
export type PhpClosureRejectionCode = (typeof PHP_CLOSURE_REJECTION_CODES)[number];

export type PhpEffectClosureState = 'PURE_READ_PROVEN' | 'EFFECTFUL' | 'AMBIGUOUS';

export type PhpClosureEntrypointRole = 'MIDDLEWARE' | 'HANDLER';

export interface PhpClosureEntrypoint {
  readonly relativePath: string;
  readonly symbol: string;
  readonly role: PhpClosureEntrypointRole;
}

/**
 * The caller's read boundary. The caller is responsible for admitting only
 * approved, eligible, non-stale files; this module never resolves a path or
 * touches a filesystem itself.
 */
export interface PhpClosureSourceResolver {
  read(relativePath: string): string | null;
}

export interface PhpEffectKindCount {
  readonly kind: EffectKind;
  readonly count: number;
}

export interface PhpEffectClosureProof {
  readonly schemaVersion: typeof PHP_EFFECT_CLOSURE_VERSION;
  readonly state: PhpEffectClosureState;
  readonly rejectionCode: PhpClosureRejectionCode | null;
  /** Entrypoints actually walked, in order. */
  readonly entrypoints: readonly PhpClosureEntrypoint[];
  /** Occurrence count per effect kind across the whole closure. */
  readonly effectCounts: readonly PhpEffectKindCount[];
  /** Distinct disqualifying kinds actually observed. */
  readonly disqualifyingKinds: readonly EffectKind[];
  readonly distinctCallees: number;
  readonly classifiedCallees: number;
  readonly unclassifiedCallees: number;
  readonly visitedDeclarations: number;
  readonly maxDepthReached: number;
  readonly filesRead: number;
  readonly callsites: number;
  readonly vocabularyDigest: string;
  readonly evidenceDigest: string;
}

interface FileFacts {
  readonly tokens: readonly PhpToken[];
  /** Function name → number of declarations in this file. */
  readonly declarations: ReadonlyMap<string, number>;
  readonly declaresDynamicMember: boolean;
}

interface WorkItem {
  readonly relativePath: string;
  readonly symbol: string;
  readonly depth: number;
}

function isCallOpen(token: PhpToken | undefined): boolean {
  return token !== undefined && token.t === 'PUNCT' && token.v === '(';
}

/** Index a file's own function declarations and its magic-member declarations. */
function fileFacts(tokens: readonly PhpToken[]): FileFacts {
  const declarations = new Map<string, number>();
  let declaresDynamicMember = false;
  for (let index = 0; index + 1 < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.t !== 'WORD' || token.v !== 'function') continue;
    const name = tokens[index + 1];
    if (name === undefined || name.t !== 'WORD') continue;
    declarations.set(name.v, (declarations.get(name.v) ?? 0) + 1);
    if (PHP_DYNAMIC_DISPATCH_MEMBERS.includes(name.v)) declaresDynamicMember = true;
  }
  return { tokens, declarations, declaresDynamicMember };
}

/**
 * Walk the bounded effect closure of one route's pipeline plus handler.
 *
 * Precedence of outcomes, applied once at the end:
 *   an observed disqualifying kind ⇒ `EFFECTFUL` (decided);
 *   otherwise any refusal          ⇒ `AMBIGUOUS` (undecided);
 *   otherwise                      ⇒ `PURE_READ_PROVEN`.
 */
export function analyzePhpEffectClosure(input: {
  readonly entrypoints: readonly PhpClosureEntrypoint[];
  readonly resolver: PhpClosureSourceResolver;
}): PhpEffectClosureProof {
  const vocabularyDigest = phpEffectVocabularyDigest();
  const effectCounts = new Map<EffectKind, number>();
  const disqualifying = new Set<EffectKind>();
  const distinctCallees = new Set<string>();
  const unclassified = new Set<string>();
  const visited = new Set<string>();
  const files = new Map<string, FileFacts | null>();
  let rejectionCode: PhpClosureRejectionCode | null = null;
  let maxDepthReached = 0;
  let callsites = 0;
  let tokenBudget = 0;

  const refuse = (code: PhpClosureRejectionCode): void => {
    if (rejectionCode === null) rejectionCode = code;
  };
  const record = (kind: EffectKind): void => {
    effectCounts.set(kind, (effectCounts.get(kind) ?? 0) + 1);
    if (EFFECT_KIND_POLICY[kind] === 'DISQUALIFYING') disqualifying.add(kind);
  };

  const loadFile = (relativePath: string): FileFacts | null => {
    const cached = files.get(relativePath);
    if (cached !== undefined) return cached;
    if (files.size >= MAX_EFFECT_CLOSURE_FILES) {
      refuse('CLOSURE_FILE_BUDGET');
      files.set(relativePath, null);
      return null;
    }
    const sourceText = input.resolver.read(relativePath);
    if (sourceText === null) {
      refuse('CLOSURE_SOURCE_UNAVAILABLE');
      files.set(relativePath, null);
      return null;
    }
    let tokens: readonly PhpToken[];
    try {
      tokens = tokenizePhp(sourceText);
    } catch {
      refuse('CLOSURE_SOURCE_UNSUPPORTED');
      files.set(relativePath, null);
      return null;
    }
    tokenBudget += tokens.length;
    if (tokenBudget > MAX_EFFECT_CLOSURE_TOKENS) {
      refuse('CLOSURE_TOKEN_BUDGET');
      files.set(relativePath, null);
      return null;
    }
    const facts = fileFacts(tokens);
    if (facts.declaresDynamicMember) refuse('CLOSURE_DYNAMIC_DISPATCH');
    files.set(relativePath, facts);
    return facts;
  };

  const queue: WorkItem[] = input.entrypoints.map((entrypoint) => ({ relativePath: entrypoint.relativePath, symbol: entrypoint.symbol, depth: 0 }));
  if (queue.length === 0) refuse('CLOSURE_NO_ENTRYPOINT');

  while (queue.length > 0) {
    const item = queue.shift()!;
    const key = `${item.relativePath}#${item.symbol}`;
    if (visited.has(key)) continue;
    if (visited.size >= MAX_EFFECT_CLOSURE_DECLARATIONS) {
      refuse('CLOSURE_DECLARATION_BUDGET');
      break;
    }
    visited.add(key);
    maxDepthReached = Math.max(maxDepthReached, item.depth);

    const facts = loadFile(item.relativePath);
    if (facts === null) continue;
    const declarationCount = facts.declarations.get(item.symbol) ?? 0;
    if (declarationCount === 0) {
      refuse('CLOSURE_SYMBOL_MISSING');
      continue;
    }
    if (declarationCount > 1) {
      refuse('CLOSURE_SYMBOL_AMBIGUOUS');
      continue;
    }
    const body = findFunctionBody(facts.tokens, item.symbol);
    if (body === null) {
      refuse('CLOSURE_SYMBOL_MISSING');
      continue;
    }

    const tokens = facts.tokens;
    for (let index = body.start; index <= body.end; index += 1) {
      const token = tokens[index]!;
      const previous = tokens[index - 1];
      const member = previous !== undefined && previous.t === 'OP' && (previous.v === '->' || previous.v === '::');

      // A member access whose name is a value, not an identifier:
      //   `$x->$name(...)`, `$x->{expr}(...)`, `$fn(...)`.
      if (member && (token.t === 'VARIABLE' || (token.t === 'PUNCT' && token.v === '{'))) {
        refuse('CLOSURE_DYNAMIC_DISPATCH');
        continue;
      }
      if (!member && token.t === 'VARIABLE' && isCallOpen(tokens[index + 1])) {
        refuse('CLOSURE_DYNAMIC_DISPATCH');
        continue;
      }
      if (token.t !== 'WORD' || !isCallOpen(tokens[index + 1])) continue;

      // `new X(` constructs an object; the constructor's effects are not
      // analysable from the identifier, so it is an unclassified callee.
      const construction = previous !== undefined && previous.t === 'WORD' && previous.v === 'new';
      // A declaration's own name is not a callsite, and neither is a control
      // structure that happens to be written with parentheses.
      if (previous !== undefined && previous.t === 'WORD' && previous.v === 'function') continue;
      if (!member && !construction && isPhpControlConstruct(token.v)) continue;

      callsites += 1;
      if (callsites > MAX_EFFECT_CLOSURE_CALLSITES) {
        refuse('CLOSURE_CALLSITE_BUDGET');
        break;
      }

      const scope = member || construction ? 'METHOD' : 'FUNCTION';
      const identifier = construction ? `new ${token.v}` : token.v;
      distinctCallees.add(`${scope}:${identifier}`);

      if (!construction && isPhpDynamicDispatchCallee(token.v, scope)) {
        refuse('CLOSURE_DYNAMIC_DISPATCH');
        continue;
      }

      const kind = construction ? 'UNCLASSIFIED' : phpCalleeEffectKind(token.v, scope);
      if (kind !== 'UNCLASSIFIED') {
        record(kind);
        continue;
      }

      // Unclassified by the vocabulary: recurse only into a declaration of the
      // same name in the SAME file. Cross-file `$this` binding is the D-79
      // false positive and is never performed.
      if (!construction && facts.declarations.get(token.v) === 1) {
        if (item.depth + 1 > MAX_EFFECT_CLOSURE_DEPTH) {
          refuse('CLOSURE_DEPTH_OVERFLOW');
          continue;
        }
        queue.push({ relativePath: item.relativePath, symbol: token.v, depth: item.depth + 1 });
        continue;
      }
      unclassified.add(`${scope}:${identifier}`);
      record('UNCLASSIFIED');
      refuse('CLOSURE_CALLEE_UNCLASSIFIED');
    }
  }

  const disqualifyingKinds = [...disqualifying].sort((left, right) => left.localeCompare(right));
  const state: PhpEffectClosureState = disqualifyingKinds.length > 0 ? 'EFFECTFUL' : rejectionCode !== null ? 'AMBIGUOUS' : 'PURE_READ_PROVEN';
  const counts: readonly PhpEffectKindCount[] = EFFECT_KINDS.map((kind) => ({ kind, count: effectCounts.get(kind) ?? 0 }));
  return {
    schemaVersion: PHP_EFFECT_CLOSURE_VERSION,
    state,
    rejectionCode,
    entrypoints: input.entrypoints,
    effectCounts: counts,
    disqualifyingKinds,
    distinctCallees: distinctCallees.size,
    classifiedCallees: distinctCallees.size - unclassified.size,
    unclassifiedCallees: unclassified.size,
    visitedDeclarations: visited.size,
    maxDepthReached,
    filesRead: [...files.values()].filter((facts) => facts !== null).length,
    callsites,
    vocabularyDigest,
    evidenceDigest: sourceEvidenceDigest({
      kind: 'php-effect-closure',
      version: PHP_EFFECT_CLOSURE_VERSION,
      vocabularyDigest,
      entrypoints: input.entrypoints.map((entrypoint) => [entrypoint.role, entrypoint.relativePath, entrypoint.symbol]),
      state,
      rejectionCode,
      counts: counts.map((entry) => [entry.kind, entry.count]),
      visitedDeclarations: visited.size,
      maxDepthReached,
    }),
  };
}
