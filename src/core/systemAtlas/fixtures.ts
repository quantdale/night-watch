// ---------------------------------------------------------------------------
// Nightwatch Lane E - synthetic System Atlas fixtures.
//
// Billing-group / payer style domain concepts, proven ONLY by this fixture
// file itself — which is exactly what their provenance says. Every fixture
// record:
//
//   * lives under the `synthetic.` conceptId prefix;
//   * carries null repository/sourceSha (there is no source checkout behind
//     a synthetic concept, and claiming one would be fabrication);
//   * points its locator at this file and its own anchor;
//   * never claims SOURCE_FACT (synthetic data is not source evidence) and
//     never touches COMMUNICATION_EVIDENCE (unauthorized provenance);
//   * leaves every technical link empty: no synthetic concept has been read
//     back from the systemMap, docs, or a sibling checkout, so there is
//     nothing proven to link to. Links get attached later through
//     linkConceptToTechnicalNodes with real proof, or not at all.
//
// Pure data: no filesystem, process, or network authority.
// ---------------------------------------------------------------------------

import type { SystemAtlasRecord } from '../agentProtocol/atlas';
import { createSystemAtlasRecord } from './model';
import { createSystemAtlasOverlay, type SystemAtlasOverlay } from './overlay';

const FIXTURE_FILE = 'src/core/systemAtlas/fixtures.ts';

function fixtureLocator(anchor: string): string {
  return `${FIXTURE_FILE}#${anchor}`;
}

function billingGroupFixture(): SystemAtlasRecord {
  return createSystemAtlasRecord({
    conceptId: 'synthetic.billing-group',
    kind: 'BUSINESS_ENTITY',
    label: 'Billing Group (synthetic fixture)',
    provenance: {
      category: 'DOCUMENTED_FACT',
      repository: null,
      sourceSha: null,
      locator: fixtureLocator('synthetic.billing-group'),
      confidence: 'MEDIUM',
    },
  });
}

function payerFixture(): SystemAtlasRecord {
  return createSystemAtlasRecord({
    conceptId: 'synthetic.payer',
    kind: 'BUSINESS_ENTITY',
    label: 'Payer (synthetic fixture)',
    provenance: {
      category: 'DOCUMENTED_FACT',
      repository: null,
      sourceSha: null,
      locator: fixtureLocator('synthetic.payer'),
      confidence: 'MEDIUM',
    },
  });
}

function monthlyInvoicingFixture(): SystemAtlasRecord {
  return createSystemAtlasRecord({
    conceptId: 'synthetic.monthly-invoicing',
    kind: 'WORKFLOW',
    label: 'Monthly Invoicing (synthetic fixture)',
    provenance: {
      // A hypothesized workflow shape, honestly marked: no links, no facts.
      category: 'INFERENCE',
      repository: null,
      sourceSha: null,
      locator: fixtureLocator('synthetic.monthly-invoicing'),
      confidence: 'LOW',
    },
  });
}

function billingGroupMembershipFixture(): SystemAtlasRecord {
  return createSystemAtlasRecord({
    conceptId: 'synthetic.billing-group-membership',
    kind: 'DEPENDENCY',
    label: 'Billing group membership (synthetic fixture)',
    provenance: {
      category: 'DOCUMENTED_FACT',
      repository: null,
      sourceSha: null,
      locator: fixtureLocator('synthetic.billing-group-membership'),
      confidence: 'LOW',
    },
  });
}

/** The four synthetic domain concepts. Frozen; link-honest by construction. */
export const SYNTHETIC_SYSTEM_ATLAS_FIXTURES: readonly SystemAtlasRecord[] = Object.freeze([
  billingGroupFixture(),
  payerFixture(),
  monthlyInvoicingFixture(),
  billingGroupMembershipFixture(),
]);

/** Fixture overlay: the synthetic concepts as a queryable bounded store. */
export function createSyntheticSystemAtlasOverlay(): SystemAtlasOverlay {
  return createSystemAtlasOverlay(SYNTHETIC_SYSTEM_ATLAS_FIXTURES);
}
