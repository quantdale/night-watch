// ---------------------------------------------------------------------------
// Nightwatch — finite initialization exemptions (NW-AUD-020, M5).
//
// Navigation is NOT blanket read authority. An indispensable bootstrap API
// request may proceed only through an explicit exemption that is:
//   - registered (closed table, bounded entries),
//   - origin/method/route-template EXACT (anchored pattern, no parameters),
//   - source-proof + currentness bound,
//   - scoped to ONE navigation generation,
//   - count-limited per navigation generation.
//
// A missing navigation generation can never consume a bootstrap exemption:
// bootstrap authority IS navigation-generation authority.
//
// Pure module: currentness is supplied by the caller's frozen snapshot;
// this module never reads a clock or the network.
// ---------------------------------------------------------------------------

import { safeRuleMarker } from './provenRoutes';

export const BOOTSTRAP_EXEMPTION_SCHEMA = 'nightwatch.bootstrap-exemption.v1' as const;
export const MAX_BOOTSTRAP_EXEMPTIONS = 64;

export type BootstrapRefusalCode =
  | 'BOOTSTRAP_UNREGISTERED'
  | 'BOOTSTRAP_MISMATCH'
  | 'BOOTSTRAP_EXHAUSTED'
  | 'BOOTSTRAP_STALE';

export interface BootstrapExemption {
  readonly id: string;
  readonly environment: string;
  /** Exact origin (scheme://host[:port]) the exemption covers. */
  readonly origin: string;
  /** Exact normalized method (GET/HEAD only are mechanically provable reads). */
  readonly method: string;
  /** Anchored path regex source — the proven route template, never a sample. */
  readonly routePattern: string;
  readonly sourceProof: string;
  readonly sourceCurrent: boolean;
  readonly maxCountPerNavigation: number;
}

export interface BootstrapRequest {
  readonly method: string;
  readonly url: string;
  readonly environment: string;
}

export type BootstrapConsumption =
  | {
    readonly granted: true;
    readonly exemptionId: string;
    readonly navigationGeneration: string;
    readonly consumedCount: number;
    readonly routeTemplate: string;
    readonly routePattern: string;
    readonly sourceProof: string;
  }
  | { readonly granted: false; readonly code: BootstrapRefusalCode };

function normalizeMethod(method: string): string {
  return method.trim().toUpperCase();
}

/** Build-time validation: a malformed exemption must fail closed, not weaken. */
function validateExemption(exemption: BootstrapExemption): void {
  if (!/^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(exemption.id)) throw new Error('BOOTSTRAP_EXEMPTION_ID_UNSAFE');
  if (normalizeMethod(exemption.method) !== 'GET' && normalizeMethod(exemption.method) !== 'HEAD') {
    throw new Error('BOOTSTRAP_EXEMPTION_METHOD_NOT_READ_ONLY');
  }
  if (!exemption.routePattern.startsWith('^') || !exemption.routePattern.endsWith('$')) {
    throw new Error('BOOTSTRAP_EXEMPTION_PATTERN_UNANCHORED');
  }
  // A `?` inside a pattern source is legitimate regex syntax (quantifier);
  // persistence safety comes from emitting the categorical marker, never the
  // pattern — a literal `#` (fragment syntax) has no regex meaning and is
  // refused outright.
  if (exemption.routePattern.includes('#')) throw new Error('BOOTSTRAP_EXEMPTION_PATTERN_UNSAFE');
  if (!exemption.origin.startsWith('http://') && !exemption.origin.startsWith('https://')
    && !exemption.origin.startsWith('ws://') && !exemption.origin.startsWith('wss://')) {
    throw new Error('BOOTSTRAP_EXEMPTION_ORIGIN_UNSAFE');
  }
  if (exemption.maxCountPerNavigation < 1 || exemption.maxCountPerNavigation > 1024) {
    throw new Error('BOOTSTRAP_EXEMPTION_BUDGET_UNSAFE');
  }
  // Compile once: an invalid regex must fail at registration, not at request time.
  new RegExp(exemption.routePattern);
}

export class BootstrapExemptionTable {
  private readonly entries: readonly BootstrapExemption[];
  /** navigationGeneration -> exemptionId -> consumed count. */
  private readonly counts = new Map<string, Map<string, number>>();

  private constructor(entries: readonly BootstrapExemption[]) {
    this.entries = entries;
  }

  static of(entries: readonly BootstrapExemption[]): BootstrapExemptionTable {
    if (entries.length > MAX_BOOTSTRAP_EXEMPTIONS) throw new Error('BOOTSTRAP_EXEMPTION_TABLE_TOO_LARGE');
    const seen = new Set<string>();
    for (const entry of entries) {
      validateExemption(entry);
      if (seen.has(entry.id)) throw new Error('BOOTSTRAP_EXEMPTION_DUPLICATE');
      seen.add(entry.id);
    }
    return new BootstrapExemptionTable([...entries]);
  }

  get size(): number {
    return this.entries.length;
  }

  /** TRANSIENT proven pattern by exemption id (lower-transport ticket
   *  minting only — never persisted; durable identity stays categorical). */
  patternFor(exemptionId: string): string | undefined {
    return this.entries.find((entry) => entry.id === exemptionId)?.routePattern;
  }

  /**
   * Consume one bootstrap unit of authority for this request within the given
   * navigation generation. Every refusal path grants nothing and counts
   * nothing; granted paths are count-limited per navigation generation (a new
   * navigation generation receives a fresh budget — bounded, never cumulative).
   */
  consume(navigationGeneration: string | null, request: BootstrapRequest): BootstrapConsumption {
    if (navigationGeneration === null || navigationGeneration === '') {
      return { granted: false, code: 'BOOTSTRAP_UNREGISTERED' };
    }
    let parsed: URL;
    try {
      parsed = new URL(request.url);
    } catch {
      return { granted: false, code: 'BOOTSTRAP_MISMATCH' };
    }
    const origin = parsed.origin;
    const method = normalizeMethod(request.method);
    const pathname = decodeURIComponentSafe(parsed.pathname);
    // Two-stage matching keeps the refusal codes honest: a request belonging
    // to a REGISTERED bootstrap family (env+origin+method) that drifts off its
    // proven route is BOOTSTRAP_MISMATCH (route drift); a request outside any
    // registered family is BOOTSTRAP_UNREGISTERED (unknown startup traffic).
    const family = this.entries.filter(
      (entry) => entry.environment === request.environment
        && entry.origin === origin
        && normalizeMethod(entry.method) === method,
    );
    if (family.length === 0) return { granted: false, code: 'BOOTSTRAP_UNREGISTERED' };
    const pathMatched = family.find((entry) => new RegExp(entry.routePattern).test(pathname)) ?? null;
    if (pathMatched === null) return { granted: false, code: 'BOOTSTRAP_MISMATCH' };
    if (!pathMatched.sourceCurrent) return { granted: false, code: 'BOOTSTRAP_STALE' };
    const perNavigation = this.counts.get(navigationGeneration) ?? new Map<string, number>();
    const consumed = perNavigation.get(pathMatched.id) ?? 0;
    if (consumed >= pathMatched.maxCountPerNavigation) {
      return { granted: false, code: 'BOOTSTRAP_EXHAUSTED' };
    }
    perNavigation.set(pathMatched.id, consumed + 1);
    this.counts.set(navigationGeneration, perNavigation);
    return {
      granted: true,
      exemptionId: pathMatched.id,
      navigationGeneration,
      consumedCount: consumed + 1,
      // Persisted identity is the categorical marker — the registered id is
      // charset-validated at build time, so the marker cannot be null here;
      // the fallback keeps the receipt safe if that invariant ever drifts.
      routeTemplate: safeRuleMarker(pathMatched.id) ?? '<UNKNOWN_ROUTE>',
      // TRANSIENT proven match pattern for lower-transport ticket minting
      // (in-memory only; durable evidence still uses the marker).
      routePattern: pathMatched.routePattern,
      sourceProof: pathMatched.sourceProof,
    };
  }
}

function decodeURIComponentSafe(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}
