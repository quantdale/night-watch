// ---------------------------------------------------------------------------
// Nightwatch — synthetic fixture bootstrap exemptions (NW-AUD-020).
//
// Local/synthetic ONLY. These enumerate the startup reads that the Nightwatch
// fixtures themselves emit on page load — each one is explicit, GET-only,
// route-exact, provenance-labelled and navigation-generation-scoped at
// consumption time. There is NO implicit default: a test or harness that
// wants bootstrap traffic admitted passes this list into
// `createNightwatchContext({ bootstrapExemptions })`.
//
// Real product bootstrap traffic is NEVER exempted here.
// ---------------------------------------------------------------------------

import type { BootstrapExemption } from '../../core/safety/bootstrapExemptions';

export interface FixtureExemptionRoute {
  readonly id: string;
  readonly routePattern: string;
}

/** Startup reads emitted by fixtureServer BASE_FETCHES + safety redirects. */
export const FIXTURE_SERVER_BOOTSTRAP_ROUTES: readonly FixtureExemptionRoute[] = Object.freeze([
  { id: 'fixture.bootstrap.invoices', routePattern: '^/api/invoices$' },
  { id: 'fixture.bootstrap.billing-groups', routePattern: '^/api/billing-groups$' },
  { id: 'fixture.bootstrap.stream', routePattern: '^/api/stream$' },
  { id: 'fixture.bootstrap.safety-redirect-ok', routePattern: '^/api/safety/redirect-ok$' },
  { id: 'fixture.bootstrap.safety-redirect-prod', routePattern: '^/api/safety/redirect-prod$' },
  { id: 'fixture.bootstrap.safety-redirect-unknown', routePattern: '^/api/safety/redirect-unknown$' },
  { id: 'fixture.bootstrap.safety-redirect-telemetry', routePattern: '^/api/safety/redirect-telemetry$' },
  { id: 'fixture.bootstrap.safety-landed', routePattern: '^/api/safety/landed$' },
]);

/** Startup reads emitted by journeyFixtureServer page-load scripts. */
export const JOURNEY_FIXTURE_BOOTSTRAP_ROUTES: readonly FixtureExemptionRoute[] = Object.freeze([
  { id: 'journey.fixture.passive-bootstrap', routePattern: '^/m/ripple/passive-bootstrap$' },
  { id: 'journey.fixture.billing-groups', routePattern: '^/m/blue/billing/v1/billinggroups$' },
  { id: 'journey.fixture.account-inventory', routePattern: '^/m/ripple/accts$' },
  { id: 'journey.fixture.payer-exchange', routePattern: '^/m/ripple/v2/payer/exchange_rate/[0-9]{4}-[0-9]{2}$' },
  { id: 'journey.fixture.global-exchange', routePattern: '^/m/ripple/exchange_rate/global/(aws|azure)$' },
  { id: 'journey.fixture.privacy-read', routePattern: '^/m/ripple/privacy-read$' },
]);

export function fixtureBootstrapExemptions(
  environment: string,
  origin: string,
  routes: readonly FixtureExemptionRoute[] = FIXTURE_SERVER_BOOTSTRAP_ROUTES,
  maxCountPerNavigation = 64,
): BootstrapExemption[] {
  return routes.map((route) => ({
    id: route.id,
    environment,
    origin,
    method: 'GET',
    routePattern: route.routePattern,
    sourceProof: 'nightwatch-synthetic-fixture-local-only',
    sourceCurrent: true,
    maxCountPerNavigation,
  }));
}
