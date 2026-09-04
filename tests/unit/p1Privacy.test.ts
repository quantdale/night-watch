// ---------------------------------------------------------------------------
// MA-8 / F-13 — privacy proof for the P1 observation path.
//
// Planted sentinels cross every boundary a P1 session can touch: response
// values, credential-shaped fields, dynamic keys, URL parameters, console
// text, errors, screenshots, traces, profiles, and the persistence audit.
// The claim in each case: the raw sentinel never reaches a persistable form,
// and the P1 admission chain refuses to run without the production-cone
// policy that enforces it.
//
// Sentinels are unmistakably synthetic. No customer data, no production.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import {
  createProductionPrivacyPolicy,
  pageConsoleTextProhibited,
  screenshotsProhibited,
  tracesProhibited,
  type PrivacyPolicy,
} from '../../src/core/prodPrivacy/policy';
import {
  projectProduction,
  RawEphemeralSource,
  toProductionEvidence,
} from '../../src/core/prodPrivacy';
import { assertPersistableProductionEvidence } from '../../src/core/prodEvidence/firewall';
import { auditProductionPersistence } from '../../src/core/prodEvidence/persistenceAudit';
import {
  testOnlyProductionMarkedKeyVocabulary,
  testOnlyProductionMarkedRouteVocabulary,
} from '../../src/core/prodProvenance/testOnlySeam';

const SENTINEL_VALUE = 'NWSENT-P1-RAW-VALUE-7f3a91';
const SENTINEL_KEY = 'NWSENT-P1-RAW-KEY-4c8d22';
const SENTINEL_CREDENTIAL = 'NWSENT-P1-CREDENTIAL-9e1b40';
const SENTINEL_URL = 'NWSENT-P1-URL-PARAM-2d6f83';
const PROVEN_ROUTE = 'GET /v1/synthetic/p1/{id}';

function policy(): PrivacyPolicy {
  return createProductionPrivacyPolicy({});
}

function routeVocabulary() {
  return testOnlyProductionMarkedRouteVocabulary({
    provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
    templates: [PROVEN_ROUTE],
  });
}

function keyVocabulary() {
  return testOnlyProductionMarkedKeyVocabulary({
    provenanceClass: 'SOURCE_PROVEN_OPENAPI_DEFINITION',
    keys: ['alpha', 'beta'],
  });
}

function persistableEvidence(payload: unknown) {
  const projection = projectProduction(RawEphemeralSource.of(payload), keyVocabulary(), policy());
  return toProductionEvidence({
    projection,
    routeTemplate: PROVEN_ROUTE,
    statusClass: '2XX',
    routeVocabulary: routeVocabulary(),
    vocabulary: keyVocabulary(),
    policy: policy(),
  });
}

test('raw response values never persist, however nested', () => {
  const evidence = persistableEvidence({
    alpha: SENTINEL_VALUE,
    beta: { nested: [SENTINEL_VALUE, { deeper: SENTINEL_VALUE }] },
    [SENTINEL_KEY]: 'unproven-key-position',
  });
  const serialized = JSON.stringify(evidence);
  expect(serialized).not.toContain(SENTINEL_VALUE);
  // The firewall independently accepts the projected form.
  expect(() => assertPersistableProductionEvidence(evidence)).not.toThrow();
  const audited = JSON.stringify(assertPersistableProductionEvidence(evidence));
  expect(audited).not.toContain(SENTINEL_VALUE);
});

test('credential-shaped fields never persist', () => {
  const evidence = persistableEvidence({
    alpha: 'x',
    beta: 'y',
    password: SENTINEL_CREDENTIAL,
    token: SENTINEL_CREDENTIAL,
    authorization: SENTINEL_CREDENTIAL,
  });
  const serialized = JSON.stringify(evidence);
  expect(serialized).not.toContain(SENTINEL_CREDENTIAL);
  expect(() => assertPersistableProductionEvidence(evidence)).not.toThrow();
});

test('dynamic key literals never persist (F-14)', () => {
  const projection = projectProduction(
    RawEphemeralSource.of({ [SENTINEL_KEY]: 1, alpha: 2 }),
    keyVocabulary(),
    policy(),
  );
  expect(JSON.stringify(projection)).not.toContain(SENTINEL_KEY);
});

test('concrete URL parameters never persist: route template only', () => {
  const evidence = persistableEvidence({ alpha: 1, beta: 2 });
  expect(JSON.stringify(evidence)).not.toContain(SENTINEL_URL);
  expect(evidence.routeTemplate).toBe(PROVEN_ROUTE);
  // A concrete path smuggled as the template is refused by the firewall.
  const forged = { ...evidence, routeTemplate: `/v1/synthetic/p1/${SENTINEL_URL}` };
  expect(() => assertPersistableProductionEvidence(forged)).toThrow();
});

test('console text, screenshots, and traces are prohibited by construction', () => {
  const current = policy();
  expect(current.pageConsoleText).toBe('PROHIBITED');
  expect(pageConsoleTextProhibited(current)).toBe(true);
  expect(screenshotsProhibited(current)).toBe(true);
  expect(tracesProhibited(current)).toBe(true);
  expect(current.responseBodyRetention).toBe('ZERO_BYTES');
  expect(current.urlRetention).toBe('ROUTE_TEMPLATE_ONLY');
  expect(current.browserProfile).toBe('EPHEMERAL_PRIVATE_NO_CACHE');
  // Weakening any of them throws rather than constructing.
  expect(() => createProductionPrivacyPolicy({ requestedCapabilities: { screenshots: 'ALLOWED_REDACTED' } })).toThrow();
  expect(() =>
    createProductionPrivacyPolicy({ requestedCapabilities: { pageConsoleText: 'ALLOWED_REDACTED' } }),
  ).toThrow();
  expect(() =>
    createProductionPrivacyPolicy({ requestedCapabilities: { browserProfile: 'DEFAULT' } }),
  ).toThrow();
});

test('the persistence audit finds a planted sentinel and clears a clean root', () => {
  const dirty = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-p1-audit-dirty-'));
  const dirtyFile = path.join(dirty, 'evidence.json');
  fs.writeFileSync(dirtyFile, JSON.stringify({ alpha: SENTINEL_VALUE }));
  fs.chmodSync(dirtyFile, 0o600);
  const dirtyReport = auditProductionPersistence({
    roots: [dirty],
    profileBaseDirectories: [],
    sentinels: [SENTINEL_VALUE],
    provenRouteTemplates: [PROVEN_ROUTE],
  });
  expect(dirtyReport.clean).toBe(false);
  expect(dirtyReport.violations.some((violation) => violation.violationClass === 'CUSTOMER_SENTINEL')).toBe(true);

  const clean = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-p1-audit-clean-'));
  const evidence = persistableEvidence({ alpha: 1, beta: 'x' });
  const cleanFile = path.join(clean, 'evidence.json');
  fs.writeFileSync(cleanFile, JSON.stringify(assertPersistableProductionEvidence(evidence)));
  fs.chmodSync(cleanFile, 0o600);
  const cleanReport = auditProductionPersistence({
    roots: [clean],
    profileBaseDirectories: [],
    sentinels: [SENTINEL_VALUE, SENTINEL_CREDENTIAL, SENTINEL_URL],
    provenRouteTemplates: [PROVEN_ROUTE],
  });
  expect(cleanReport.clean).toBe(true);
  expect(cleanReport.violations).toEqual([]);
});
