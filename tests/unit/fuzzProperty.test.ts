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

test('canonicalDigest duplicate-input idempotence', () => {
  const input = { x: [1, 2, 3], y: 'hello' };
  expect(prefixedDigest24('p', input)).toBe(prefixedDigest24('p', input));
  expect(prefixedDigest24('p', input)).toBe(prefixedDigest24('p', JSON.parse(JSON.stringify(input))));
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
  const input = { b: 2, a: 1 };
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
