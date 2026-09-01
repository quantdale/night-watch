// ---------------------------------------------------------------------------
// Nightwatch C-06 — mechanical PHP route → middleware-pipeline resolution.
//
// The independent review's F-01 counterexample is the reason this module
// exists: in a Slim-style application the middleware pipeline is attached per
// route group and is NOT part of any handler's call closure, so a proof rooted
// at the handler can call a route read-only while the request still performs a
// cross-service call on every invocation.
//
// This module derives the pipeline the way the application builds it: the
// route provider states which middleware is attached unconditionally and which
// is attached under a named routing flag; the routing table states each
// route's flags. Both halves must resolve exactly. There is no handler-only
// fallback — an unresolved pipeline is AMBIGUOUS and the route fails closed.
//
// Where the provider's shape is not exactly recognized the module
// OVER-approximates (an attachment whose condition is not modelled is treated
// as attached to every route). Over-approximation can only add effects to a
// route, so it can never manufacture a read-only proof.
// ---------------------------------------------------------------------------

import { sourceEvidenceDigest } from '../semanticCoverage';
import { tokenizePhp, type PhpToken } from '../../oracles/expectations/extract/php';

export const PHP_ROUTE_PIPELINE_VERSION = 'nightwatch.php-route-pipeline.v1' as const;

export const PHP_PIPELINE_REJECTION_CODES = [
  'PIPELINE_PROVIDER_UNAVAILABLE',
  'PIPELINE_PROVIDER_UNSUPPORTED',
  'PIPELINE_ATTACHMENT_UNRESOLVED',
  'PIPELINE_MIDDLEWARE_PATH_UNRESOLVED',
  'PIPELINE_DEFAULTS_MISSING',
  'PIPELINE_FLAG_UNKNOWN',
  'PIPELINE_BOUND_EXCEEDED',
] as const;
export type PhpPipelineRejectionCode = (typeof PHP_PIPELINE_REJECTION_CODES)[number];

export type PhpPipelineState = 'RESOLVED' | 'AMBIGUOUS';

/** One middleware the provider attaches, and the condition it attaches under. */
export interface PhpMiddlewareAttachment {
  /** Fully qualified PHP class name, e.g. `App\Middleware\XMiddleware`. */
  readonly className: string;
  /** Repository-relative source path implied by the PSR-4 root `App` → `src/App`. */
  readonly relativePath: string;
  /** The middleware entrypoint symbol. Slim middleware is invokable. */
  readonly symbol: '__invoke';
  /** `null` when the attachment is unconditional. */
  readonly flag: string | null;
}

/** The provider's whole attachment table, parsed once per repository snapshot. */
export interface PhpRoutePipelineModel {
  readonly schemaVersion: typeof PHP_ROUTE_PIPELINE_VERSION;
  readonly state: PhpPipelineState;
  readonly rejectionCode: PhpPipelineRejectionCode | null;
  readonly providerPath: string;
  /** Attached to every route. */
  readonly unconditional: readonly PhpMiddlewareAttachment[];
  /** Attached only when the named routing flag is enabled. */
  readonly conditional: readonly PhpMiddlewareAttachment[];
  /** Every flag the provider reacts to. A route flag outside this set is unknown. */
  readonly declaredFlags: readonly string[];
  readonly evidenceDigest: string;
}

/** Per-route middleware flags recovered from the routing table. */
export interface PhpRouteMiddlewareFlags {
  /** `null` when the routing table declares no defaults; that fails closed. */
  readonly defaults: ReadonlyMap<string, boolean> | null;
  /** Route key (`"get:/path"`, lower-cased verb) → declared overrides. */
  readonly overrides: ReadonlyMap<string, ReadonlyMap<string, boolean>>;
}

/** One route's fully resolved pipeline, or a categorical refusal. */
export interface PhpResolvedRoutePipeline {
  readonly state: PhpPipelineState;
  readonly rejectionCode: PhpPipelineRejectionCode | null;
  /** Ordered, deduplicated middleware entrypoints for this route. */
  readonly middleware: readonly PhpMiddlewareAttachment[];
  /** The effective flag values this resolution was decided under. */
  readonly flags: readonly (readonly [string, boolean])[];
  readonly evidenceDigest: string;
}

const MAX_PROVIDER_TOKENS = 200_000;
const MAX_PIPELINE_ATTACHMENTS = 32;
const MAX_ROUTING_FLAG_LINES = 32;

/** `App\Middleware\X` → `src/App/Middleware/X.php`, or null when unsafe. */
function middlewarePath(className: string): string | null {
  if (!/^App(?:\\[A-Za-z_][A-Za-z0-9_]*)+$/.test(className)) return null;
  const path = `src/${className.replaceAll('\\', '/')}.php`;
  return path.includes('..') ? null : path;
}

/** Read a `\`-joined class reference starting at `index`; returns its end. */
function readClassReference(tokens: readonly PhpToken[], index: number): { readonly parts: string[]; readonly next: number } {
  const parts: string[] = [];
  let cursor = index;
  if (tokens[cursor]?.t === 'PUNCT' && tokens[cursor]?.v === '\\') cursor += 1;
  while (cursor < tokens.length) {
    const token = tokens[cursor]!;
    if (token.t !== 'WORD') break;
    parts.push(token.v);
    cursor += 1;
    const separator = tokens[cursor];
    if (separator?.t === 'PUNCT' && separator.v === '\\') {
      cursor += 1;
      continue;
    }
    break;
  }
  return { parts, next: cursor };
}

function matchingParen(tokens: readonly PhpToken[], openIndex: number): number {
  let depth = 0;
  for (let index = openIndex; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.t !== 'PUNCT') continue;
    if (token.v === '(') depth += 1;
    else if (token.v === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function model(input: {
  readonly providerPath: string;
  readonly state: PhpPipelineState;
  readonly rejectionCode: PhpPipelineRejectionCode | null;
  readonly unconditional: readonly PhpMiddlewareAttachment[];
  readonly conditional: readonly PhpMiddlewareAttachment[];
}): PhpRoutePipelineModel {
  const declaredFlags = [...new Set(input.conditional.map((attachment) => attachment.flag).filter((flag): flag is string => flag !== null))].sort((left, right) => left.localeCompare(right));
  return {
    schemaVersion: PHP_ROUTE_PIPELINE_VERSION,
    state: input.state,
    rejectionCode: input.rejectionCode,
    providerPath: input.providerPath,
    unconditional: input.unconditional,
    conditional: input.conditional,
    declaredFlags,
    evidenceDigest: sourceEvidenceDigest({
      kind: 'php-route-pipeline-model',
      version: PHP_ROUTE_PIPELINE_VERSION,
      providerPath: input.providerPath,
      state: input.state,
      rejectionCode: input.rejectionCode,
      unconditional: input.unconditional.map((attachment) => attachment.className),
      conditional: input.conditional.map((attachment) => [attachment.flag, attachment.className]),
    }),
  };
}

/**
 * Parse the route provider's middleware attachment table.
 *
 * Recognized shapes, all of them present in the current provider:
 *   `use A\B\C;`                                → class alias
 *   `$v = new C(...);`                          → variable binds a class
 *   `$x->add(new C());`                         → unconditional attachment
 *   `if ($k == "flag" …) { $x->add($v); }`      → flag-conditional attachment
 *
 * An `add` whose argument does not resolve to a class is terminal: the
 * pipeline cannot be enumerated, so the whole model is AMBIGUOUS.
 */
export function parsePhpRoutePipelineModel(input: { readonly providerPath: string; readonly providerSource: string | null }): PhpRoutePipelineModel {
  if (input.providerSource === null) {
    return model({ providerPath: input.providerPath, state: 'AMBIGUOUS', rejectionCode: 'PIPELINE_PROVIDER_UNAVAILABLE', unconditional: [], conditional: [] });
  }
  let tokens: readonly PhpToken[];
  try {
    tokens = tokenizePhp(input.providerSource);
  } catch {
    return model({ providerPath: input.providerPath, state: 'AMBIGUOUS', rejectionCode: 'PIPELINE_PROVIDER_UNSUPPORTED', unconditional: [], conditional: [] });
  }
  if (tokens.length > MAX_PROVIDER_TOKENS) {
    return model({ providerPath: input.providerPath, state: 'AMBIGUOUS', rejectionCode: 'PIPELINE_BOUND_EXCEEDED', unconditional: [], conditional: [] });
  }

  const aliases = new Map<string, string>();
  const variables = new Map<string, string>();
  const unconditional: PhpMiddlewareAttachment[] = [];
  const conditional: PhpMiddlewareAttachment[] = [];
  const blockFlags: (string | null)[] = [];
  let rejection: PhpPipelineRejectionCode | null = null;

  const resolveClass = (parts: readonly string[]): string | null => {
    if (parts.length === 0) return null;
    if (parts.length === 1) return aliases.get(parts[0]!) ?? null;
    return parts.join('\\');
  };

  const attach = (className: string | null): void => {
    if (rejection !== null) return;
    if (className === null) {
      rejection = 'PIPELINE_ATTACHMENT_UNRESOLVED';
      return;
    }
    const relativePath = middlewarePath(className);
    if (relativePath === null) {
      rejection = 'PIPELINE_MIDDLEWARE_PATH_UNRESOLVED';
      return;
    }
    if (unconditional.length + conditional.length >= MAX_PIPELINE_ATTACHMENTS) {
      rejection = 'PIPELINE_BOUND_EXCEEDED';
      return;
    }
    // The innermost modelled flag wins; an attachment inside a condition this
    // parser does not model is treated as unconditional, which can only widen
    // the pipeline.
    const flag = [...blockFlags].reverse().find((value): value is string => value !== null) ?? null;
    const attachment: PhpMiddlewareAttachment = { className, relativePath, symbol: '__invoke', flag };
    if (flag === null) unconditional.push(attachment);
    else conditional.push(attachment);
  };

  for (let index = 0; index < tokens.length && rejection === null; index += 1) {
    const token = tokens[index]!;

    if (token.t === 'WORD' && token.v === 'use' && tokens[index + 1]?.t === 'WORD') {
      const reference = readClassReference(tokens, index + 1);
      if (reference.parts.length > 1 && tokens[reference.next]?.v === ';') {
        aliases.set(reference.parts.at(-1)!, reference.parts.join('\\'));
        index = reference.next;
      }
      continue;
    }

    if (token.t === 'VARIABLE' && tokens[index + 1]?.v === '=' && tokens[index + 2]?.t === 'WORD' && tokens[index + 2]?.v === 'new') {
      const reference = readClassReference(tokens, index + 3);
      const className = resolveClass(reference.parts);
      if (className !== null) variables.set(token.v, className);
      index = reference.next - 1;
      continue;
    }

    if (token.t === 'WORD' && token.v === 'if' && tokens[index + 1]?.v === '(') {
      const close = matchingParen(tokens, index + 1);
      if (close === -1) {
        rejection = 'PIPELINE_PROVIDER_UNSUPPORTED';
        break;
      }
      const literals = [...new Set(tokens.slice(index + 2, close).filter((entry) => entry.t === 'STRING').map((entry) => entry.v))];
      // Exactly one string literal in the condition identifies the flag. Zero
      // or several mean the condition is not a flag test, and the block is
      // treated as unconditional.
      const flag = literals.length === 1 && literals[0]!.length > 0 ? literals[0]! : null;
      if (tokens[close + 1]?.v === '{') {
        blockFlags.push(flag);
        index = close + 1;
        continue;
      }
      index = close;
      continue;
    }

    if (token.t === 'PUNCT' && token.v === '{') {
      blockFlags.push(null);
      continue;
    }
    if (token.t === 'PUNCT' && token.v === '}') {
      blockFlags.pop();
      continue;
    }

    if (token.t === 'WORD' && token.v === 'add' && tokens[index - 1]?.t === 'OP' && tokens[index - 1]?.v === '->' && tokens[index + 1]?.v === '(') {
      const argument = tokens[index + 2];
      if (argument === undefined) {
        rejection = 'PIPELINE_ATTACHMENT_UNRESOLVED';
        break;
      }
      if (argument.t === 'WORD' && argument.v === 'new') {
        attach(resolveClass(readClassReference(tokens, index + 3).parts));
        continue;
      }
      if (argument.t === 'VARIABLE') {
        attach(variables.get(argument.v) ?? null);
        continue;
      }
      rejection = 'PIPELINE_ATTACHMENT_UNRESOLVED';
      break;
    }
  }

  if (rejection !== null) {
    return model({ providerPath: input.providerPath, state: 'AMBIGUOUS', rejectionCode: rejection, unconditional: [], conditional: [] });
  }
  return model({ providerPath: input.providerPath, state: 'RESOLVED', rejectionCode: null, unconditional, conditional });
}

/** Route key used to look up per-route flags: lower-case verb, exact path. */
export function phpRouteFlagKey(method: string, routeTemplate: string): string {
  return `${method.toLowerCase()}:${routeTemplate}`;
}

/**
 * Recover `default_config.middleware` and each route's `middleware` overrides
 * from the routing table. Only literal booleans are accepted; anything else
 * leaves the flag undeclared, which fails closed at resolution time.
 */
export function parsePhpRouteMiddlewareFlags(routingSource: string): PhpRouteMiddlewareFlags {
  const lines = routingSource.split(/\r?\n/);
  const overrides = new Map<string, ReadonlyMap<string, boolean>>();
  let defaults: ReadonlyMap<string, boolean> | null = null;

  const readFlagBlock = (start: number, parentIndent: number): ReadonlyMap<string, boolean> => {
    const flags = new Map<string, boolean>();
    for (let index = start; index < lines.length && index < start + MAX_ROUTING_FLAG_LINES; index += 1) {
      const line = lines[index]!;
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
      const indent = line.length - line.trimStart().length;
      if (indent <= parentIndent) break;
      const entry = trimmed.match(/^([A-Za-z][A-Za-z0-9_-]{0,63}):\s*(true|false)\s*$/);
      if (entry === null) continue;
      flags.set(entry[1]!, entry[2] === 'true');
    }
    return flags;
  };

  let currentRouteKey: string | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;
    const routeKey = trimmed.match(/^["'](get|post|put|patch|delete):([^"']+)["']:\s*$/i);
    if (routeKey !== null) {
      currentRouteKey = phpRouteFlagKey(routeKey[1]!, routeKey[2]!);
      continue;
    }
    if (/^default_config:\s*$/.test(trimmed)) {
      currentRouteKey = null;
      continue;
    }
    if (trimmed === 'middleware:') {
      const block = readFlagBlock(index + 1, indent);
      if (currentRouteKey === null) defaults = defaults ?? block;
      else overrides.set(currentRouteKey, block);
    }
  }
  return { defaults, overrides };
}

/**
 * Resolve one route's pipeline. Every flag the provider reacts to must have an
 * explicit boolean for this route; an unknown or missing flag is terminal,
 * because "flag not mentioned" is not evidence that the middleware is absent.
 */
export function resolvePhpRoutePipeline(input: {
  readonly model: PhpRoutePipelineModel;
  readonly flags: PhpRouteMiddlewareFlags;
  readonly method: string;
  readonly routeTemplate: string;
}): PhpResolvedRoutePipeline {
  const reject = (rejectionCode: PhpPipelineRejectionCode): PhpResolvedRoutePipeline => ({
    state: 'AMBIGUOUS',
    rejectionCode,
    middleware: [],
    flags: [],
    evidenceDigest: sourceEvidenceDigest({ kind: 'php-route-pipeline', version: PHP_ROUTE_PIPELINE_VERSION, state: 'AMBIGUOUS', rejectionCode, model: input.model.evidenceDigest }),
  });

  if (input.model.state !== 'RESOLVED') return reject(input.model.rejectionCode ?? 'PIPELINE_PROVIDER_UNSUPPORTED');
  if (input.flags.defaults === null) return reject('PIPELINE_DEFAULTS_MISSING');

  const override = input.flags.overrides.get(phpRouteFlagKey(input.method, input.routeTemplate));
  const effective = new Map<string, boolean>(input.flags.defaults);
  if (override !== undefined) for (const [flag, value] of override) effective.set(flag, value);

  // A flag the routing table declares but the provider never reads is an
  // unmodelled routing concept: refuse rather than assume it is inert.
  for (const flag of effective.keys()) {
    if (!input.model.declaredFlags.includes(flag)) return reject('PIPELINE_FLAG_UNKNOWN');
  }
  // A flag the provider reads but this route never states is undecided.
  for (const flag of input.model.declaredFlags) {
    if (!effective.has(flag)) return reject('PIPELINE_FLAG_UNKNOWN');
  }

  const selected = [
    ...input.model.unconditional,
    ...input.model.conditional.filter((attachment) => attachment.flag !== null && effective.get(attachment.flag) === true),
  ];
  const seen = new Set<string>();
  const middleware = selected.filter((attachment) => {
    if (seen.has(attachment.className)) return false;
    seen.add(attachment.className);
    return true;
  });
  const flags = [...effective.entries()].sort((left, right) => left[0].localeCompare(right[0]));
  return {
    state: 'RESOLVED',
    rejectionCode: null,
    middleware,
    flags,
    evidenceDigest: sourceEvidenceDigest({
      kind: 'php-route-pipeline',
      version: PHP_ROUTE_PIPELINE_VERSION,
      state: 'RESOLVED',
      model: input.model.evidenceDigest,
      route: phpRouteFlagKey(input.method, input.routeTemplate),
      flags,
      middleware: middleware.map((attachment) => attachment.className),
    }),
  };
}
