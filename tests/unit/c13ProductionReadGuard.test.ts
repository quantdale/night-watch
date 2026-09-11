// ---------------------------------------------------------------------------
// C-13 prerequisite — the production-read deployment-fact guard.
//
// The load-bearing claim is falsifiable: with `POSITIVE_DEPLOYMENT_FACTS` at 0,
// an AUTHORIZED production read against a route whose binding is an INFERENCE
// (or any non-positive class) still refuses at construction, and no request
// object exists afterwards. The guard is independent of authorization state,
// so a valid authorization can never make a non-fact route constructible.
//
// Everything here is local and synthetic. No production contact, no network,
// no credentials, no sibling writes.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import {
  PRODUCTION_READ_CAPABILITY_STATES,
  PRODUCTION_READ_CAPABILITY_VERSION,
  PRODUCTION_READ_NO_DEPLOYMENT_FACT,
  PRODUCTION_READ_GUARD_VERSION,
  ProductionReadDeploymentFactRefusal,
  ProductionReadRequestMalformedError,
  constructProductionReadRequest,
  productionReadCapability,
  type ProductionReadDeploymentFact,
  type ProductionReadRequestDraft,
} from '../../src/core/prodObserve';
import { PRODUCTION_DENIAL_CODES } from '../../src/core/prodObserve/types';
import { CENSUS_FIGURES, POLICED_DOCUMENTS, checkCensusFigures } from '../../src/core/source/censusFigureLedger';

const ROOT = path.resolve(__dirname, '..', '..');

function sha24(canonical: string): string {
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24);
}

const SYNTHETIC_SHA = 'a'.repeat(40);
const POSITIVE_FACT: ProductionReadDeploymentFact = Object.freeze({
  factCategory: 'DEPLOYMENT_FACT',
  established: true,
  evidenceIdentity: `ev:sha256:${sha24('synthetic-mochi-ingress')}`,
  provenance: `mochi@${SYNTHETIC_SHA}:services/prod/appproxy/ingress.yaml`,
});

function draft(overrides: Partial<ProductionReadRequestDraft> = {}): ProductionReadRequestDraft {
  return {
    campaignId: 'nightwatch-c13-production-read-guard-v1',
    method: 'GET',
    host: 'api.example.invalid',
    routeTemplate: '/m/ripple/things',
    deploymentFact: POSITIVE_FACT,
    authorization: { present: true, consumed: false },
    ...overrides,
  };
}

test.describe('C-13 the deployment-fact guard refuses at construction', () => {
  test('an AUTHORIZED read against an INFERENCE route refuses with the distinct code', () => {
    let constructed: unknown = null;
    expect(() => {
      constructed = constructProductionReadRequest(
        draft({
          deploymentFact: { factCategory: 'INFERENCE', established: true, evidenceIdentity: null, provenance: null },
          // A fully valid, unconsumed authorization is presented. It must not matter.
          authorization: { present: true, consumed: false },
        }),
      );
    }).toThrow(PRODUCTION_READ_NO_DEPLOYMENT_FACT);
    expect(constructed).toBeNull();
  });

  test('an established SOURCE_FACT is still not a deployment fact', () => {
    expect(() =>
      constructProductionReadRequest(
        draft({
          deploymentFact: {
            factCategory: 'SOURCE_FACT',
            established: true,
            evidenceIdentity: `ev:sha256:${sha24('host-matrix')}`,
            provenance: `ripple-ui@${SYNTHETIC_SHA}:src/config/common.js`,
          },
        }),
      ),
    ).toThrow(ProductionReadDeploymentFactRefusal);
  });

  test('DEPLOYMENT_FACT without established evidence refuses', () => {
    expect(() =>
      constructProductionReadRequest(
        draft({
          deploymentFact: { factCategory: 'DEPLOYMENT_FACT', established: false, evidenceIdentity: null, provenance: null },
        }),
      ),
    ).toThrow(PRODUCTION_READ_NO_DEPLOYMENT_FACT);
  });

  test('a malformed evidence identity or provenance refuses even for a DEPLOYMENT_FACT', () => {
    expect(() =>
      constructProductionReadRequest(
        draft({
          deploymentFact: { factCategory: 'DEPLOYMENT_FACT', established: true, evidenceIdentity: 'ev:sha256:not-hex', provenance: POSITIVE_FACT.provenance },
        }),
      ),
    ).toThrow(PRODUCTION_READ_NO_DEPLOYMENT_FACT);
    expect(() =>
      constructProductionReadRequest(
        draft({
          deploymentFact: { factCategory: 'DEPLOYMENT_FACT', established: true, evidenceIdentity: POSITIVE_FACT.evidenceIdentity, provenance: 'not-provenance' },
        }),
      ),
    ).toThrow(PRODUCTION_READ_NO_DEPLOYMENT_FACT);
  });

  test('the refusal error carries categorical detail only, never the route or host', () => {
    try {
      constructProductionReadRequest(
        draft({
          host: 'sensitive-host.example.invalid',
          routeTemplate: '/customer/12345/things',
          deploymentFact: { factCategory: 'INFERENCE', established: true, evidenceIdentity: null, provenance: null },
        }),
      );
      throw new Error('expected refusal');
    } catch (error) {
      expect(error).toBeInstanceOf(ProductionReadDeploymentFactRefusal);
      const refusal = error as ProductionReadDeploymentFactRefusal;
      expect(refusal.code).toBe(PRODUCTION_READ_NO_DEPLOYMENT_FACT);
      expect(refusal.message).toContain('INFERENCE');
      expect(refusal.message).not.toContain('sensitive-host');
      expect(refusal.message).not.toContain('12345');
    }
  });

  test('a positive fact constructs, with or without authorization', () => {
    const authorized = constructProductionReadRequest(draft());
    expect(authorized.schemaVersion).toBe(PRODUCTION_READ_GUARD_VERSION);
    expect(authorized.deploymentFactCategory).toBe('DEPLOYMENT_FACT');
    expect(authorized.deploymentEvidenceIdentity).toBe(POSITIVE_FACT.evidenceIdentity);
    expect(authorized.deploymentProvenance).toBe(POSITIVE_FACT.provenance);
    expect(authorized.authorizationPresent).toBe(true);

    const unauthorized = constructProductionReadRequest(draft({ authorization: null }));
    expect(unauthorized.authorizationPresent).toBe(false);
  });

  test('malformed request shape refuses with its own code, not the fact code', () => {
    for (const malformed of [draft({ campaignId: '  ' }), draft({ method: '' }), draft({ host: '' }), draft({ routeTemplate: 'no-leading-slash' })]) {
      expect(() => constructProductionReadRequest(malformed)).toThrow(ProductionReadRequestMalformedError);
    }
  });

  test('the guard code is deliberately not a C-11 chain denial code', () => {
    // The C-11 receipt must not be able to borrow a construction-time refusal.
    expect(PRODUCTION_DENIAL_CODES as readonly string[]).not.toContain(PRODUCTION_READ_NO_DEPLOYMENT_FACT);
  });
});

test.describe('C-13 the capability is gated by the count, not a flag', () => {
  test('the census ledger still measures zero positive deployment facts', () => {
    const measure = CENSUS_FIGURES.find((figure) => figure.measureId === 'POSITIVE_DEPLOYMENT_FACTS');
    expect(measure).toBeDefined();
    expect(measure?.currentValue).toBe(0);
  });

  test('zero facts reports UNAVAILABLE_CAPABILITY with the count as the reason', () => {
    const capability = productionReadCapability(0);
    expect(capability.schemaVersion).toBe(PRODUCTION_READ_CAPABILITY_VERSION);
    expect(capability.state).toBe('UNAVAILABLE_CAPABILITY');
    expect(capability.available).toBe(false);
    expect(capability.positiveDeploymentFacts).toBe(0);
    expect(capability.reason).toBe('POSITIVE_DEPLOYMENT_FACTS: 0');
  });

  test('a positive count is the only route to AVAILABLE', () => {
    const capability = productionReadCapability(1);
    expect(capability.state).toBe('AVAILABLE');
    expect(capability.available).toBe(true);
    expect(capability.reason).toBeNull();
    expect([...PRODUCTION_READ_CAPABILITY_STATES]).toEqual(['AVAILABLE', 'UNAVAILABLE_CAPABILITY']);
  });

  test('a malformed count refuses rather than guessing', () => {
    for (const count of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => productionReadCapability(count)).toThrow('PRODUCTION_READ_CAPABILITY_COUNT_INVALID');
    }
  });

  test('the live capability reads the ledger figure and is unavailable', () => {
    const measure = CENSUS_FIGURES.find((figure) => figure.measureId === 'POSITIVE_DEPLOYMENT_FACTS');
    const capability = productionReadCapability(measure?.currentValue ?? Number.NaN);
    expect(capability.available).toBe(false);
    expect(capability.reason).toBe(`POSITIVE_DEPLOYMENT_FACTS: ${String(measure?.currentValue)}`);
  });

  test('every policed document states the current figure or is explicitly historical', () => {
    const documents = POLICED_DOCUMENTS.map((documentPath) => ({
      path: documentPath,
      text: fs.readFileSync(path.join(ROOT, documentPath), 'utf8'),
    }));
    const result = checkCensusFigures(documents);
    expect(result.taggedFiguresFound).toBeGreaterThan(0);
    expect(result.violations).toEqual([]);
    expect(result.holds).toBe(true);
  });
});
