// NW-AUD-019 — structural private-payload screening is primary authority.
//
// Reproduces the quoted-key JSON bypass and proves ordinary token/password/
// customer objects are refused regardless of quoting, nesting, or aliases,
// while text screening remains a bounded defense-in-depth tripwire.

import { test, expect } from '@playwright/test';
import {
  PRIVATE_VALUE_RE,
  containsLabeledPrivateValue,
  containsPrivatePayload,
  containsPrivatePayloadShape,
  containsStructuralPrivateShape,
  findStructuralPrivateFailure,
} from '../../src/core/policy/privateScreening';
import { PrivateArtifactStore } from '../../src/core/policy/privateArtifacts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function temporaryRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test.describe('NW-AUD-019 structural private screening', () => {
  test('quoted ordinary JSON keys are refused structurally and by text defense', () => {
    const payloads = [
      { token: 'ordinaryplaintexttoken' },
      { password: 'ordinaryplaintextpassword' },
      { customer: 'ordinarycustomerid' },
      { account: 'ordinaryaccountid' },
      { nested: { deep: { token: 'ordinaryplaintexttoken' } } },
      { list: [{ customer: 'ordinarycustomerid' }] },
      { Customer_Id: 'ordinarycustomerid' },
      { 'billing-group': 'ordinarybillinggroup' },
    ];
    for (const payload of payloads) {
      expect(containsStructuralPrivateShape(payload), JSON.stringify(payload)).toBe(true);
      expect(containsPrivatePayload(payload), JSON.stringify(payload)).toBe(true);
      // Text defense must also catch the serialized form (quoted keys).
      expect(containsPrivatePayloadShape(JSON.stringify(payload)), JSON.stringify(payload)).toBe(true);
      expect(containsLabeledPrivateValue(JSON.stringify(payload))).toBe(true);
    }
    // The historical regex alone missed quoted forms; the repaired regex must not.
    expect(PRIVATE_VALUE_RE.test('{"token":"ordinaryplaintexttoken"}')).toBe(true);
  });

  test('sentinel keys still fail and are not the only proof', () => {
    expect(containsStructuralPrivateShape({ CUSTOMER_SENTINEL: 'synthetic-only' })).toBe(true);
    expect(containsPrivatePayload({ CUSTOMER_SENTINEL: 'synthetic-only' })).toBe(true);
  });

  test('safe payloads without sensitive keys pass', () => {
    const safe = { candidate: 'after', status: 'INCOMPLETE', count: 3, cost: 12.5, amount: 1 };
    expect(findStructuralPrivateFailure(safe)).toBeNull();
    expect(containsStructuralPrivateShape(safe)).toBe(false);
    expect(containsPrivatePayload(safe)).toBe(false);
  });

  test('prototype-hostile, accessor, cycle, and depth failures are categorical', () => {
    expect(findStructuralPrivateFailure(Object.create(null) as object)).toBe('PROTOTYPE_HOSTILE');
    const withGetter = {} as Record<string, unknown>;
    Object.defineProperty(withGetter, 'leak', { get: () => 'x', enumerable: true });
    expect(findStructuralPrivateFailure(withGetter)).toBe('ACCESSOR_PROPERTY');

    const cyclic: Record<string, unknown> = { name: 'loop' };
    cyclic.self = cyclic;
    expect(findStructuralPrivateFailure(cyclic)).toBe('CYCLE');

    let deep: unknown = { leaf: true };
    for (let i = 0; i < 40; i += 1) deep = { child: deep };
    expect(findStructuralPrivateFailure(deep)).toBe('DEPTH_EXCEEDED');
  });

  test('PrivateArtifactStore refuses ordinary quoted-key objects before any file is created', () => {
    const root = temporaryRoot('nightwatch-nw019-');
    try {
      const store = new PrivateArtifactStore({ root, remotePrivacy: 'NO_REMOTE' });
      expect(() => store.writeJson('token.json', { token: 'ordinaryplaintexttoken' }))
        .toThrow('PRIVATE_ARTIFACT_PRIVACY_BLOCKED');
      expect(() => store.writeImmutableJson('customer.json', { customer: 'ordinarycustomerid' }))
        .toThrow('PRIVATE_ARTIFACT_PRIVACY_BLOCKED');
      expect(() => store.writeJson('password.json', { password: 'ordinaryplaintextpassword' }))
        .toThrow('PRIVATE_ARTIFACT_PRIVACY_BLOCKED');
      expect(fs.readdirSync(root).filter((name) => name.endsWith('.json'))).toEqual([]);
      // Safe writes still work.
      store.writeJson('safe.json', { candidate: 'ok', status: 'READY' });
      expect(fs.existsSync(path.join(root, 'safe.json'))).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('oversized safe payloads scan a bounded prefix; throwing serializations fail closed', () => {
    const big = { blob: 'x'.repeat(70 * 1024) };
    expect(containsPrivatePayload(big)).toBe(false);
    const bigWithSecret = { blob: 'x'.repeat(100), token: 'ordinaryplaintexttoken' };
    expect(containsPrivatePayload(bigWithSecret)).toBe(true);
    const throwing = { toJSON() { throw new Error('nope'); } };
    expect(containsPrivatePayload(throwing)).toBe(true);
  });
});
