// ---------------------------------------------------------------------------
// Nightwatch — Phase 2B Ripple journey contracts.
//
// These definitions are the reviewed boundary between source archaeology and
// browser execution. A journey step is intentionally data-shaped: there is
// no arbitrary Playwright callback, generic click, script execution, export,
// form submission, or dynamically blessed endpoint in this file.
// ---------------------------------------------------------------------------

import type { EnvironmentConfig } from '../../core/environment/types';
import type {
  EndpointSemanticClassification,
  EndpointSemanticRule,
} from '../../core/safety/endpointSemantics';
import type {
  JourneyActionType,
  JourneyDefinition as GenericJourneyDefinition,
  JourneyNetworkExpectation,
  JourneyStep,
  JourneyStructuralMarker,
} from '../../core/journeys/types';
export type {
  JourneyActionType,
  JourneyNetworkExpectation,
  JourneyStep,
  JourneyStructuralMarker,
} from '../../core/journeys/types';

export const RIPPLE_PHASE_2B_SOURCE_SHA = 'd80b161b684d9153c7e5acaa65ae1752d93d8ba9';
export const RIPPLE_PHASE_2B_SOURCE_REF = 'mobingilabs/ripple-ui@dev';

export type RippleJourneyId =
  | 'ripple-payer-exchange-read'
  | 'ripple-common-exchange-read'
  | 'ripple-account-inventory';

export type JourneyDefinition = GenericJourneyDefinition<RippleJourneyId>;

const GLOBAL_SHELL: JourneyStructuralMarker = {
  id: 'GLOBAL_RIPPLE_AUTHENTICATED_SHELL',
  selector: '.q-layout-container.layout',
  minimumCount: 1,
  sourceProof: 'Nightwatch Phase 2A shell contract; Ripple DefaultLayout -> Quasar QLayout',
};

const GENERIC_ORACLES = [
  'unexpected-http-status',
  'malformed-json',
  'malformed-ndjson',
  'runtime-exception',
  'unhandled-rejection',
  'csp-failure',
  'critical-asset-failure',
  'structural-readiness-failure',
  'route-contradiction',
  'navigation-cancellation-is-not-critical-asset-failure',
] as const;

const PRIVACY_CONTRACT = [
  'persist only fixed route classes, rule IDs, classifications, booleans, enums, and bounded timing/count metadata',
  'never persist DOM, innerHTML, outerHTML, textContent, customer labels, account IDs, costs, bodies, headers, cookies, tokens, or screenshots',
  'authenticated tracing remains disabled by the shared Phase 2A context policy',
] as const;

const REPLAY_CONTRACT = [
  'create a new BrowserContext for every first observation and replay',
  'reuse the same external auth state, target, contract, selectors, and action sequence',
  'compare strict invariants separately from bounded timing/background variance',
] as const;

const STRICT_INVARIANTS = [
  'same journey ID and contract source SHA',
  'same approved route class and successful journey checkpoint',
  'same required structural marker set',
  'same required semantic endpoint rule IDs and endpoint classifications',
  'zero known mutations, action-caused UNKNOWN requests, production attempts, proxy violations, unknown destinations, unknown approvals, and DB queries',
  'same authenticated validity, fatal-oracle status, and privacy result',
] as const;

const BOUNDED_VARIANCE = [
  'milliseconds and route-stability duration',
  'concurrent request ordering',
  'passive unknown initialization request count',
  'optional/telemetry/browser-background block counts',
] as const;

const STOP_CONDITIONS = [
  'auth validity is absent, expired, page-unreadable, or provenance-invalid',
  'a new hostname, production destination, proxy violation, or unknown approval appears',
  'a journey action causes a KNOWN_MUTATION or causally attributed UNKNOWN endpoint',
  'global shell or journey-specific structural readiness fails',
  'a strict oracle or route invariant fails',
  'a privacy writer/test invariant fails',
] as const;

function step(
  definition: Omit<JourneyStep, 'expectedNetworkResult'> & {
    expectedNetworkResult?: Partial<JourneyNetworkExpectation>;
  },
): JourneyStep {
  return {
    ...definition,
    expectedNetworkResult: {
      scope: 'journey',
      requiredRuleIds: [],
      allowedClassifications: ['KNOWN_READ'],
      minimumRequiredMatches: 0,
      ...definition.expectedNetworkResult,
    },
  };
}

const payerMarker: JourneyStructuralMarker = {
  id: 'PAYER_EXCHANGE_DATA_TABLE',
  selector: '.__ExchangeRateDataTable',
  minimumCount: 1,
  sourceProof: 'ripple-ui/src/pages/ExchangeRate_v2/PayerExchangeRate/DataTable.vue root',
};

const commonMarker: JourneyStructuralMarker = {
  id: 'COMMON_EXCHANGE_DATA_TABLE',
  selector: '.__GlobalExchangeRateDataTable',
  minimumCount: 1,
  sourceProof: 'ripple-ui/src/pages/ExchangeRate_v2/GlobalExchangeRate/DataTable.vue root',
};

const accountMarker: JourneyStructuralMarker = {
  id: 'ACCOUNT_INVENTORY_DATA_TABLE',
  selector: '.__CustomDataTable',
  minimumCount: 1,
  sourceProof: 'ripple-ui/src/pages/Account/AccountManagement/DataTable.vue -> CustomDataTable',
};

const commonStepFields = {
  prohibitedSteps: [
    'CLICK_READ_ONLY_CONTROL on any edit/save/create/delete/export/action menu',
    'fill/type/press into any form or search field',
    'OPEN_READ_ONLY_DETAIL for customer/account/billing-group-specific rows',
    'all POST/PUT/PATCH/DELETE endpoint-triggering actions',
    'EXECUTE_SCRIPT, arbitrary selector, nth-child, customer-derived text, or random exploration',
  ],
  unknownEndpoints: [],
  expectedPassiveInitializationRequests: [
    'source-unreviewed authentication/bootstrap/feature traffic may be observed passively and is never intentionally replayed',
  ],
  expectedBlockedDestinations: ['environment-policy-defined telemetry, optional support, and browser-background hosts only'],
  stabilityRequirement: { routeStableMs: 750, shellSelector: GLOBAL_SHELL.selector },
  genericOracles: GENERIC_ORACLES,
  journeyOracles: ['required journey-specific structural marker is present', 'required source-backed read rule is observed'],
  privacyContract: PRIVACY_CONTRACT,
  replayContract: REPLAY_CONTRACT,
  strictInvariants: STRICT_INVARIANTS,
  boundedVariance: BOUNDED_VARIANCE,
  stopConditions: STOP_CONDITIONS,
} as const;

export const RIPPLE_JOURNEY_DEFINITIONS: readonly JourneyDefinition[] = [
  {
    ...commonStepFields,
    journeyId: 'ripple-payer-exchange-read',
    name: 'Payer exchange-rate read',
    customerPurpose: 'Review payer-level exchange rates by vendor and month without changing settings.',
    sourceSha: RIPPLE_PHASE_2B_SOURCE_SHA,
    startRoute: '/payer-exchange-rate-v2',
    expectedEndRouteOrRouteClass: ['/payer-exchange-rate-v2'],
    globalShellRequirement: GLOBAL_SHELL,
    journeySpecificStructuralMarkers: [
      { id: 'PAYER_EXCHANGE_PAGE', selector: '.__ExchangeRate', minimumCount: 1, sourceProof: 'ripple-ui/src/pages/ExchangeRate_v2/PayerExchangeRate/index.vue root' },
      payerMarker,
    ],
    allowedSteps: [
      step({
        stepId: 'payer-navigate',
        purpose: 'Open the authenticated payer-level exchange-rate read surface.',
        actionType: 'NAVIGATE_APPROVED_ROUTE',
        sourceProof: 'ripple-ui/src/router.js v2 payer exchange route; page created hook dispatches fetchExchangeRate',
        semanticClassification: 'KNOWN_READ',
        allowedRoute: ['/payer-exchange-rate-v2'],
        expectedRouteResult: ['/payer-exchange-rate-v2'],
        expectedStructuralResult: GLOBAL_SHELL,
        expectedNetworkResult: { requiredRuleIds: ['ripple.payer-exchange.read'], minimumRequiredMatches: 1 },
        timeoutMs: 30_000,
        privacyConstraint: PRIVACY_CONTRACT[0],
        failureClassification: 'AUTH_OR_JOURNEY_NAVIGATION_FAILURE',
        routePath: '/payer-exchange-rate-v2',
      }),
      step({
        stepId: 'payer-structural-checkpoint',
        purpose: 'Confirm the payer exchange-rate table component mounted without inspecting its data.',
        actionType: 'WAIT_STRUCTURAL_CHECKPOINT',
        sourceProof: payerMarker.sourceProof,
        semanticClassification: 'LOCAL_ONLY',
        allowedRoute: ['/payer-exchange-rate-v2'],
        expectedRouteResult: ['/payer-exchange-rate-v2'],
        expectedStructuralResult: payerMarker,
        timeoutMs: 15_000,
        privacyConstraint: PRIVACY_CONTRACT[0],
        failureClassification: 'JOURNEY_STRUCTURAL_READINESS_FAILURE',
      }),
    ],
    knownReadEndpoints: ['ripple.payer-exchange.read'],
    knownMutationEndpoints: ['ripple.payer-exchange.write'],
    stepTimeouts: { 'payer-navigate': 30_000, 'payer-structural-checkpoint': 15_000 },
    sourceEvidence: [
      'mobingilabs/ripple-ui@d80b161b:src/router.js',
      'mobingilabs/ripple-ui@d80b161b:src/pages/ExchangeRate_v2/PayerExchangeRate/index.vue',
      'mobingilabs/ripple-ui@d80b161b:src/vuex/api/exchangeRatePayer_v2.js',
      'mobingilabs/ripple-api@27bb007:src/App/Route/Config/Routing.yaml',
      'mobingilabs/ripple-api@27bb007:src/App/Handler/ExchangeRate.php',
    ],
  },
  {
    ...commonStepFields,
    journeyId: 'ripple-common-exchange-read',
    name: 'Common exchange-rate read',
    customerPurpose: 'Review common-fee exchange rates by vendor and month without changing settings.',
    sourceSha: RIPPLE_PHASE_2B_SOURCE_SHA,
    startRoute: '/global-exchange-rate-v2',
    expectedEndRouteOrRouteClass: ['/global-exchange-rate-v2'],
    globalShellRequirement: GLOBAL_SHELL,
    journeySpecificStructuralMarkers: [commonMarker],
    allowedSteps: [
      step({
        stepId: 'common-navigate',
        purpose: 'Open the authenticated common-fee exchange-rate read surface.',
        actionType: 'NAVIGATE_APPROVED_ROUTE',
        sourceProof: 'ripple-ui/src/router.js v2 global exchange route; page watcher dispatches the reviewed GET fetch',
        semanticClassification: 'KNOWN_READ',
        allowedRoute: ['/global-exchange-rate-v2'],
        expectedRouteResult: ['/global-exchange-rate-v2'],
        expectedStructuralResult: GLOBAL_SHELL,
        expectedNetworkResult: { requiredRuleIds: ['ripple.common-exchange.read'], minimumRequiredMatches: 1 },
        timeoutMs: 30_000,
        privacyConstraint: PRIVACY_CONTRACT[0],
        failureClassification: 'AUTH_OR_JOURNEY_NAVIGATION_FAILURE',
        routePath: '/global-exchange-rate-v2',
      }),
      step({
        stepId: 'common-structural-checkpoint',
        purpose: 'Confirm the common exchange-rate table component mounted without inspecting rates.',
        actionType: 'WAIT_STRUCTURAL_CHECKPOINT',
        sourceProof: commonMarker.sourceProof,
        semanticClassification: 'LOCAL_ONLY',
        allowedRoute: ['/global-exchange-rate-v2'],
        expectedRouteResult: ['/global-exchange-rate-v2'],
        expectedStructuralResult: commonMarker,
        timeoutMs: 15_000,
        privacyConstraint: PRIVACY_CONTRACT[0],
        failureClassification: 'JOURNEY_STRUCTURAL_READINESS_FAILURE',
      }),
    ],
    knownReadEndpoints: ['ripple.common-exchange.read'],
    knownMutationEndpoints: ['ripple.common-exchange.write'],
    stepTimeouts: { 'common-navigate': 30_000, 'common-structural-checkpoint': 15_000 },
    sourceEvidence: [
      'mobingilabs/ripple-ui@d80b161b:src/router.js',
      'mobingilabs/ripple-ui@d80b161b:src/pages/ExchangeRate_v2/GlobalExchangeRate/index.vue',
      'mobingilabs/ripple-ui@d80b161b:src/vuex/api/exchangeRateGlobal.js',
      'mobingilabs/ripple-api@27bb007:src/App/Route/Config/Routing.yaml',
      'mobingilabs/ripple-api@27bb007:src/App/Handler/ExchangeRate.php',
    ],
  },
  {
    ...commonStepFields,
    journeyId: 'ripple-account-inventory',
    name: 'Account inventory',
    customerPurpose: 'Review registered cloud accounts and their billing-group/payer association.',
    sourceSha: RIPPLE_PHASE_2B_SOURCE_SHA,
    startRoute: '/accounts',
    expectedEndRouteOrRouteClass: ['/accounts'],
    globalShellRequirement: GLOBAL_SHELL,
    journeySpecificStructuralMarkers: [accountMarker],
    allowedSteps: [
      step({
        stepId: 'account-navigate',
        purpose: 'Open the authenticated account inventory surface; source default vendor is AWS.',
        actionType: 'NAVIGATE_APPROVED_ROUTE',
        sourceProof: 'ripple-ui/src/pages/Account/AccountManagement/AccountManagement.vue beforeMount sets source defaultVendor aws and dispatches read fetches',
        semanticClassification: 'KNOWN_READ',
        allowedRoute: ['/accounts'],
        expectedRouteResult: ['/accounts'],
        expectedStructuralResult: GLOBAL_SHELL,
        expectedNetworkResult: {
          requiredRuleIds: ['ripple.billing-groups.read', 'ripple.account-inventory.read'],
          minimumRequiredMatches: 2,
        },
        timeoutMs: 30_000,
        privacyConstraint: PRIVACY_CONTRACT[0],
        failureClassification: 'AUTH_OR_JOURNEY_NAVIGATION_FAILURE',
        routePath: '/accounts',
      }),
      step({
        stepId: 'account-structural-checkpoint',
        purpose: 'Confirm the account inventory table mounted without reading customer rows.',
        actionType: 'WAIT_STRUCTURAL_CHECKPOINT',
        sourceProof: accountMarker.sourceProof,
        semanticClassification: 'LOCAL_ONLY',
        allowedRoute: ['/accounts'],
        expectedRouteResult: ['/accounts'],
        expectedStructuralResult: accountMarker,
        timeoutMs: 15_000,
        privacyConstraint: PRIVACY_CONTRACT[0],
        failureClassification: 'JOURNEY_STRUCTURAL_READINESS_FAILURE',
      }),
    ],
    knownReadEndpoints: ['ripple.billing-groups.read', 'ripple.account-inventory.read'],
    knownMutationEndpoints: ['ripple.billing-groups.write', 'ripple.account-inventory.write'],
    stepTimeouts: { 'account-navigate': 30_000, 'account-structural-checkpoint': 15_000 },
    sourceEvidence: [
      'mobingilabs/ripple-ui@d80b161b:src/router.js',
      'mobingilabs/ripple-ui@d80b161b:src/vuex/rootState.js',
      'mobingilabs/ripple-ui@d80b161b:src/pages/Account/AccountManagement/AccountManagement.vue',
      'mobingilabs/ripple-ui@d80b161b:src/vuex/api/accounts.js',
      'mobingilabs/ripple-ui@d80b161b:src/vuex/api/billingGroups.js',
      'mobingilabs/ripple-api@27bb007:src/App/Route/Config/Routing.yaml',
      'mobingilabs/ripple-api@27bb007:src/App/Handler/Account.php',
      'mobingilabs/ouchan@services/billingd:services/billingd/services/billingsvc/billingsvc.go',
    ],
  },
] as const;

export function getRippleJourneyDefinition(journeyId: RippleJourneyId): JourneyDefinition {
  const found = RIPPLE_JOURNEY_DEFINITIONS.find((journey) => journey.journeyId === journeyId);
  if (found === undefined) throw new Error(`fail-closed: unknown Ripple journey "${journeyId}"`);
  return found;
}

function rule(
  host: string,
  id: string,
  method: string,
  pathPattern: string,
  classification: EndpointSemanticClassification,
  provenance: string,
): EndpointSemanticRule {
  return { host, id, method, pathPattern, classification, provenance };
}

/**
 * Build the exact-host registry for one selected environment. The route
 * patterns include the source-defined `/m/ripple/` and `/m/blue/` API bases;
 * query values are deliberately ignored by the classifier.
 */
export function buildRippleJourneyEndpointRegistry(
  environment: Pick<EnvironmentConfig, 'apiHosts'>,
): readonly EndpointSemanticRule[] {
  const hosts = environment.apiHosts ?? [];
  const rules: EndpointSemanticRule[] = [];
  for (const host of hosts) {
    rules.push(
      rule(host, 'ripple.payer-exchange.read', 'GET', '^/m/ripple/v2/payer/exchange_rate/[0-9]{4}-[0-9]{2}$', 'KNOWN_READ', 'Ripple UI exchangeRatePayer_v2 GET -> Ripple API ExchangeRate::getAccountExchangeForMonth'),
      rule(host, 'ripple.payer-exchange.write', 'POST', '^/m/ripple/v2/payer/exchange_rate/[0-9]{4}-[0-9]{2}$', 'KNOWN_MUTATION', 'Ripple API POST -> ExchangeRate::saveAccountExchangeForMonth updates master table'),
      rule(host, 'ripple.common-exchange.read', 'GET', '^/m/ripple/exchange_rate/global/(aws|azure)$', 'KNOWN_READ', 'Ripple UI exchangeRateGlobal GET -> Ripple API ExchangeRate::getCommonExchangeRate'),
      rule(host, 'ripple.common-exchange.write', 'POST', '^/m/ripple/exchange_rate/global/(aws|azure)/[0-9]{4}-[0-9]{2}$', 'KNOWN_MUTATION', 'Ripple API POST -> ExchangeRate::setCommonExchangeRate creates settings'),
      rule(host, 'ripple.billing-groups.read', 'GET', '^/m/blue/billing/v1/billinggroups$', 'KNOWN_READ', 'Ripple UI streamPromise GET -> Blue Billing ListBillingGroups -> Ouchan read helpers'),
      rule(host, 'ripple.billing-groups.write', 'POST', '^/m/blue/billing/v1/billinggroups$', 'KNOWN_MUTATION', 'Blue Billing CreateBillingGroup POST is a product mutation'),
      rule(host, 'ripple.account-inventory.read', 'GET', '^/m/ripple/accts$', 'KNOWN_READ', 'Ripple UI accounts GET -> Ripple API Account::getAccountVendor read/cache assembly'),
      rule(host, 'ripple.account-inventory.write.post', 'POST', '^/m/ripple/accts(?:/.*)?$', 'KNOWN_MUTATION', 'Ripple account create routes mutate account state'),
      rule(host, 'ripple.account-inventory.write.put', 'PUT', '^/m/ripple/accts(?:/.*)?$', 'KNOWN_MUTATION', 'Ripple account edit/rate routes mutate account state'),
      rule(host, 'ripple.account-inventory.write.delete', 'DELETE', '^/m/ripple/accts(?:/.*)?$', 'KNOWN_MUTATION', 'Ripple account delete routes mutate account state'),
    );
  }
  return rules;
}
