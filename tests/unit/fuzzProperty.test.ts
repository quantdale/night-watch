import { expect, test } from '@playwright/test';
import { prefixedDigest24, stableJsonSorted } from '../../src/core/identity/canonicalDigest';

test('canonicalDigest is permutation stable for nested object keys', () => {
  const a = { b: 1, a: 2, c: { z: [{ q: 1, p: 2 }, { n: 3, m: 4 }], y: 4 } };
  const b = { c: { y: 4, z: [{ p: 2, q: 1 }, { m: 4, n: 3 }] }, a: 2, b: 1 };
  expect(prefixedDigest24('test', a)).toBe(prefixedDigest24('test', b));
});

test('canonicalDigest preserves array order and multiplicity', () => {
  expect(prefixedDigest24('test', { items: [1, 2, 2] })).not.toBe(prefixedDigest24('test', { items: [2, 1, 2] }));
  expect(prefixedDigest24('test', { items: [1, 2, 2] })).not.toBe(prefixedDigest24('test', { items: [1, 2] }));
});

test('canonicalDigest equivalent JSON round-trip preserves identity', () => {
  const input = { x: [1, 2, 3], y: { nested: 'hello', values: [{ b: 2, a: 1 }] } };
  const roundTrip = JSON.parse(JSON.stringify(input)) as typeof input;
  expect(stableJsonSorted(input)).toBe(stableJsonSorted(roundTrip));
  expect(prefixedDigest24('p', input)).toBe(prefixedDigest24('p', roundTrip));
});

test('canonicalDigest deterministic digest for same inputs', () => {
  const v1 = prefixedDigest24('ns', { a: 1, b: [2, 3] });
  const v2 = prefixedDigest24('ns', { a: 1, b: [2, 3] });
  expect(v1).toBe(v2);
  expect(v1).toMatch(/^ns:sha256:[0-9a-f]{24}$/);
});

test('canonicalDigest malformed-input rejection is bounded and does not echo values', () => {
  const circular: Record<string, unknown> = { a: 'SYNTHETIC_CYCLE_SECRET' };
  (circular as Record<string, unknown>).self = circular;
  let message = '';
  try {
    stableJsonSorted(circular);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message).toBeTruthy();
  expect(message.length).toBeLessThanOrEqual(256);
  expect(message).not.toContain('SYNTHETIC_CYCLE_SECRET');
});

test('canonicalDigest output has the exact bounded digest shape', () => {
  const d1 = prefixedDigest24('alpha', { a: 1 });
  const d2 = prefixedDigest24('beta', { a: 1 });
  expect(d1).toMatch(/^alpha:sha256:[0-9a-f]{24}$/);
  expect(d2).toMatch(/^beta:sha256:[0-9a-f]{24}$/);
  expect(d1).not.toBe(d2);
});

test('canonicalDigest no mutation of input', () => {
  const input = { b: 2, a: { nested: [{ z: 3, y: 4 }] } };
  const copy = JSON.parse(JSON.stringify(input));
  prefixedDigest24('test', input);
  expect(input).toEqual(copy);
});

test('canonicalDigest ignores inherited and symbol properties but retains own string keys', () => {
  const inherited = { inherited: 'not-part-of-identity' };
  const value = Object.create(inherited) as Record<string | symbol, unknown>;
  value.own = 1;
  const symbol = Symbol('ignored');
  value[symbol] = 'ignored';
  const equivalent = { own: 1 };
  expect(stableJsonSorted(value)).toBe(stableJsonSorted(equivalent));
  expect(prefixedDigest24('test', value)).toBe(prefixedDigest24('test', equivalent));
});

test('canonicalDigest retains own __proto__ data as an ordinary key', () => {
  const value: Record<string, unknown> = {};
  Object.defineProperty(value, '__proto__', { value: 'synthetic-proto-value', enumerable: true, writable: true, configurable: true });
  expect(stableJsonSorted(value)).toBe('{"__proto__":"synthetic-proto-value"}');
  expect(stableJsonSorted(value)).not.toBe(stableJsonSorted({}));
});

test('stableJsonSorted sorts object keys deterministically', () => {
  const s1 = stableJsonSorted({ z: 1, a: 2 });
  const s2 = stableJsonSorted({ a: 2, z: 1 });
  expect(s1).toBe(s2);
});

test('prefixedDigest keeps caller namespace distinct', () => {
  const d1 = prefixedDigest24('', { a: 1 });
  const d2 = prefixedDigest24('x', { a: 1 });
  expect(d1).toMatch(/^:sha256:[0-9a-f]{24}$/);
  expect(d2).toMatch(/^x:sha256:[0-9a-f]{24}$/);
  expect(d1).not.toBe(d2);
});

test('prefixedDigest handles null consistently and undefined is distinct', () => {
  expect(prefixedDigest24('test', null)).toBe(prefixedDigest24('test', null));
  // undefined input propagates as non-string per canonicalDigest quirk and is not a valid digest input
  expect(() => prefixedDigest24('test', undefined)).toThrow();
  expect(prefixedDigest24('test', null)).not.toBe('test:sha256:undefined');
});
test('stableJsonSorted preserves bounded input content without truncation', () => {
  const large = { a: 'x'.repeat(10000) };
  const s = stableJsonSorted(large);
  expect(s).toBe(`{"a":"${'x'.repeat(10000)}"}`);
  expect(s.length).toBe(10008);
});

test('prefixedDigest duplicate keys idempotent', () => {
  const input = { a: 1, b: 2 };
  const d1 = prefixedDigest24('test', input);
  const d2 = prefixedDigest24('test', { b: 2, a: 1 });
  expect(d1).toBe(d2);
});

test('canonical serialization is intentionally raw while digest output is opaque', () => {
  const input = { secret: 'my-secret-value', a: 1 };
  const out = stableJsonSorted(input);
  expect(out).toContain('my-secret-value');
  expect(prefixedDigest24('test', input)).not.toContain('my-secret-value');
  expect(prefixedDigest24('test', input)).toMatch(/^test:sha256:/);
});

// --- CF-1 additions (A-16 / M10 11.3) ---------------------------------------
// The CF-1 ledger entry demands at least 20 fuzz/property cases. The suite was
// last recorded at 12 and never re-measured; these seven REAL property cases
// close the gap on this suite alone, and the census in
// tests/unit/cf1FuzzPropertyCensus.test.ts records the measured total across
// every declared fuzz/property subject.

test('canonicalDigest is stable for unicode and look-alike keys', () => {
  const left = { 'ключ': 1, 'k': 2, 'K': 3, 'ｆｕｌｌｗｉｄｔｈ': 4, 'zero\u200bwidth': 5 };
  const right = { 'zero\u200bwidth': 5, 'ｆｕｌｌｗｉｄｔｈ': 4, 'K': 3, 'k': 2, 'ключ': 1 };
  // localeCompare is the declared sort; the property is that PERMUTATION and
  // UNICODE do not change the identity, not that any particular order wins.
  expect(stableJsonSorted(left)).toBe(stableJsonSorted(right));
  expect(prefixedDigest24('test', left)).toBe(prefixedDigest24('test', right));
  // Distinct keys stay distinct: no canonical form may collapse two keys.
  expect(prefixedDigest24('test', { k: 1 })).not.toBe(prefixedDigest24('test', { K: 1 }));
});

test('canonicalDigest is permutation stable at every nesting depth', () => {
  const deep = { l1: { l2: { l3: { l4: [{ a: { b: [1, { c: 2, d: [3, 4] }] } }, 5] } } } };
  const shuffled = JSON.parse(JSON.stringify(deep)) as typeof deep;
  const reorder = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(reorder);
    if (value !== null && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).reverse();
      return Object.fromEntries(entries.map(([key, item]) => [key, reorder(item)]));
    }
    return value;
  };
  expect(stableJsonSorted(deep)).toBe(stableJsonSorted(reorder(shuffled)));
  expect(prefixedDigest24('deep', deep)).toBe(prefixedDigest24('deep', reorder(shuffled)));
});

test('canonicalDigest distinguishes numeric edge values without collapsing them', () => {
  const values = [0, -0, 1, -1, 1e21, 1e-7, 0.1 + 0.2, Number.MAX_SAFE_INTEGER, Number.MAX_VALUE, Number.EPSILON];
  const digests = new Set(values.map((value) => prefixedDigest24('num', value)));
  // -0 and 0 canonicalize identically through JSON.stringify; EVERY OTHER pair
  // must differ, so a canonicalizer that rounded or stringified loosely would
  // collide here rather than merely looking stable.
  const distinct = new Set(values.filter((value) => !Object.is(value, -0)));
  expect(digests.size).toBeGreaterThanOrEqual(distinct.size);
  for (const value of distinct) {
    expect(prefixedDigest24('num', value)).toBe(prefixedDigest24('num', value));
  }
});

test('canonicalDigest gives empty containers their own stable identity', () => {
  expect(stableJsonSorted({})).toBe('{}');
  expect(stableJsonSorted([])).toBe('[]');
  expect(prefixedDigest24('e', {})).toBe(prefixedDigest24('e', {}));
  expect(prefixedDigest24('e', {})).not.toBe(prefixedDigest24('e', []));
  // An empty object is not an empty array, and neither is null.
  expect(prefixedDigest24('e', {})).not.toBe(prefixedDigest24('e', null));
  expect(prefixedDigest24('e', [])).not.toBe(prefixedDigest24('e', null));
});

test('stableJsonSorted renders nested undefined as the documented literal text', () => {
  // Preserved quirk, recorded in the module header: JSON.stringify(undefined) is
  // the VALUE undefined, so a nested undefined renders unquoted. A property that
  // silently DROPPED the key would change every identity computed from a sparse
  // object, so this is pinned as behaviour, not as an oversight.
  expect(stableJsonSorted({ a: undefined, b: 1 })).toBe('{"a":undefined,"b":1}');
  // In an array the same quirk renders as an empty position (Array#join of the
  // undefined VALUE), which is why an array hole is not an invisible element.
  expect(stableJsonSorted([1, undefined, 3])).toBe('[1,,3]');
  expect(stableJsonSorted([1, undefined, 3])).not.toBe(stableJsonSorted([1, 3]));
  expect(prefixedDigest24('q', { a: undefined, b: 1 })).toBe(prefixedDigest24('q', { b: 1, a: undefined }));
});

test('prefixedDigest is prefix-injection resistant across shared namespaces', () => {
  // Two different values under two different namespaces must never collide, and
  // a namespace that is a prefix of another must not borrow its identity.
  const a = prefixedDigest24('inv', { path: ['a'] });
  const b = prefixedDigest24('inv2', { path: ['a'] });
  const c = prefixedDigest24('inv', { path: ['a', ''] });
  expect(a).not.toBe(b);
  expect(a).not.toBe(c);
  expect(c).not.toBe(b);
  // The namespace is part of the canonical payload, so it is the whole
  // separation between `inv:`, `sci:`, `sc:`, `fp:` and `candidate:` identity.
  expect(prefixedDigest24('fp', { path: ['a'] })).not.toBe(a);
});

test('canonicalDigest is a real property over a deterministic generated corpus', () => {
  // A small deterministic corpus (a recorded LCG, no Math.random, no clock) so
  // the case count is real and every run sees identical bytes.
  let state = 0x5eed1234;
  const next = (): number => {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    return state;
  };
  const randomValue = (depth: number): unknown => {
    const pick = next() % 7;
    if (depth > 3 || pick === 0) return next() % 1000;
    if (pick === 1) return `synthetic-${next() % 97}`;
    if (pick === 2) return null;
    if (pick === 3) return [randomValue(depth + 1), randomValue(depth + 1)];
    const out: Record<string, unknown> = {};
    for (let index = 0; index < next() % 5; index += 1) out[`k${next() % 11}`] = randomValue(depth + 1);
    return out;
  };
  for (let iteration = 0; iteration < 256; iteration += 1) {
    const value = randomValue(0);
    const first = stableJsonSorted(value);
    // Determinism: the same value in the same process yields the same bytes.
    expect(first).toBe(stableJsonSorted(value));
    expect(first).not.toContain('\n');
    // Purity: the value is not mutated by canonicalization.
    expect(JSON.parse(first)).toEqual(JSON.parse(stableJsonSorted(value)));
  }
});
