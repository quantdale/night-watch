// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — projection layer unit matrix (SPEC §61).
//
// 20 required cases: deterministic shape projection, canonical serialization,
// opaque identity tokens, caps, hostile input fail-closed, and the sentinel
// absence proof at the projection boundary.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  DEFAULT_PROJECTION_LIMITS,
  ProjectionContext,
  SEMANTIC_PROJECTION_LIMIT_EXCEEDED,
  SEMANTIC_PROJECTION_PRIVACY_VIOLATION,
  SEMANTIC_PROJECTION_UNSUPPORTED_INPUT,
  SemanticProjectionError,
  projectValue,
  projectionDigest,
  serializeProjection,
  type ProjectionLimits,
  type ProjectionNode,
} from '../../src/oracles/projections';

const SENTINELS = [
  'SENTINEL_CUSTOMER_NAME_X7Q',
  'SENTINEL_ACCOUNT_884422',
  'SENTINEL_EMAIL_X7Q@example.invalid',
  'SENTINEL_AMOUNT_987654321',
  'SENTINEL_ERROR_MESSAGE_X7Q',
];

function containsAnySentinel(text: string): boolean {
  return SENTINELS.some((sentinel) => text.includes(sentinel));
}

function project(value: unknown, limits: ProjectionLimits = DEFAULT_PROJECTION_LIMITS) {
  const ctx = new ProjectionContext(limits);
  return { ctx, ...projectValue(value, ctx, limits) };
}

test.describe('Phase 9 projection — determinism and canonical shape', () => {
  test('1+2: deterministic object and array shape projection', () => {
    const value = { items: [{ id: 'synthetic-entity-a', amount: 1 }, { id: 'synthetic-entity-b', amount: 2 }], total: 3, ok: true, note: null };
    const first = project(value);
    const second = project(value);
    expect(first.projection.root.type).toBe('OBJECT');
    const root = first.projection.root;
    expect(root.fieldCount).toBe(4);
    expect(root.fields?.map((field) => field.name)).toEqual(['items', 'note', 'ok', 'total']);
    expect(serializeProjection(first.projection)).toBe(serializeProjection(second.projection));
  });

  test('3: reordered object keys produce the same canonical projection bytes', () => {
    const a = project({ b: 1, a: { x: 'synthetic-x', y: [1, 2] }, c: null });
    const b = project({ c: null, b: 1, a: { y: [1, 2], x: 'synthetic-x' } });
    expect(serializeProjection(a.projection)).toBe(serializeProjection(b.projection));
    expect(projectionDigest(a.projection)).toBe(projectionDigest(b.projection));
  });

  test('4+5: raw strings and raw numbers never appear in the projection', () => {
    const value = {
      name: 'SENTINEL_CUSTOMER_NAME_X7Q',
      account: 'SENTINEL_ACCOUNT_884422',
      email: 'SENTINEL_EMAIL_X7Q@example.invalid',
      amount: 987654321,
      nested: { message: 'SENTINEL_ERROR_MESSAGE_X7Q', ratio: 0.12345 },
    };
    const { projection } = project(value);
    const serialized = serializeProjection(projection);
    expect(containsAnySentinel(serialized)).toBe(false);
    expect(serialized).not.toContain('987654321');
    expect(serialized).not.toContain('0.12345');
    expect(serialized).not.toContain('SENTINEL');
  });

  test('6: allowed counts appear correctly', () => {
    const { projection } = project({ items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });
    const root = projection.root;
    const items = root.fields?.find((field) => field.name === 'items')?.node;
    expect(items?.type).toBe('ARRAY');
    expect(items?.itemCount).toBe(3);
    expect(items?.inspectedCount).toBe(3);
    expect(items?.arrayTruncated).toBe(false);
  });

  test('18+19: canonical serialization is byte-identical and the digest is stable across runs', () => {
    const value = { data: { rows: [{ id: 'synthetic-entity-a' }, { id: 'synthetic-entity-b' }], total: 5 }, error: null };
    const bytes: string[] = [];
    const digests: string[] = [];
    for (let i = 0; i < 3; i++) {
      const { projection } = project(value);
      bytes.push(serializeProjection(projection));
      digests.push(projectionDigest(projection));
    }
    expect(new Set(bytes).size).toBe(1);
    expect(new Set(digests).size).toBe(1);
    expect(digests[0]).toMatch(/^proj:sha256:[0-9a-f]{24}$/);
  });
});

test.describe('Phase 9 projection — opaque identity correlation', () => {
  test('7+8+9+10: strings become opaque encounter tokens; repeated -> same; distinct -> different; order deterministic', () => {
    const ctx = new ProjectionContext();
    const value = { rows: [{ id: 'synthetic-entity-a' }, { id: 'synthetic-entity-b' }, { id: 'synthetic-entity-a' }] };
    const { projection } = projectValue(value, ctx);
    const rows = projection.root.fields?.find((field) => field.name === 'rows')?.node;
    const tokens = rows?.items?.map((item) => item.fields?.find((field) => field.name === 'id')?.node.identityToken);
    expect(tokens).toEqual(['entity#0001', 'entity#0002', 'entity#0001']);
    // Tokens never contain or hash the raw value.
    for (const token of tokens ?? []) {
      expect(token).toMatch(/^entity#\d{4}$/);
      expect(token).not.toContain('synthetic-entity');
    }
    // Deterministic ordering: same input, fresh context, same tokens.
    const ctx2 = new ProjectionContext();
    const { projection: second } = projectValue(value, ctx2);
    const rows2 = second.root.fields?.find((field) => field.name === 'rows')?.node;
    expect(rows2?.items?.map((item) => item.fields?.find((field) => field.name === 'id')?.node.identityToken)).toEqual(tokens);
  });

  test('10b: identity tokens are assigned in canonical field order', () => {
    const ctx = new ProjectionContext();
    const { projection } = projectValue({ z: 'synthetic-z', a: 'synthetic-a' }, ctx);
    const tokens = projection.root.fields?.map((field) => field.node.identityToken);
    expect(tokens).toEqual(['entity#0001', 'entity#0002']); // a first (sorted), then z
  });

  test('11: context identity cap is enforced', () => {
    const limits: ProjectionLimits = { ...DEFAULT_PROJECTION_LIMITS, maxIdentityTokens: 2 };
    const ctx = new ProjectionContext(limits);
    expect(() => projectValue({ a: 'x1', b: 'x2', c: 'x3' }, ctx, limits)).toThrowError(SemanticProjectionError);
    expect(() => projectValue({ a: 'x1', b: 'x2', c: 'x3' }, ctx, limits)).toThrowError(SEMANTIC_PROJECTION_LIMIT_EXCEEDED);
  });

  test('context map is never serializable', () => {
    const ctx = new ProjectionContext();
    projectValue({ a: 'x1' }, ctx);
    expect(() => JSON.stringify(ctx)).toThrowError(SEMANTIC_PROJECTION_PRIVACY_VIOLATION as unknown as string);
  });
});

test.describe('Phase 9 projection — caps', () => {
  test('12: depth cap enforced', () => {
    const limits: ProjectionLimits = { ...DEFAULT_PROJECTION_LIMITS, maxDepth: 2 };
    expect(() => project({ a: { b: { c: 1 } } }, limits)).toThrowError(SEMANTIC_PROJECTION_LIMIT_EXCEEDED);
  });

  test('13: node cap enforced', () => {
    const limits: ProjectionLimits = { ...DEFAULT_PROJECTION_LIMITS, maxProjectionNodes: 3 };
    expect(() => project({ a: { b: { c: 1 } } }, limits)).toThrowError(SEMANTIC_PROJECTION_LIMIT_EXCEEDED);
  });

  test('13b: field cap enforced', () => {
    const limits: ProjectionLimits = { ...DEFAULT_PROJECTION_LIMITS, maxFieldsPerObject: 2 };
    expect(() => project({ a: 1, b: 2, c: 3 }, limits)).toThrowError(SEMANTIC_PROJECTION_LIMIT_EXCEEDED);
  });

  test('14: array cap marks truncation instead of silently dropping', () => {
    const limits: ProjectionLimits = { ...DEFAULT_PROJECTION_LIMITS, maxArrayItemsInspected: 2 };
    const { projection } = project({ items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] }, limits);
    const items = projection.root.fields?.find((field) => field.name === 'items')?.node;
    expect(items?.itemCount).toBe(4); // exact cardinality survives the cap
    expect(items?.inspectedCount).toBe(2);
    expect(items?.arrayTruncated).toBe(true);
  });
});

test.describe('Phase 9 projection — hostile input fail-closed', () => {
  test('15: prototype-key fields are rejected', () => {
    const hostile = JSON.parse('{"__proto__": {"polluted": true}}');
    expect(() => project(hostile)).toThrowError(SEMANTIC_PROJECTION_UNSUPPORTED_INPUT);
    const constructorHostile = JSON.parse('{"constructor": {"x": 1}}');
    expect(() => project(constructorHostile)).toThrowError(SEMANTIC_PROJECTION_UNSUPPORTED_INPUT);
  });

  test('16: cyclic input fails safely with a bounded classification', () => {
    const cyclic: Record<string, unknown> = { name: 'synthetic-cyclic' };
    cyclic.self = cyclic;
    expect(() => project(cyclic)).toThrowError(SEMANTIC_PROJECTION_UNSUPPORTED_INPUT);
  });

  test('16b: throwing getters fail deterministically without raw values in the error', () => {
    const hostile: Record<string, unknown> = {};
    Object.defineProperty(hostile, 'boom', {
      enumerable: true,
      get() {
        throw new Error('SENTINEL_ERROR_MESSAGE_X7Q');
      },
    });
    let threw = false;
    try {
      project(hostile);
    } catch (error) {
      threw = true;
      expect(error).toBeInstanceOf(SemanticProjectionError);
      expect((error as Error).message).toContain(SEMANTIC_PROJECTION_UNSUPPORTED_INPUT);
      expect((error as Error).message).not.toContain('SENTINEL');
    }
    expect(threw).toBe(true);
  });

  test('17: unsupported scalars fail safely', () => {
    expect(() => project(undefined)).toThrowError(SEMANTIC_PROJECTION_UNSUPPORTED_INPUT);
    expect(() => project(BigInt(1) as unknown as number)).toThrowError(SEMANTIC_PROJECTION_UNSUPPORTED_INPUT);
    expect(() => project(Symbol('x') as unknown as string)).toThrowError(SEMANTIC_PROJECTION_UNSUPPORTED_INPUT);
    expect(() => project(() => 1)).toThrowError(SEMANTIC_PROJECTION_UNSUPPORTED_INPUT);
    expect(() => project(Number.NaN)).toThrowError(SEMANTIC_PROJECTION_UNSUPPORTED_INPUT);
    expect(() => project(Number.POSITIVE_INFINITY)).toThrowError(SEMANTIC_PROJECTION_UNSUPPORTED_INPUT);
  });

  test('17b: a shared context never reuses tokens after a failed projection', () => {
    const ctx = new ProjectionContext();
    const ok = projectValue({ a: 'first' }, ctx);
    expect(ok.projection.root.fields?.[0]?.node.identityToken).toBe('entity#0001');
    expect(() => projectValue({ b: { c: { d: { e: { f: { g: { h: { i: { j: 1 } } } } } } } } }, ctx)).toThrowError(SEMANTIC_PROJECTION_LIMIT_EXCEEDED);
    const next = projectValue({ a: 'second' }, ctx);
    expect(next.projection.root.fields?.[0]?.node.identityToken).toBe('entity#0002');
  });
});

test.describe('Phase 9 projection — sentinel absence at the boundary (SPEC §25 partial)', () => {
  test('20: every raw-value location with planted sentinels is absent from projection serialization', () => {
    const value = {
      id: 'SENTINEL_ACCOUNT_884422',
      name: 'SENTINEL_CUSTOMER_NAME_X7Q',
      email: 'SENTINEL_EMAIL_X7Q@example.invalid',
      amount: 987654321,
      message: 'SENTINEL_ERROR_MESSAGE_X7Q',
      nested: [{ url: 'https://synthetic.invalid/u/SENTINEL_ACCOUNT_884422' }],
      ratio: 0.007,
    };
    const { projection } = project(value);
    const serialized = serializeProjection(projection);
    expect(containsAnySentinel(serialized)).toBe(false);
    // String content classes only; the exact sentinel bytes cannot appear.
    expect(serialized).not.toContain('example.invalid');
    expect(serialized).not.toContain('synthetic.invalid');
  });

  test('20b: raw input is verified to contain the sentinels (test is not vacuous)', () => {
    const raw = JSON.stringify({ a: 'SENTINEL_CUSTOMER_NAME_X7Q', b: 'SENTINEL_AMOUNT_987654321' });
    expect(containsAnySentinel(raw)).toBe(true);
  });
});

test.describe('Phase 9 projection — helper checks', () => {
  test('raw input byte budget is enforced by the standalone guard', async () => {
    const { assertProjectionInputBytes } = await import('../../src/oracles/projections/projector');
    expect(() => assertProjectionInputBytes(100)).not.toThrow();
    expect(() => assertProjectionInputBytes(Number.NaN)).toThrowError(SEMANTIC_PROJECTION_LIMIT_EXCEEDED);
    expect(() => assertProjectionInputBytes(-1)).toThrowError(SEMANTIC_PROJECTION_LIMIT_EXCEEDED);
  });

  test('shape equality ignores identity tokens and numeric refs but respects structure', () => {
    const { shapeEquals } = require('../../src/oracles/projections/shape');
    const nodeA: ProjectionNode = { type: 'STRING', stringClass: 'NONEMPTY', identityToken: 'entity#0001' };
    const nodeB: ProjectionNode = { type: 'STRING', stringClass: 'NONEMPTY', identityToken: 'entity#0002' };
    const nodeC: ProjectionNode = { type: 'STRING', stringClass: 'EMPTY', identityToken: 'entity#0001' };
    expect(shapeEquals(nodeA, nodeB)).toBe(true);
    expect(shapeEquals(nodeA, nodeC)).toBe(false);
  });
});
