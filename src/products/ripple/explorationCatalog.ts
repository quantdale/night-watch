import type { ExplorationEnvelope, ExplorationBudget, SafeAction, SourceProvenance } from '../../core/exploration/types';
import { BUDGET_POLICY_VERSION } from '../../core/exploration/types';

export const RIPPLE_EXPLORATION_UI_SOURCE_SHA = 'd80b161b684d9153c7e5acaa65ae1752d93d8ba9';
export const RIPPLE_EXPLORATION_UI_TRACKING_SHA = 'f6b2d2f6d580ce52227596b4f822d983bbda533b';
export const RIPPLE_EXPLORATION_API_SOURCE_SHA = '27bb007ad0c798800b6bd3b29760c966422966e7';
export const RIPPLE_EXPLORATION_BLUE_API_SOURCE_SHA = '691422e5dc81afd263d064986fb50fcb3ea432a9';

const ui = (file: string, symbol: string): SourceProvenance => ({
  repository: 'mobingilabs/ripple-ui',
  file,
  symbol,
  sourceSha: RIPPLE_EXPLORATION_UI_SOURCE_SHA,
  trackingRef: 'origin/dev',
  freshness: 'LOCAL_TRACKING_REF_ONLY',
});

const api = (file: string, symbol: string): SourceProvenance => ({
  repository: 'mobingilabs/ripple-api',
  file,
  symbol,
  sourceSha: RIPPLE_EXPLORATION_API_SOURCE_SHA,
  trackingRef: 'origin/master',
  freshness: 'LOCAL_TRACKING_REF_ONLY',
});

const blue = (file: string, symbol: string): SourceProvenance => ({
  repository: 'alphauslabs/blueapi',
  file,
  symbol,
  sourceSha: RIPPLE_EXPLORATION_BLUE_API_SOURCE_SHA,
  trackingRef: 'origin/main',
  freshness: 'LOCAL_TRACKING_REF_ONLY',
});

const common = {
  product: 'ripple' as const,
  persistedPreferenceEffect: 'NONE' as const,
  analyticsEffect: 'EXISTING_BLOCKED_OPTIONAL' as const,
  privacyPolicy: 'METADATA_ONLY_NO_CUSTOMER_VALUES' as const,
  replayPolicy: 'STRICT_ACTION_ID_AND_PRECONDITION' as const,
  status: 'APPROVED' as const,
  forbiddenRequestFamilies: [
    'ripple.payer-exchange.write',
    'ripple.common-exchange.write',
    'ripple.billing-groups.write',
    'ripple.account-inventory.write',
  ],
} as const;

const j1Selector = '. __ExchangeRateDataTable_Selectors'.replace(' ', '');
const j2Selector = '.__GlobalExchangeRateDataTable_Selectors';
const j3Selector = '.__CustomDataTable';

const j1 = (action: Omit<SafeAction, keyof typeof common | 'product' | 'forbiddenRequestFamilies'>): SafeAction => ({ ...common, ...action });
const j2 = j1;
const j3 = j1;

const localJ1Source = [
  ui('src/pages/ExchangeRate_v2/PayerExchangeRate/DataTableSelectors.vue', 'DataTableSelectors vendor/month/status v-models'),
  ui('src/vuex/api/exchangeRatePayer_v2.js', 'getPayerExchangeRates vendor/status getters'),
];
const j2Source = [
  ui('src/pages/ExchangeRate_v2/GlobalExchangeRate/DataTableSelectors.vue', 'DataTableSelectors vendor v-model'),
  ui('src/pages/ExchangeRate_v2/GlobalExchangeRate/index.vue', 'watch vendor -> fetch'),
  ui('src/vuex/api/exchangeRateGlobal.js', 'fetch'),
  api('src/App/Route/Config/Routing.yaml', 'get:/vendor/{vendor}/exchange_rate'),
];
const j3SortSource = [
  ui('src/pages/Account/AccountManagement/DataTable.vue', 'columns sortable account/billinggroup'),
  ui('src/components/CustomDataTable/CustomDataTable.vue', 'q-table data/pagination binding'),
];

const selector = (surfaceSelector: string, labelTexts: readonly string[], value: string, optionLabels: readonly string[]) => ({
  kind: 'selector-option' as const,
  surfaceSelector,
  labelTexts,
  value,
  optionLabels,
});

const vendorSelector = (value: string, optionLabels: readonly string[]) => selector(j1Selector, ['Cloud Provider', 'クラウドベンダー'], value, optionLabels);

const routeAction = (actionId: string, anchorJourney: SafeAction['anchorJourney'], routeClass: string, readFamilies: readonly string[], source: readonly SourceProvenance[]): SafeAction => ({
  ...common,
  actionId,
  anchorJourney,
  surface: 'anchor',
  control: 'approved anchor route',
  sourceProvenance: source,
  actionKind: 'RETURN_TO_ANCHOR',
  preconditions: { routeClasses: [routeClass] },
  locator: { kind: 'approved-route', routeClass },
  semanticClass: 'KNOWN_READ',
  expectedRouteClass: routeClass,
  expectedStructuralDelta: { anchorReady: true },
  expectedReadFamilies: readFamilies,
  routeEffect: 'APPROVED_ROUTE',
});

export const RIPPLE_PHASE4_ACTIONS: readonly SafeAction[] = [
  j1({
    actionId: 'p4.j1.vendor-local.aws',
    anchorJourney: 'ripple-payer-exchange-read',
    surface: 'payer-exchange-rate',
    control: 'Cloud Provider selector',
    sourceProvenance: localJ1Source,
    actionKind: 'SELECT_APPROVED_READ_OPTION',
    preconditions: { routeClasses: ['/payer-exchange-rate-v2'] },
    locator: vendorSelector('aws', ['Amazon Web Services']),
    semanticClass: 'LOCAL_ONLY',
    expectedRouteClass: '/payer-exchange-rate-v2',
    expectedStructuralDelta: { vendor: 'aws' },
    expectedReadFamilies: [],
    routeEffect: 'UNCHANGED',
  }),
  j1({
    actionId: 'p4.j1.vendor-local.azure',
    anchorJourney: 'ripple-payer-exchange-read',
    surface: 'payer-exchange-rate',
    control: 'Cloud Provider selector',
    sourceProvenance: localJ1Source,
    actionKind: 'SELECT_APPROVED_READ_OPTION',
    preconditions: { routeClasses: ['/payer-exchange-rate-v2'] },
    locator: vendorSelector('azure', ['Microsoft Azure']),
    semanticClass: 'LOCAL_ONLY',
    expectedRouteClass: '/payer-exchange-rate-v2',
    expectedStructuralDelta: { vendor: 'azure' },
    expectedReadFamilies: [],
    routeEffect: 'UNCHANGED',
  }),
  j1({
    actionId: 'p4.j1.vendor-local.gcp',
    anchorJourney: 'ripple-payer-exchange-read',
    surface: 'payer-exchange-rate',
    control: 'Cloud Provider selector',
    sourceProvenance: localJ1Source,
    actionKind: 'SELECT_APPROVED_READ_OPTION',
    preconditions: { routeClasses: ['/payer-exchange-rate-v2'] },
    locator: vendorSelector('gcp', ['Google Cloud']),
    semanticClass: 'LOCAL_ONLY',
    expectedRouteClass: '/payer-exchange-rate-v2',
    expectedStructuralDelta: { vendor: 'gcp' },
    expectedReadFamilies: [],
    routeEffect: 'UNCHANGED',
  }),
  j1({
    actionId: 'p4.j1.status-local.set',
    anchorJourney: 'ripple-payer-exchange-read',
    surface: 'payer-exchange-rate',
    control: 'Exchange Rate Status selector',
    sourceProvenance: localJ1Source,
    actionKind: 'TOGGLE_LOCAL_VIEW',
    preconditions: { routeClasses: ['/payer-exchange-rate-v2'] },
    locator: selector(j1Selector, ['Exchange Rate Status', '為替レートの登録状況'], 'set', ['Set', '登録済み']),
    semanticClass: 'LOCAL_ONLY',
    expectedRouteClass: '/payer-exchange-rate-v2',
    expectedStructuralDelta: { status: 'set' },
    expectedReadFamilies: [],
    routeEffect: 'UNCHANGED',
  }),
  j1({
    actionId: 'p4.j1.status-local.not-set',
    anchorJourney: 'ripple-payer-exchange-read',
    surface: 'payer-exchange-rate',
    control: 'Exchange Rate Status selector',
    sourceProvenance: localJ1Source,
    actionKind: 'TOGGLE_LOCAL_VIEW',
    preconditions: { routeClasses: ['/payer-exchange-rate-v2'] },
    locator: selector(j1Selector, ['Exchange Rate Status', '為替レートの登録状況'], 'not_set', ['Not Set', '未登録']),
    semanticClass: 'LOCAL_ONLY',
    expectedRouteClass: '/payer-exchange-rate-v2',
    expectedStructuralDelta: { status: 'not_set' },
    expectedReadFamilies: [],
    routeEffect: 'UNCHANGED',
  }),
  routeAction('p4.j1.return-anchor', 'ripple-payer-exchange-read', '/payer-exchange-rate-v2', ['ripple.payer-exchange.read'], [
    ui('src/router.js', 'payer-exchange-rate-v2 route'),
    api('src/App/Route/Config/Routing.yaml', 'get:/payer/exchange_rate/{month}'),
  ]),
  j2({
    actionId: 'p4.j2.vendor-read.aws',
    anchorJourney: 'ripple-common-exchange-read',
    surface: 'common-exchange-rate',
    control: 'Cloud vendor selector',
    sourceProvenance: j2Source,
    actionKind: 'SELECT_APPROVED_READ_OPTION',
    preconditions: { routeClasses: ['/global-exchange-rate-v2'] },
    locator: { kind: 'selector-option', surfaceSelector: j2Selector, labelTexts: [], value: 'aws', optionLabels: ['Amazon Web Services'] },
    semanticClass: 'KNOWN_READ',
    expectedRouteClass: '/global-exchange-rate-v2',
    expectedStructuralDelta: { vendor: 'aws' },
    expectedReadFamilies: ['ripple.common-exchange.read'],
    routeEffect: 'UNCHANGED',
  }),
  j2({
    actionId: 'p4.j2.vendor-read.azure',
    anchorJourney: 'ripple-common-exchange-read',
    surface: 'common-exchange-rate',
    control: 'Cloud vendor selector',
    sourceProvenance: j2Source,
    actionKind: 'SELECT_APPROVED_READ_OPTION',
    preconditions: { routeClasses: ['/global-exchange-rate-v2'] },
    locator: { kind: 'selector-option', surfaceSelector: j2Selector, labelTexts: [], value: 'azure', optionLabels: ['Microsoft Azure'] },
    semanticClass: 'KNOWN_READ',
    expectedRouteClass: '/global-exchange-rate-v2',
    expectedStructuralDelta: { vendor: 'azure' },
    expectedReadFamilies: ['ripple.common-exchange.read'],
    routeEffect: 'UNCHANGED',
  }),
  routeAction('p4.j2.return-anchor', 'ripple-common-exchange-read', '/global-exchange-rate-v2', ['ripple.common-exchange.read'], [
    ui('src/router.js', 'global-exchange-rate-v2 route'),
    api('src/App/Route/Config/Routing.yaml', 'get:/vendor/{vendor}/exchange_rate'),
  ]),
  j3({
    actionId: 'p4.j3.sort-account',
    anchorJourney: 'ripple-account-inventory',
    surface: 'account-inventory',
    control: 'Account column header',
    sourceProvenance: j3SortSource,
    actionKind: 'TOGGLE_LOCAL_VIEW',
    preconditions: { routeClasses: ['/accounts'] },
    locator: { kind: 'column-header', surfaceSelector: j3Selector, columnLabels: ['Account', 'アカウント'], columnKey: 'account' },
    semanticClass: 'LOCAL_ONLY',
    expectedRouteClass: '/accounts',
    expectedStructuralDelta: { sortKey: 'account' },
    expectedReadFamilies: [],
    routeEffect: 'UNCHANGED',
  }),
  j3({
    actionId: 'p4.j3.sort-billinggroup',
    anchorJourney: 'ripple-account-inventory',
    surface: 'account-inventory',
    control: 'Billing group column header',
    sourceProvenance: j3SortSource,
    actionKind: 'TOGGLE_LOCAL_VIEW',
    preconditions: { routeClasses: ['/accounts'] },
    locator: { kind: 'column-header', surfaceSelector: j3Selector, columnLabels: ['Billing group', 'Billing Group', '請求グループ'], columnKey: 'billinggroup' },
    semanticClass: 'LOCAL_ONLY',
    expectedRouteClass: '/accounts',
    expectedStructuralDelta: { sortKey: 'billinggroup' },
    expectedReadFamilies: [],
    routeEffect: 'UNCHANGED',
  }),
  routeAction('p4.j3.return-anchor', 'ripple-account-inventory', '/accounts', ['ripple.billing-groups.read', 'ripple.account-inventory.read'], [
    ui('src/router.js', 'accounts route'),
    blue('billing/v1/billing.proto', 'ListBillingGroups GET /v1/billinggroups'),
    api('src/App/Route/Config/Routing.yaml', 'get:/accts'),
  ]),
] as const;

export const RIPPLE_PHASE4_ENVELOPES: readonly ExplorationEnvelope[] = [
  {
    envelopeId: 'E1-J1-payer-exchange',
    anchorJourney: 'ripple-payer-exchange-read',
    allowedRoutes: ['/payer-exchange-rate-v2'],
    allowedActionIds: RIPPLE_PHASE4_ACTIONS.filter((action) => action.anchorJourney === 'ripple-payer-exchange-read').map((action) => action.actionId),
    expectedReadFamilies: ['ripple.payer-exchange.read'],
    forbiddenRequestFamilies: common.forbiddenRequestFamilies,
    maxActionsPerSequence: 6,
    maxDepth: 6,
    maxStates: 12,
    maxTransitions: 12,
    maxStateVisits: 2,
    maxTransitionVisits: 2,
    maxImmediateBacktracks: 2,
    maxRouteChanges: 4,
  },
  {
    envelopeId: 'E2-J2-common-exchange',
    anchorJourney: 'ripple-common-exchange-read',
    allowedRoutes: ['/global-exchange-rate-v2'],
    allowedActionIds: RIPPLE_PHASE4_ACTIONS.filter((action) => action.anchorJourney === 'ripple-common-exchange-read').map((action) => action.actionId),
    expectedReadFamilies: ['ripple.common-exchange.read'],
    forbiddenRequestFamilies: common.forbiddenRequestFamilies,
    maxActionsPerSequence: 6,
    maxDepth: 6,
    maxStates: 12,
    maxTransitions: 12,
    maxStateVisits: 2,
    maxTransitionVisits: 2,
    maxImmediateBacktracks: 2,
    maxRouteChanges: 4,
  },
  {
    envelopeId: 'E3-J3-account-inventory',
    anchorJourney: 'ripple-account-inventory',
    allowedRoutes: ['/accounts'],
    allowedActionIds: RIPPLE_PHASE4_ACTIONS.filter((action) => action.anchorJourney === 'ripple-account-inventory').map((action) => action.actionId),
    expectedReadFamilies: ['ripple.billing-groups.read', 'ripple.account-inventory.read'],
    forbiddenRequestFamilies: common.forbiddenRequestFamilies,
    maxActionsPerSequence: 6,
    maxDepth: 6,
    maxStates: 12,
    maxTransitions: 12,
    maxStateVisits: 2,
    maxTransitionVisits: 2,
    maxImmediateBacktracks: 2,
    maxRouteChanges: 4,
  },
] as const;

export const RIPPLE_PHASE4_BUDGET: ExplorationBudget = {
  policyVersion: BUDGET_POLICY_VERSION,
  maxActionsPerSequence: 6,
  maxDepth: 6,
  maxStates: 12,
  maxTransitions: 12,
  maxRouteChanges: 4,
  maxRuntimeMs: 120_000,
  maxRealContexts: 9,
  maxSeeds: 6,
};

export function actionById(actionId: string): SafeAction {
  const action = RIPPLE_PHASE4_ACTIONS.find((candidate) => candidate.actionId === actionId);
  if (action === undefined) throw new Error(`unknown Phase 4 action: ${actionId}`);
  return action;
}

export function envelopeById(envelopeId: string): ExplorationEnvelope {
  const envelope = RIPPLE_PHASE4_ENVELOPES.find((candidate) => candidate.envelopeId === envelopeId);
  if (envelope === undefined) throw new Error(`unknown Phase 4 envelope: ${envelopeId}`);
  return envelope;
}
