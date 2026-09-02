// ---------------------------------------------------------------------------
// Nightwatch C-03 — bounded Go gRPC registration reader.
//
// Recognises `pkg.Register<Service>Server(...)` call sites and
// `pkg.Unimplemented<Service>Server` embedding, and resolves the package
// qualifier through the file's OWN import block.
//
// Resolving the qualifier is the part that matters. `RegisterBillingServer`
// alone says nothing about which package it came from, so binding on the
// symbol would bind any `Billing` service in any module. The import path is
// what turns a suggestive name into an address.
//
// Comment and string handling is delegated to the existing
// `tokenizeStaticSource` lexer rather than reimplemented, so a registration
// written inside a comment or a string literal is not visible to any rule
// here — the same layering argument C-02b's proto lexer rests on.
//
// Data-in / data-out. No filesystem, process, or network authority, and no Go
// toolchain: this is a lexer, not a compiler.
// ---------------------------------------------------------------------------

import { tokenizeStaticSource, type StaticLexicalToken } from './lexical';
import type { SourceCompletenessState } from './completeness';

export const GO_REGISTRATION_VERSION = 'nightwatch.go-grpc-registration.v1' as const;

export const GO_MAX_IMPORTS = 512;
export const GO_MAX_REGISTRATIONS = 256;
export const GO_MAX_EMBEDDINGS = 256;

export const GO_REGISTRATION_STATES = ['PROVEN', 'QUALIFIER_UNRESOLVED', 'QUALIFIER_AMBIGUOUS'] as const;
export type GoRegistrationState = (typeof GO_REGISTRATION_STATES)[number];

export const GO_INCOMPLETENESS_REASONS = [
  'GO_LEXICAL_BUDGET_EXHAUSTED',
  'GO_IMPORT_CEILING_REACHED',
  'GO_REGISTRATION_CEILING_REACHED',
  'GO_EMBEDDING_CEILING_REACHED',
] as const;
export type GoIncompletenessReason = (typeof GO_INCOMPLETENESS_REASONS)[number];

export interface GoImportBinding {
  /** The identifier this import binds in file scope. */
  readonly identifier: string;
  readonly importPath: string;
  /** `_` and `.` bind no usable qualifier and are recorded, not silently kept. */
  readonly form: 'NAMED' | 'ALIASED' | 'BLANK' | 'DOT';
}

export interface GoServerRegistration {
  readonly registrationSymbol: string;
  readonly serviceToken: string;
  readonly qualifier: string | null;
  readonly importPath: string | null;
  readonly state: GoRegistrationState;
  readonly ordinal: number;
}

export interface GoUnimplementedEmbedding {
  readonly embeddingSymbol: string;
  readonly serviceToken: string;
  readonly qualifier: string | null;
  readonly importPath: string | null;
  readonly ordinal: number;
}

export interface GoRegistrationCompleteness {
  readonly state: SourceCompletenessState;
  readonly reason: GoIncompletenessReason | null;
  readonly droppedByCeiling: number;
}

export interface GoRegistrationFacts {
  readonly schemaVersion: typeof GO_REGISTRATION_VERSION;
  readonly imports: readonly GoImportBinding[];
  readonly registrations: readonly GoServerRegistration[];
  readonly embeddings: readonly GoUnimplementedEmbedding[];
  readonly completeness: GoRegistrationCompleteness;
}

const REGISTER_RE = /^Register([A-Z][A-Za-z0-9_]*)Server$/;
const UNIMPLEMENTED_RE = /^Unimplemented([A-Z][A-Za-z0-9_]*)Server$/;
const SAFE_IMPORT_PATH_RE = /^[A-Za-z0-9._~\-/]{1,256}$/;
const SAFE_IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
/** A trailing `/v1`-style segment is a version, not the package name. Go binds
 * the identifier from the package clause, and for these generated SDKs that is
 * the directory ABOVE the version. Every real ouchan registration is written
 * this way, so treating `v1` as the package name unresolves all of them. */
const VERSION_SEGMENT_RE = /^v[0-9]+(?:[a-z0-9]+)?$/;

/** Only production Go files carry topology facts. A registration in a test
 * file registers a stub against a throwaway server and serves nothing; the two
 * real cases in `pkg/exportcostfilters` would otherwise give `Cost` two extra
 * implementations. Matched on the filename suffix Go itself uses, so a package
 * merely named `testd` or `testutil` stays eligible. */
export function isTopologyEligibleGoPath(relativePath: string): boolean {
  if (!relativePath.endsWith('.go')) return false;
  const name = relativePath.slice(relativePath.lastIndexOf('/') + 1);
  return !name.endsWith('_test.go');
}

function packageIdentifierFor(importPath: string): string | null {
  const segments = importPath.split('/').filter((segment) => segment.length > 0);
  const last = segments.at(-1);
  if (last === undefined) return null;
  const candidate = VERSION_SEGMENT_RE.test(last) ? segments.at(-2) : last;
  if (candidate === undefined) return null;
  const normalized = candidate.replace(/[.-]/g, '_');
  return SAFE_IDENTIFIER_RE.test(normalized) ? normalized : null;
}

/** Read the file's import declarations from the token stream. Both the
 * parenthesised block and the single-line form are handled; anything else
 * binds nothing rather than being guessed at. */
function readImports(tokens: readonly StaticLexicalToken[]): { readonly bindings: readonly GoImportBinding[]; readonly droppedByCeiling: number } {
  const bindings: GoImportBinding[] = [];
  let droppedByCeiling = 0;

  const push = (identifier: string | null, importPath: string, form: GoImportBinding['form']): void => {
    if (bindings.length >= GO_MAX_IMPORTS) { droppedByCeiling += 1; return; }
    if (!SAFE_IMPORT_PATH_RE.test(importPath)) return;
    // `import _ "…"` and `import . "…"` bind no usable qualifier. Falling back
    // to the derived package name here would resolve a qualifier the file
    // never actually binds — the blank-import case, where the package is
    // imported purely for its side effects and `billing.X` would not compile.
    if (form === 'BLANK' || form === 'DOT') return;
    const bound = identifier ?? packageIdentifierFor(importPath);
    if (bound === null || !SAFE_IDENTIFIER_RE.test(bound)) return;
    bindings.push({ identifier: bound, importPath, form });
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === undefined || token.kind !== 'IDENTIFIER' || token.value !== 'import') continue;
    const next = tokens[index + 1];
    if (next === undefined) break;

    if (next.kind === 'PUNCT' && next.value === '(') {
      let cursor = index + 2;
      while (cursor < tokens.length) {
        const entry = tokens[cursor];
        if (entry === undefined) break;
        if (entry.kind === 'PUNCT' && entry.value === ')') break;
        if (entry.kind === 'STRING') { push(null, entry.value, 'NAMED'); cursor += 1; continue; }
        if (entry.kind === 'IDENTIFIER') {
          const target = tokens[cursor + 1];
          if (target !== undefined && target.kind === 'STRING') { push(entry.value === '_' ? null : entry.value, target.value, entry.value === '_' ? 'BLANK' : 'ALIASED'); cursor += 2; continue; }
          cursor += 1;
          continue;
        }
        if (entry.kind === 'PUNCT' && (entry.value === '_' || entry.value === '.')) {
          const target = tokens[cursor + 1];
          // `_` and `.` bind no usable qualifier. Recording the path without a
          // binding is deliberate: a dot import really does make the qualifier
          // unresolvable, and pretending otherwise would invent a package.
          if (target !== undefined && target.kind === 'STRING') { cursor += 2; continue; }
        }
        cursor += 1;
      }
      index = cursor;
      continue;
    }

    if (next.kind === 'STRING') { push(null, next.value, 'NAMED'); index += 1; continue; }
    if (next.kind === 'IDENTIFIER') {
      const target = tokens[index + 2];
      if (target !== undefined && target.kind === 'STRING') { push(next.value === '_' ? null : next.value, target.value, next.value === '_' ? 'BLANK' : 'ALIASED'); index += 2; }
      continue;
    }
    if (next.kind === 'PUNCT' && (next.value === '_' || next.value === '.')) {
      index += 2;
      continue;
    }
  }

  return { bindings, droppedByCeiling };
}

function resolve(bindings: readonly GoImportBinding[], qualifier: string | null): { readonly importPath: string | null; readonly state: GoRegistrationState } {
  if (qualifier === null) return { importPath: null, state: 'QUALIFIER_UNRESOLVED' };
  const matches = bindings.filter((binding) => binding.identifier === qualifier);
  if (matches.length === 0) return { importPath: null, state: 'QUALIFIER_UNRESOLVED' };
  // More than one import binding the same identifier does not compile, but a
  // reader must not pick one: the honest answer is that the qualifier is
  // ambiguous in the text as given.
  if (matches.length > 1 || new Set(matches.map((entry) => entry.importPath)).size > 1) return { importPath: null, state: 'QUALIFIER_AMBIGUOUS' };
  return { importPath: matches[0]?.importPath ?? null, state: 'PROVEN' };
}

/**
 * Read the gRPC registration facts of one Go file.
 *
 * A registration is `identifier . Register<Service>Server (` — the trailing
 * parenthesis matters, so a bare reference to the symbol is not a call.
 */
export function readGoRegistrations(sourceText: string): GoRegistrationFacts {
  const tokens = tokenizeStaticSource(sourceText, 'GO');
  if (tokens === null) {
    return {
      schemaVersion: GO_REGISTRATION_VERSION,
      imports: [],
      registrations: [],
      embeddings: [],
      completeness: { state: 'UNKNOWN', reason: 'GO_LEXICAL_BUDGET_EXHAUSTED', droppedByCeiling: 0 },
    };
  }

  const { bindings, droppedByCeiling: importDrops } = readImports(tokens);
  const registrations: GoServerRegistration[] = [];
  const embeddings: GoUnimplementedEmbedding[] = [];
  let droppedByCeiling = importDrops;
  let ceilingReason: GoIncompletenessReason | null = importDrops > 0 ? 'GO_IMPORT_CEILING_REACHED' : null;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === undefined || token.kind !== 'IDENTIFIER') continue;

    const registerMatch = REGISTER_RE.exec(token.value);
    const embeddingMatch = UNIMPLEMENTED_RE.exec(token.value);
    if (registerMatch === null && embeddingMatch === null) continue;

    const previous = tokens[index - 1];
    const beforeDot = tokens[index - 2];
    const qualified = previous !== undefined && previous.kind === 'PUNCT' && previous.value === '.'
      && beforeDot !== undefined && beforeDot.kind === 'IDENTIFIER';
    const qualifier = qualified ? (beforeDot?.value ?? null) : null;

    if (registerMatch !== null) {
      const following = tokens[index + 1];
      // A call, not a reference: `RegisterXServer` used as a value is not a
      // registration and must not be counted as one.
      if (following === undefined || following.kind !== 'PUNCT' || following.value !== '(') continue;
      if (registrations.length >= GO_MAX_REGISTRATIONS) {
        droppedByCeiling += 1;
        ceilingReason = ceilingReason ?? 'GO_REGISTRATION_CEILING_REACHED';
        continue;
      }
      const resolved = resolve(bindings, qualifier);
      registrations.push({
        registrationSymbol: token.value,
        serviceToken: registerMatch[1] as string,
        qualifier,
        importPath: resolved.importPath,
        state: resolved.state,
        ordinal: registrations.length,
      });
      continue;
    }

    if (embeddings.length >= GO_MAX_EMBEDDINGS) {
      droppedByCeiling += 1;
      ceilingReason = ceilingReason ?? 'GO_EMBEDDING_CEILING_REACHED';
      continue;
    }
    const resolved = resolve(bindings, qualifier);
    embeddings.push({
      embeddingSymbol: token.value,
      serviceToken: (embeddingMatch as RegExpExecArray)[1] as string,
      qualifier,
      importPath: resolved.importPath,
      ordinal: embeddings.length,
    });
  }

  return {
    schemaVersion: GO_REGISTRATION_VERSION,
    imports: bindings,
    registrations,
    embeddings,
    completeness: {
      state: ceilingReason === null ? 'COMPLETE' : 'TRUNCATED',
      reason: ceilingReason,
      droppedByCeiling,
    },
  };
}
