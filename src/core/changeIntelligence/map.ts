import {
  DEPENDENCY_MAP_VERSION,
  type DependencyEdge,
  type RepoDefinition,
} from './types';

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
const RIPPLE_JOURNEY_CONTRACT_VERSION = 'phase2c.v1';

export const RIPPLE_REPOSITORIES: readonly RepoDefinition[] = [
  {
    repoId: 'mobingilabs/ripple-ui',
    productRole: 'Legacy Ripple authenticated shell and canary pages',
    scope: 'IN_SCOPE',
    branch: 'dev',
    checkedOutSha: 'd80b161b684d9153c7e5acaa65ae1752d93d8ba9',
    trackingRef: 'origin/dev',
    trackingSha: 'e46b8ed6540b647574bdb96ec59eca42fc8acdef',
    ahead: 0,
    behind: 21,
    dirty: true,
    sourceMapSha: 'd80b161b684d9153c7e5acaa65ae1752d93d8ba9',
    readOnlyOnly: true,
  },
  {
    repoId: 'mobingilabs/ripple-api',
    productRole: 'Legacy Ripple HTTP API',
    scope: 'IN_SCOPE',
    branch: 'master',
    checkedOutSha: '27bb007ad0c798800b6bd3b29760c966422966e7',
    trackingRef: 'origin/master',
    trackingSha: '27bb007ad0c798800b6bd3b29760c966422966e7',
    ahead: 0,
    behind: 0,
    dirty: true,
    sourceMapSha: '27bb007ad0c798800b6bd3b29760c966422966e7',
    readOnlyOnly: true,
  },
  {
    repoId: 'mobingilabs/ouchan',
    productRole: 'Core Go Blue billing service',
    scope: 'IN_SCOPE',
    branch: 'master',
    checkedOutSha: '565f00a87fb7616cc23c45d4ffeabee38a41c65f',
    trackingRef: 'origin/master',
    trackingSha: '16910fc9969e86558828cb0f273eeabae81fcce3',
    ahead: 0,
    behind: 25,
    dirty: true,
    sourceMapSha: '565f00a87fb7616cc23c45d4ffeabee38a41c65f',
    readOnlyOnly: true,
  },
  {
    repoId: 'alphauslabs/blueapi',
    productRole: 'Blue API contract source',
    scope: 'IN_SCOPE',
    branch: 'main',
    checkedOutSha: '691422e5dc81afd263d064986fb50fcb3ea432a9',
    trackingRef: 'origin/main',
    trackingSha: '691422e5dc81afd263d064986fb50fcb3ea432a9',
    ahead: 0,
    behind: 2,
    dirty: true,
    sourceMapSha: '691422e5dc81afd263d064986fb50fcb3ea432a9',
    readOnlyOnly: true,
  },
  {
    repoId: 'alphauslabs/blue-sdk-go',
    productRole: 'Generated Go Blue client',
    scope: 'IN_SCOPE',
    branch: 'main',
    checkedOutSha: '8883ee3d3a073352626c8c35e20e9fc5ed765373',
    trackingRef: 'origin/main',
    trackingSha: '8883ee3d3a073352626c8c35e20e9fc5ed765373',
    ahead: 0,
    behind: 1,
    dirty: true,
    sourceMapSha: '8883ee3d3a073352626c8c35e20e9fc5ed765373',
    readOnlyOnly: true,
  },
  {
    repoId: 'alphauslabs/grpc-chunk-parser',
    productRole: 'Shared browser-side streamed-response parser',
    scope: 'IN_SCOPE',
    branch: 'main',
    checkedOutSha: '66802f281698dfcf0903f0a117d4637fce3fd945',
    trackingRef: 'origin/main',
    trackingSha: '66802f281698dfcf0903f0a117d4637fce3fd945',
    ahead: 0,
    behind: 0,
    dirty: false,
    sourceMapSha: '66802f281698dfcf0903f0a117d4637fce3fd945',
    readOnlyOnly: true,
  },
];

const ALL = 'ALL' as const;

function edge(
  edgeId: string,
  repoId: string,
  pathPattern: string,
  journeyIds: DependencyEdge['journeyIds'],
  impactClass: DependencyEdge['impactClass'],
  reasonCode: DependencyEdge['reasonCode'],
  confidence: DependencyEdge['confidence'],
  riskClasses: DependencyEdge['riskClasses'],
  priorityTier: DependencyEdge['priorityTier'],
  evidence: string,
  match: DependencyEdge['match'] = 'EXACT'
): DependencyEdge {
  const repo = RIPPLE_REPOSITORIES.find((candidate) => candidate.repoId === repoId);
  if (!repo) throw new Error(`unknown dependency-map repository: ${repoId}`);
  return {
    edgeId,
    repoId,
    pathPattern,
    match,
    journeyIds,
    impactClass,
    reasonCode,
    confidence,
    riskClasses,
    priorityTier,
    sourceMapSha: repo.sourceMapSha,
    journeyContractVersion: RIPPLE_JOURNEY_CONTRACT_VERSION,
    evidence,
  };
}

export const RIPPLE_DEPENDENCY_EDGES: readonly DependencyEdge[] = [
  edge('ui-router', 'mobingilabs/ripple-ui', 'src/router.js', ALL, 'SHARED_ROUTER_CHANGE', 'SHARED_ROUTER', 'HIGH', ['ROUTING', 'AUTH_PERMISSIONS'], 'P0', 'Legacy router entries and router.beforeEach auth guard source', 'EXACT'),
  edge('ui-layout', 'mobingilabs/ripple-ui', 'src/layouts/DefaultLayout.vue', ALL, 'SHARED_LAYOUT_CHANGE', 'SHARED_LAYOUT', 'HIGH', ['SHARED_UI_SHELL', 'RESOURCE_LOADING'], 'P0', 'DefaultLayout renders the authenticated Quasar shell', 'EXACT'),
  edge('ui-transport', 'mobingilabs/ripple-ui', 'src/axios.config.js', ALL, 'SHARED_API_TRANSPORT_CHANGE', 'SHARED_TRANSPORT', 'HIGH', ['NETWORK_API_TRANSPORT', 'AUTH_PERMISSIONS'], 'P0', 'baseApi, blueApi, and service URL resolution', 'EXACT'),
  edge('ui-state-registration', 'mobingilabs/ripple-ui', 'src/vuex/index.js', ALL, 'SHARED_STATE_INITIALIZATION_CHANGE', 'SHARED_STATE_INITIALIZATION', 'HIGH', ['SHARED_UI_SHELL', 'ERROR_HANDLING'], 'P0', 'Global Vuex registration for the three canary modules', 'EXACT'),
  edge('ui-shared-table', 'mobingilabs/ripple-ui', 'src/components/CustomDataTable/CustomDataTable.vue', ALL, 'TRANSITIVE_DEPENDENCY_CHANGE', 'TRANSITIVE_DEPENDENCY', 'MEDIUM', ['SHARED_UI_SHELL', 'RESOURCE_LOADING'], 'P2', 'Imported by all three reviewed canary table components', 'EXACT'),
  edge('j1-page', 'mobingilabs/ripple-ui', 'src/pages/ExchangeRate_v2/PayerExchangeRate/', ['ripple-payer-exchange-read'], 'DIRECT_JOURNEY_CHANGE', 'DIRECT_COMPONENT', 'HIGH', ['EXCHANGE_RATE', 'DATA_FETCH'], 'P1', 'Payer route component and required structural table marker', 'PREFIX'),
  edge('j1-client', 'mobingilabs/ripple-ui', 'src/vuex/api/exchangeRatePayer_v2.js', ['ripple-payer-exchange-read'], 'DIRECT_API_CLIENT_CHANGE', 'DIRECT_API_CALL', 'HIGH', ['EXCHANGE_RATE', 'COST_FINANCIAL_SEMANTICS', 'DATA_FETCH'], 'P1', 'Approved GET payer exchange-rate client; adjacent POST is excluded from execution', 'EXACT'),
  edge('j2-page', 'mobingilabs/ripple-ui', 'src/pages/ExchangeRate_v2/GlobalExchangeRate/', ['ripple-common-exchange-read'], 'DIRECT_JOURNEY_CHANGE', 'DIRECT_COMPONENT', 'HIGH', ['EXCHANGE_RATE', 'DATA_FETCH'], 'P1', 'Common exchange route component and required structural table marker', 'PREFIX'),
  edge('j2-client', 'mobingilabs/ripple-ui', 'src/vuex/api/exchangeRateGlobal.js', ['ripple-common-exchange-read'], 'DIRECT_API_CLIENT_CHANGE', 'DIRECT_API_CALL', 'HIGH', ['EXCHANGE_RATE', 'COST_FINANCIAL_SEMANTICS', 'DATA_FETCH'], 'P1', 'Approved GET common exchange-rate client; adjacent POST is excluded from execution', 'EXACT'),
  edge('j3-page', 'mobingilabs/ripple-ui', 'src/pages/Account/AccountManagement/', ['ripple-account-inventory'], 'DIRECT_JOURNEY_CHANGE', 'DIRECT_COMPONENT', 'HIGH', ['ACCOUNT_INVENTORY', 'DATA_FETCH'], 'P1', 'Account inventory route component and required table marker', 'PREFIX'),
  edge('j3-account-client', 'mobingilabs/ripple-ui', 'src/vuex/api/accounts.js', ['ripple-account-inventory'], 'DIRECT_API_CLIENT_CHANGE', 'DIRECT_API_CALL', 'HIGH', ['ACCOUNT_INVENTORY', 'DATA_FETCH'], 'P1', 'Approved GET /accts client; mutation actions are excluded from execution', 'EXACT'),
  edge('j3-billing-client', 'mobingilabs/ripple-ui', 'src/vuex/api/billingGroups.js', ['ripple-account-inventory'], 'DIRECT_API_CLIENT_CHANGE', 'DIRECT_API_CALL', 'HIGH', ['ACCOUNT_INVENTORY', 'DATA_FETCH', 'NETWORK_API_TRANSPORT'], 'P1', 'Approved streamed GET billing-group list client', 'EXACT'),
  edge('j3-admin-transport', 'mobingilabs/ripple-ui', 'src/vuex/api/admin.js', ['ripple-account-inventory'], 'SHARED_API_TRANSPORT_CHANGE', 'SHARED_TRANSPORT', 'HIGH', ['NETWORK_API_TRANSPORT', 'ERROR_HANDLING'], 'P0', 'streamPromise and parseGrpcData callsite used by the approved J3 GET', 'EXACT'),
  edge('j1-api-handler', 'mobingilabs/ripple-api', 'src/App/Handler/ExchangeRate.php', ['ripple-payer-exchange-read'], 'DIRECT_BACKEND_HANDLER_CHANGE', 'DIRECT_BACKEND_HANDLER', 'HIGH', ['EXCHANGE_RATE', 'COST_FINANCIAL_SEMANTICS', 'DATA_FETCH'], 'P1', 'getAccountExchangeForMonth implementation', 'EXACT'),
  edge('j2-api-handler', 'mobingilabs/ripple-api', 'src/App/Handler/ExchangeRate.php', ['ripple-common-exchange-read'], 'DIRECT_BACKEND_HANDLER_CHANGE', 'DIRECT_BACKEND_HANDLER', 'HIGH', ['EXCHANGE_RATE', 'COST_FINANCIAL_SEMANTICS', 'DATA_FETCH'], 'P1', 'getCommonExchangeRate implementation', 'EXACT'),
  edge('j3-api-handler', 'mobingilabs/ripple-api', 'src/App/Handler/Account.php', ['ripple-account-inventory'], 'DIRECT_BACKEND_HANDLER_CHANGE', 'DIRECT_BACKEND_HANDLER', 'HIGH', ['ACCOUNT_INVENTORY', 'DATA_FETCH'], 'P1', 'getAccountVendor implementation', 'EXACT'),
  edge('ripple-api-routing', 'mobingilabs/ripple-api', 'src/App/Route/Config/Routing.yaml', ALL, 'SHARED_API_TRANSPORT_CHANGE', 'SHARED_TRANSPORT', 'HIGH', ['ROUTING', 'NETWORK_API_TRANSPORT'], 'P0', 'Global legacy API route configuration; path-level parser is intentionally conservative', 'EXACT'),
  edge('j3-billing-service', 'mobingilabs/ouchan', 'services/billingd/', ['ripple-account-inventory'], 'DIRECT_BACKEND_HANDLER_CHANGE', 'DIRECT_BACKEND_HANDLER', 'HIGH', ['ACCOUNT_INVENTORY', 'DATA_FETCH', 'PROTO_CONTRACT'], 'P1', 'Billing service implements ListBillingGroups and its supporting path', 'PREFIX'),
  edge('j3-blue-transport', 'mobingilabs/ouchan', 'pkg/blue/', ['ripple-account-inventory'], 'TRANSITIVE_DEPENDENCY_CHANGE', 'TRANSITIVE_DEPENDENCY', 'MEDIUM', ['NETWORK_API_TRANSPORT', 'PROTO_CONTRACT'], 'P2', 'billingd forwarding code imports the shared Blue connection helper', 'PREFIX'),
  edge('j3-blue-contract', 'alphauslabs/blueapi', 'billing/v1/billing.proto', ['ripple-account-inventory'], 'CONTRACT_CHANGE', 'CONTRACT_CHANGE', 'HIGH', ['PROTO_CONTRACT', 'ACCOUNT_INVENTORY', 'DATA_FETCH'], 'P1', 'Billing.ListBillingGroups streaming RPC and GET annotation', 'EXACT'),
  edge('j3-generated-client', 'alphauslabs/blue-sdk-go', 'billing/v1/', ['ripple-account-inventory'], 'CONTRACT_CHANGE', 'CONTRACT_CHANGE', 'HIGH', ['PROTO_CONTRACT', 'ACCOUNT_INVENTORY', 'NETWORK_API_TRANSPORT'], 'P1', 'Generated Billing client consumed by ouchan billingd', 'PREFIX'),
  edge('j3-parser', 'alphauslabs/grpc-chunk-parser', 'src/', ['ripple-account-inventory'], 'SHARED_API_TRANSPORT_CHANGE', 'SHARED_TRANSPORT', 'HIGH', ['NETWORK_API_TRANSPORT', 'RESOURCE_LOADING'], 'P0', 'parseGrpcData implementation imported by J3 admin streamPromise', 'PREFIX'),
];

export function dependencyMapVersion(): string {
  return DEPENDENCY_MAP_VERSION;
}
