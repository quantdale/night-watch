// ---------------------------------------------------------------------------
// Nightwatch proven route identity for authenticated evidence.
//
// NW-AUD-018: a persisted URL must carry `origin + proven route template`
// or a categorical unknown-route marker — never a concrete authenticated
// path parameter and never a lexically guessed "safe word". The table is
// the ONLY source of route templates: an entry is admitted only through
// `bind`, where the caller supplies source-proven endpoint authority
// (exact journey-contract paths, anchored pattern rules with a proven
// rule id). Matching is exact-set/anchored-pattern membership, never a
// shape heuristic. An empty table is the fail-closed default.
// ---------------------------------------------------------------------------

export const PROVEN_ROUTE_TABLE_VERSION = 'nightwatch.proven-route-table.v1' as const;

/** Bounded like the C-10 proven vocabulary; an over-sized bind fails closed. */
export const MAX_PROVEN_ROUTE_ENTRIES = 4096;

/** Categorical marker persisted when no proven template matches. */
export const UNKNOWN_ROUTE_MARKER = '<UNKNOWN_ROUTE>' as const;

const SAFE_RULE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;
/** Emitted templates are structural text only: no query/fragment/userinfo. */
const SAFE_EMIT_RE = /^[A-Za-z0-9._/:<>-]{1,240}$/;

interface ProvenRouteEntry {
  readonly test: RegExp;
  readonly emit: string;
}

export interface ProvenRouteBindInput {
  /** Anchored path regex source for pattern rules (`^...$` enforced). */
  readonly pattern: string;
  /**
   * What persists on a match: the exact static path for path rules, or
   * `<RULE:...>` carrying the proven rule id for pattern rules.
   */
  readonly emit: string;
}

function compileEntry(input: ProvenRouteBindInput): ProvenRouteEntry {
  if (!SAFE_EMIT_RE.test(input.emit)) throw new Error('PROVEN_ROUTE_EMIT_UNSAFE');
  const source = input.pattern;
  if (!source.startsWith('^') || !source.endsWith('$')) {
    throw new Error('PROVEN_ROUTE_PATTERN_UNANCHORED');
  }
  // Query/fragment material can never PERSIST: emit strings are charset-
  // bounded (SAFE_EMIT_RE excludes ? # & =), and match() refuses candidate
  // pathnames carrying ? or # — so a `?` quantifier inside a pattern source
  // stays legitimate regex syntax rather than a leak channel.
  let test: RegExp;
  try {
    test = new RegExp(source);
  } catch {
    throw new Error('PROVEN_ROUTE_PATTERN_INVALID');
  }
  return { test, emit: input.emit };
}

/**
 * Immutable-after-bind proven route table. Empty by default: with no
 * authority bound, every path reduces to {@link UNKNOWN_ROUTE_MARKER}.
 */
export class ProvenRouteTable {
  static readonly VERSION = PROVEN_ROUTE_TABLE_VERSION;
  private readonly entries: ProvenRouteEntry[];

  private constructor(entries: ProvenRouteEntry[]) {
    this.entries = entries;
  }

  static empty(): ProvenRouteTable {
    return new ProvenRouteTable([]);
  }

  /**
   * Build a table from source-proven endpoint authority. Fails closed on
   * individual registration defects; membership is FIRST-MATCH-WINS in bind
   * order — the same deterministic semantics `matchRippleEndpoint` applies
   * to method/host-scoped rules (several legitimate rules may share one
   * path pattern while differing by method, host or classification).
   */
  static bind(inputs: readonly ProvenRouteBindInput[]): ProvenRouteTable {
    if (inputs.length > MAX_PROVEN_ROUTE_ENTRIES) throw new Error('PROVEN_ROUTE_TABLE_TOO_LARGE');
    return new ProvenRouteTable(inputs.map(compileEntry));
  }

  get size(): number {
    return this.entries.length;
  }

  /** First matching proven template, or null (caller persists the marker).
   * Deterministic: bind order decides, mirroring matchRippleEndpoint. */
  match(pathname: string): string | null {
    // The candidate path itself must be free of query/fragment/userinfo
    // material before membership is even evaluated.
    if (pathname.includes('?') || pathname.includes('#')) return null;
    for (const entry of this.entries) {
      if (entry.test.test(pathname)) return entry.emit;
    }
    return null;
  }
}

/** Validate a journey-contract rule id for use inside an emitted marker. */
export function safeRuleMarker(ruleId: string): string | null {
  if (!SAFE_RULE_ID_RE.test(ruleId)) return null;
  return `<RULE:${ruleId}>`;
}
