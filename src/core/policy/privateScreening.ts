// ---------------------------------------------------------------------------
// Nightwatch shared private-payload screening.
//
// Structure is the primary privacy admission authority for in-memory values.
// Regex/text scanning is defense-in-depth for serialized or raw text only.
// Screening is fail-closed: callers throw on a positive match and never echo
// matched content into an error, receipt, or artifact.
// ---------------------------------------------------------------------------

export const PRIVATE_SCREENING_VERSION = 'nightwatch.private-screening.v2' as const;

/** Secret/token material that must never enter durable shapes or error text. */
export const SECRET_SHAPE_RE =
  /(?:Bearer\s+[A-Za-z0-9._~+/=-]{8,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
/** Canonical Nightwatch privacy sentinel tokens. */
export const PRIVATE_SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL)/i;
/**
 * Labeled raw private values (text defense-in-depth). Accepts optional JSON
 * quotes between the label and the separator, plus the closed identity-suffix
 * class (`billing_group_id`, `email_address`, `tokens`, …) so a compound label
 * cannot dodge the tripwire. Structure remains the primary authority for
 * object graphs.
 */
export const PRIVATE_VALUE_RE =
  /(?:customer|account|payer|email|cookie|token|password|secret|billing[_-]?group|api[_-]?key|cost|amount|authorization)(?:[_-]?(?:id|ids|name|address|group|key|alias|s))?["']?\s*[:=]\s*(?:\[\s*)?["']?[A-Za-z0-9@._:+/=-]{6,}/i;

/**
 * Exact sensitive object keys (normalized: lowercase, separators stripped).
 * Presence of one of these keys with a non-empty string or nested value is a
 * structural privacy failure regardless of JSON quoting or nesting depth.
 * Numeric `cost`/`amount` metrics are allowed so cardinality fields can pass.
 */
export const SENSITIVE_PRIVATE_KEYS: ReadonlySet<string> = new Set([
  'customer', 'customerid', 'account', 'accountid', 'billinggroup',
  'payer', 'email', 'cookie',
  'token', 'password', 'secret', 'authorization', 'apikey', 'auth',
]);

/** Keys blocked only when the value is a non-number (identity-shaped). */
export const SENSITIVE_NUMERIC_OK_KEYS: ReadonlySet<string> = new Set(['cost', 'amount']);

/**
 * Closed identity-suffix vocabulary. A sensitive base plus one of these
 * suffixes (after separator stripping) is itself sensitive, so compound keys
 * like `billing_group_id`, `payer_id`, `email_address`, `customer_name`,
 * `account_alias` or `tokens` are refused as structural privacy failures.
 * Suffixes outside this set (e.g. `author`, `authorization`) stay non-sensitive.
 */
export const SENSITIVE_KEY_SUFFIXES: ReadonlySet<string> = new Set([
  '', 's', 'id', 'ids', 'name', 'names', 'address', 'addresses',
  'group', 'groups', 'key', 'keys', 'alias', 'aliases',
]);

export const PRIVATE_STRUCTURE_BOUNDS = Object.freeze({
  maxDepth: 32,
  maxNodes: 10_000,
  maxKeys: 10_000,
  maxStringLength: 64 * 1024,
});

export type PrivateStructureFailure =
  | 'SENSITIVE_KEY'
  | 'PROTOTYPE_HOSTILE'
  | 'CYCLE'
  | 'DEPTH_EXCEEDED'
  | 'NODE_BUDGET_EXCEEDED'
  | 'KEY_BUDGET_EXCEEDED'
  | 'ACCESSOR_PROPERTY';

function normalizeKey(key: string): string {
  // NFKC first: fullwidth/compatibility forms (`ＴＯＫＥＮ`) fold to ASCII so a
  // case/separator alias cannot dodge the closed sensitive-key set (NW-AUD-019).
  return key.normalize('NFKC').toLowerCase().replace(/[_\-\s]/g, '');
}

/**
 * Canonical form for TEXT defense: compatibility-normalize, then drop
 * zero-width/bidi-joiners so `tok\u200Ben` or `ｔｏｋｅｎ` still reach the
 * credential/token/sentinel tripwires. Applied only inside the bounded text
 * screens; structure remains the primary authority for object graphs.
 */
export function canonicalizePrivateText(text: string): string {
  return text.normalize('NFKC').replace(/[\u200B-\u200F\u2060\uFEFF]/g, '');
}

function isSensitiveKey(normalized: string): 'always' | 'non-numeric' | null {
  if (SENSITIVE_PRIVATE_KEYS.has(normalized)) return 'always';
  if (SENSITIVE_NUMERIC_OK_KEYS.has(normalized)) return 'non-numeric';
  // Compound identity keys: sensitive base + a closed identity suffix.
  for (const base of SENSITIVE_PRIVATE_KEYS) {
    if (normalized.startsWith(base) && SENSITIVE_KEY_SUFFIXES.has(normalized.slice(base.length))) {
      return 'always';
    }
  }
  for (const base of SENSITIVE_NUMERIC_OK_KEYS) {
    if (normalized.startsWith(base) && SENSITIVE_KEY_SUFFIXES.has(normalized.slice(base.length))) {
      return 'non-numeric';
    }
  }
  return null;
}

/**
 * NW-AUD-018: the shared key-sensitivity authority for writers that must
 * DROP sensitive fields before persistence (e.g. authenticated evidence
 * sanitization) instead of maintaining a parallel, weaker denylist.
 */
export function privateKeySensitivity(key: string): 'always' | 'non-numeric' | null {
  return isSensitiveKey(normalizeKey(key));
}

/**
 * Structural walk of a plain-data value. Returns a categorical failure code or
 * null when the value carries no sensitive private keys and stays within
 * bounds. Does not inspect string *contents* (that remains text defense).
 */
export function findStructuralPrivateFailure(value: unknown): PrivateStructureFailure | null {
  const seen = new Set<object>();
  let nodes = 0;
  let keys = 0;

  const walk = (node: unknown, depth: number): PrivateStructureFailure | null => {
    if (depth > PRIVATE_STRUCTURE_BOUNDS.maxDepth) return 'DEPTH_EXCEEDED';
    nodes += 1;
    if (nodes > PRIVATE_STRUCTURE_BOUNDS.maxNodes) return 'NODE_BUDGET_EXCEEDED';

    if (node === null || typeof node !== 'object') return null;

    if (typeof node === 'function' || typeof node === 'symbol' || typeof node === 'bigint') {
      return null;
    }

    const object = node as object;
    if (seen.has(object)) return 'CYCLE';
    seen.add(object);

    try {
      const prototype = Object.getPrototypeOf(object);
      if (Array.isArray(object)) {
        // arrays must still be Array.prototype
        if (prototype !== Array.prototype) return 'PROTOTYPE_HOSTILE';
      } else if (prototype !== Object.prototype) {
        // includes Object.create(null) and class instances
        return 'PROTOTYPE_HOSTILE';
      }
      // Accessor properties are rejected: getters can hide or materialize
      // values. Array indices are NODES, not keys: counting them as keys made
      // NODE_BUDGET_EXCEEDED unreachable (a wide array always tripped the key
      // budget first), so key accounting applies to object properties only
      // while the node budget still bounds every element.
      const descriptors = Object.getOwnPropertyDescriptors(object);
      const countKeys = !Array.isArray(object);
      for (const [name, descriptor] of Object.entries(descriptors)) {
        if (countKeys) {
          keys += 1;
          if (keys > PRIVATE_STRUCTURE_BOUNDS.maxKeys) return 'KEY_BUDGET_EXCEEDED';
        }
        if (descriptor.get !== undefined || descriptor.set !== undefined) {
          if (Array.isArray(object) && name === 'length') continue;
          return 'ACCESSOR_PROPERTY';
        }
      }

      if (Array.isArray(object)) {
        for (const entry of object) {
          const failure = walk(entry, depth + 1);
          if (failure !== null) return failure;
        }
        return null;
      }

      for (const key of Object.keys(object)) {
        keys += 1;
        if (keys > PRIVATE_STRUCTURE_BOUNDS.maxKeys) return 'KEY_BUDGET_EXCEEDED';
        const normalized = normalizeKey(key);
        if (PRIVATE_SENTINEL_RE.test(canonicalizePrivateText(key))) return 'SENSITIVE_KEY';
        const sensitivity = isSensitiveKey(normalized);
        const child = (object as Record<string, unknown>)[key];
        if (sensitivity !== null) {
          if (child === null || child === undefined || child === '') continue;
          if (sensitivity === 'always') return 'SENSITIVE_KEY';
          if (typeof child !== 'number') return 'SENSITIVE_KEY';
        }
        const failure = walk(child, depth + 1);
        if (failure !== null) return failure;
      }
      return null;
    } finally {
      seen.delete(object);
    }
  };

  return walk(value, 0);
}

/** True when the in-memory value carries structural private-key failures. */
export function containsStructuralPrivateShape(value: unknown): boolean {
  return findStructuralPrivateFailure(value) !== null;
}

/** True when `text` carries secret material or a privacy sentinel token. */
export function containsSecretOrSentinelShape(text: string): boolean {
  const canonical = canonicalizePrivateText(text);
  return SECRET_SHAPE_RE.test(canonical) || PRIVATE_SENTINEL_RE.test(canonical);
}

/** True when `text` carries a labeled raw private value (text defense only). */
export function containsLabeledPrivateValue(text: string): boolean {
  return PRIVATE_VALUE_RE.test(canonicalizePrivateText(text));
}

/**
 * Combined TEXT screen (defense-in-depth). Prefer
 * {@link containsStructuralPrivateShape} for in-memory values.
 */
export function containsPrivatePayloadShape(text: string): boolean {
  return containsSecretOrSentinelShape(text) || containsLabeledPrivateValue(text);
}

/**
 * Combined construction-point screen for values that may be objects or text.
 * Objects are checked structurally first; everything is also text-screened
 * after bounded serialization.
 */
export function containsPrivatePayload(value: unknown): boolean {
  if (containsStructuralPrivateShape(value)) return true;
  if (typeof value === 'string') return containsPrivatePayloadShape(value);
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== 'string') return false;
    if (serialized.length > PRIVATE_STRUCTURE_BOUNDS.maxStringLength) {
      // Bound the text tripwire: structural already passed; scan only a
      // prefix for secret/sentinel/labeled forms rather than failing closed
      // on legitimate large owner-local artifacts (NW-AUD-019).
      return containsPrivatePayloadShape(serialized.slice(0, PRIVATE_STRUCTURE_BOUNDS.maxStringLength));
    }
    return containsPrivatePayloadShape(serialized);
  } catch {
    // Cycles / BigInt / toJSON throw — fail closed.
    return true;
  }
}
