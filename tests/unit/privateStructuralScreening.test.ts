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

  test('NW-AUD-019 regression: compound identity keys are refused structurally and by text defense', () => {
    // Reproduced against live source before the fix: every one of these
    // ordinary identifier keys passed BOTH screens (exact-set + label RE).
    const compound = [
      { billing_group_id: 'bg-ordinaryvalue' },
      { payer_id: 'payerordinaryvalue' },
      { email_address: 'ordinary@example.invalid' },
      { customer_name: 'ordinarycustomername' },
      { account_alias: 'ordinaryaccountalias' },
      { billinggroupid: 'bg-ordinaryvalue' },
      { tokens: ['tok1234567890'] },
      { 'customer-id': 'ordinarycustomerid' },
      { Authorization: 'Bearer abcdef123456' },
    ];
    for (const payload of compound) {
      expect(findStructuralPrivateFailure(payload), JSON.stringify(payload)).toBe('SENSITIVE_KEY');
      expect(containsPrivatePayload(payload), JSON.stringify(payload)).toBe(true);
      expect(containsPrivatePayloadShape(JSON.stringify(payload)), JSON.stringify(payload)).toBe(true);
    }
    // The suffix vocabulary stays bounded: near-miss keys are not sensitive.
    for (const safe of [
      { author: 'nightwatch' },
      { authorized: true },
      { accountability: 'quarterly' },
      { tokenizerMode: 'fast' },
      { secretary: 'team' },
      { cost: 12.5, amount: 1, status: 'READY', counts: 4 },
    ]) {
      expect(findStructuralPrivateFailure(safe), JSON.stringify(safe)).toBeNull();
    }
  });

  test('NW-AUD-019 adversarial corpus: escaped, unicode, encoded, duplicate, and alias forms', () => {
    // JSON-escaped sensitive key: structure catches it after parse; the text
    // defense over the raw bytes cannot see the label — exactly why every
    // reader must revalidate the parsed graph (HC-115 / HC-118).
    const escapedRaw = '{"tok\\u0065n":"ordinaryplaintexttoken"}';
    expect(escapedRaw).not.toMatch(/token["']?\s*:/);
    const parsedEscaped = JSON.parse(escapedRaw) as unknown;
    expect(findStructuralPrivateFailure(parsedEscaped)).toBe('SENSITIVE_KEY');
    expect(containsPrivatePayload(parsedEscaped)).toBe(true);

    // Fullwidth and zero-width label forms canonicalize into the tripwires.
    expect(findStructuralPrivateFailure({ '\uFF34\uFF2F\uFF2B\uFF25\uFF2E': 'ordinaryplaintexttoken' })).toBe('SENSITIVE_KEY');
    expect(containsPrivatePayloadShape('{"\uFF34\uFF2F\uFF2B\uFF25\uFF2E":"ordinaryplaintexttoken"}')).toBe(true);
    expect(containsPrivatePayloadShape('{"tok\u200Ben":"ordinaryplaintexttoken"}')).toBe(true);

    // Encoded VALUES do not change the verdict: the sensitive key is the
    // authority (entropy/content heuristics are a documented non-goal).
    expect(findStructuralPrivateFailure({ token: 'b3JkaW5hcnl0b2tlbg==' })).toBe('SENSITIVE_KEY');
    expect(findStructuralPrivateFailure({ account_id: '481516234299' })).toBe('SENSITIVE_KEY');

    // Duplicate-key representations: the parser keeps one value but the key
    // is still sensitive; the raw text carries a labeled form either way.
    const duplicateRaw = '{"token":"firstvalue1","token":"secondvalue1"}';
    expect(findStructuralPrivateFailure(JSON.parse(duplicateRaw) as unknown)).toBe('SENSITIVE_KEY');
    expect(containsPrivatePayloadShape(duplicateRaw)).toBe(true);

    // Malformed JSON never reaches admission as text: labeled text is refused.
    expect(containsPrivatePayloadShape('{"token":"unterminated')).toBe(true);
  });

  test('NW-AUD-019 bounds: width and node budgets are categorical', () => {
    const wide: Record<string, unknown> = {};
    for (let i = 0; i < 10_001; i += 1) wide[`k${i}`] = i;
    expect(findStructuralPrivateFailure(wide)).toBe('KEY_BUDGET_EXCEEDED');

    const deepArray: unknown[] = [];
    for (let i = 0; i < 10_002; i += 1) deepArray.push(i);
    expect(findStructuralPrivateFailure(deepArray)).toBe('NODE_BUDGET_EXCEEDED');
  });

  test('NW-AUD-019: store diagnostics are categorical and never echo private content', () => {
    const root = temporaryRoot('nightwatch-nw019-echo-');
    try {
      const store = new PrivateArtifactStore({ root, remotePrivacy: 'NO_REMOTE' });
      let message = '';
      try {
        store.writeJson('leak.json', { billing_group_id: 'bg-ordinaryvalue' });
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toBe('PRIVATE_ARTIFACT_PRIVACY_BLOCKED');
      expect(message).not.toContain('ordinaryvalue');
      expect(message).not.toContain('billing_group_id');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('NW-AUD-019: a tampered persisted artifact is refused at reader admission', () => {
    // The store publishes a clean artifact; an attacker with local write
    // access then tampers the bytes. store.readJson is a raw reader by
    // contract — every READER admission path must screen what it parses
    // (proven end-to-end in the findings / run-evidence reader suites).
    const root = temporaryRoot('nightwatch-nw019-tamper-');
    try {
      const store = new PrivateArtifactStore({ root, remotePrivacy: 'NO_REMOTE' });
      store.writeJson('candidate.json', { candidate: 'after', status: 'READY' });
      const destination = path.join(root, 'candidate.json');
      const tampered = fs.readFileSync(destination, 'utf8').replace('}', ',"token":"ordinaryplaintexttoken"}');
      fs.writeFileSync(destination, tampered, { mode: 0o600 });
      const readBack = store.readJson('candidate.json');
      expect(readBack).not.toBeNull();
      expect(containsPrivatePayload(readBack)).toBe(true);
      expect(findStructuralPrivateFailure(readBack)).toBe('SENSITIVE_KEY');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
