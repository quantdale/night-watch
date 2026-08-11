// ---------------------------------------------------------------------------
// Ripple authenticated readiness contract.
//
// Source provenance (mobingilabs/ripple-ui, checked-out dev, d80b161b...;
// local origin/dev comparison e46b8ed6...):
//   - vue-router base is /ripple/;
//   - the dashboard record aliases /; the guard's authenticated root branch
//     calls next(), while /login with a token explicitly redirects to /dashboard;
//   - public/index.html provides #app;
//   - src/main.js renders App and mounts Vue with vm.$mount('#app');
//   - App delegates authenticated routes to DefaultLayout;
//   - DefaultLayout's QLayout renders a container DIV carrying the static
//     `layout` class.
//
// Keep this contract structural and bounded to the configured Ripple path
// namespace. It must never depend on customer text, account values, or data.
// ---------------------------------------------------------------------------

/** The pre-bootstrap element declared by public/index.html. */
export const RIPPLE_BOOTSTRAP_MOUNT_SELECTOR = '#app';

/**
 * Source-backed root branches immediately below App.vue. These selectors are
 * the complete static vocabulary used by the structural post-mount observer;
 * runtime class names and text are never collected.
 */
export const RIPPLE_SOURCE_ROOT_SELECTORS = {
  loadingWrapper: '.loading-div',
  authLayout: '.__AuthLayout',
  qLayout: '.q-layout-container',
  defaultLayout: '.q-layout-container.layout',
} as const;

export type RippleRootRenderBranch =
  | 'loading-wrapper'
  | 'auth-layout'
  | 'default-layout'
  | 'q-layout'
  | 'comment-vnode'
  | 'text-node'
  | 'none'
  | 'unknown-element'
  | 'unknown';

/**
 * Exact source graph between Vue's mount call and the source-backed shell.
 * These are descriptive facts for diagnostics; they do not participate in
 * readiness evaluation and contain no runtime values.
 */
export const RIPPLE_SOURCE_ROOT_RENDER_CONTRACT = {
  mount: {
    symbol: 'new Vue(...).$mount',
    file: 'src/main.js:48-52,324',
    timing: 'synchronous Vue root construction; root created hook runs before the initial patch',
    dependencies: ['Vue 2.6.12', 'store injection', 'router injection', 'i18n injection'],
  },
  rootRender: {
    symbol: 'render: h => h(App)',
    file: 'src/main.js:48-52',
    timing: 'synchronous VNode creation',
    condition: 'unconditional root render',
  },
  app: {
    symbol: 'App template',
    file: 'src/App.vue:1-5,18-26',
    branches: [
      {
        branch: 'loading-wrapper',
        condition: 'Vuex root state.loading === true',
        selector: '.loading-div',
        dependency: 'root store loading state',
      },
      {
        branch: 'dynamic-layout',
        condition: 'root state.loading === false',
        symbol: 'layout = (this.$route.meta.layout || "default") + "-layout"',
        dependency: 'resolved router route meta plus global layout registration',
      },
    ],
  },
  layoutSelection: {
    file: 'src/main.js:38-40; src/router.js:278-333',
    branches: {
      default: 'DefaultLayout; authenticated routes omit meta.layout',
      auth: 'AuthLayout; login/SAML/change-password routes set meta.layout=auth',
      error: 'ErrorLayout; error and wildcard routes set meta.layout=error',
    },
  },
  defaultLayout: {
    symbol: 'DefaultLayout -> QLayout',
    file: 'src/layouts/DefaultLayout.vue:1-2',
    condition: 'dynamic layout resolves to default-layout',
    selector: '.q-layout-container.layout',
    dependencies: ['Quasar 1.15.4 QLayout', 'router-view slot content', 'store-backed layout children'],
  },
  falseBranch: {
    file: 'src/App.vue:1-5; src/layouts/ErrorLayout.vue:1-3',
    result: 'loading wrapper, comment/text/unknown element, or an intermediate layout may exist without QLayout',
    commentVNodeSourceCondition: 'defensive only: an unresolved dynamic layout or router-view with no resolved component; current route table registers default/auth/error layouts and does not prove this branch',
  },
} as const;

/** The current source constructs Vue Router in history mode. */
export const RIPPLE_SOURCE_ROUTER_CONTRACT = {
  mode: 'history',
  base: '/ripple/',
  dashboardPath: '/dashboard',
  dashboardAlias: '/',
  authenticatedLandingPath: '/ripple/dashboard',
  baseToDashboardUrlRedirectUnconditional: false,
  rootAliasMechanism: 'dashboard route record aliases /; authenticated guard calls next() when token is present',
  explicitLoginTokenRedirect: '/login -> /dashboard when a token is present',
  permissionAfterEachRedirect: 'afterEach may router.push(/dashboard) when handleByPermission(to.path) is false',
  beforeResolve: false,
  dynamicRouteRegistration: false,
  source: 'src/router.js:270-274,300-333,1383-1462; src/permissions.js:80-116',
} as const;

/**
 * Small semantic domains derived from the current Ripple source. Values are
 * used only by synthetic semantic-validation tests; real authenticated runs
 * continue to use presence-only storage-state inspection in this phase.
 */
export const RIPPLE_SOURCE_SEMANTIC_CONTRACT = {
  selectedDev: {
    environment: 'dev',
    application: 'alphaus',
    apiType: 'dev',
    appType: 'alphaus',
  },
  authCookie: 'mo_access_token',
  authCookieRequirement: 'truthy/non-empty cookie value',
  source: 'src/axios.config.lib.js:8-19; src/config/common.js:170-178; src/vuex/api/auth.js:84-90',
} as const;

/**
 * The source-defined post-mount checkpoint contract. This is descriptive
 * metadata for reports; it does not participate in readiness evaluation.
 */
export const RIPPLE_POST_MOUNT_CHECKPOINT_CONTRACT = [
  {
    id: 'VUE_INITIAL_PATCH',
    observable: true,
    sourceBasis: 'Vue 2 non-hydrating $mount replaces public/index.html #app',
    successMeaning: 'the pre-mount target was removed and a replacement boundary was observed',
    failureMeaning: 'the pre-mount target remained or replacement metadata was unavailable',
    containsCustomerData: false,
  },
  {
    id: 'ROOT_RENDER_BRANCH',
    observable: true,
    sourceBasis: 'src/App.vue loading v-if and dynamic layout component',
    successMeaning: 'the immediate replacement matches a source-approved root branch',
    failureMeaning: 'the replacement is a comment/text/unknown element or no replacement was observed',
    containsCustomerData: false,
  },
  {
    id: 'ROUTER_INITIALIZED',
    observable: false,
    sourceBasis: 'src/main.js injects router; src/router.js constructs Router',
    successMeaning: 'not directly claimed from browser primitives; route evidence is reported separately',
    failureMeaning: 'not directly observable without monkeypatching Ripple internals',
    containsCustomerData: false,
  },
  {
    id: 'INITIAL_ROUTE_RESOLVED',
    observable: true,
    sourceBasis: 'history-mode URL/path and fixed route-transition primitives',
    successMeaning: 'a source-approved initial/redirected route path was observed',
    failureMeaning: 'the expected dashboard path was not observed or navigation remained unresolved',
    containsCustomerData: false,
  },
  {
    id: 'DEFAULT_LAYOUT_RENDERED',
    observable: true,
    sourceBasis: 'src/App.vue default layout branch; src/layouts/DefaultLayout.vue',
    successMeaning: 'the source-backed default layout marker was present',
    failureMeaning: 'the default layout marker was absent',
    containsCustomerData: false,
  },
  {
    id: 'Q_LAYOUT_RENDERED',
    observable: true,
    sourceBasis: 'Quasar 1.15.4 QLayout container root',
    successMeaning: 'the QLayout structural marker was present',
    failureMeaning: 'the QLayout structural marker was absent',
    containsCustomerData: false,
  },
  {
    id: 'DASHBOARD_ROUTE_ACTIVE',
    observable: true,
    sourceBasis: 'src/router.js dashboard path /dashboard',
    successMeaning: 'the sanitized pathname was /ripple/dashboard',
    failureMeaning: 'the sanitized pathname was not /ripple/dashboard',
    containsCustomerData: false,
  },
  {
    id: 'ROUTE_STABLE_750MS',
    observable: true,
    sourceBasis: 'Nightwatch structural readiness contract',
    successMeaning: 'document complete, shell present, and route unchanged continuously for at least 750 ms',
    failureMeaning: 'any required readiness signal was absent or interrupted',
    containsCustomerData: false,
  },
] as const;

/**
 * The authenticated Ripple shell rendered after Vue replaces the bootstrap
 * mount target. DefaultLayout passes the static `layout` class to Quasar's
 * containerized QLayout, whose root DOM element is a DIV with the stable
 * `q-layout-container` class.
 */
export const RIPPLE_RENDERED_SHELL_SELECTOR = '.q-layout-container.layout';
export const RIPPLE_RENDERED_SHELL_TAG_NAME = 'DIV';

/**
 * Source references used for the current authenticated readiness contract.
 * This is deliberately explicit so a runtime result can be compared with the
 * source/framework contract that was actually reviewed, instead of silently
 * relying on an older checkout or treating the bootstrap placeholder as the
 * post-mount shell.
 */
export const RIPPLE_SOURCE_SHELL_CONTRACT = {
  status: 'APP_IS_PREMOUNT_TARGET_ONLY',
  repository: 'mobingilabs/ripple-ui',
  ref: 'dev',
  sha: 'd80b161b684d9153c7e5acaa65ae1752d93d8ba9',
  comparisonRef: 'origin/dev',
  comparisonSha: 'e46b8ed6540b647574bdb96ec59eca42fc8acdef',
  bootstrapMountSelector: RIPPLE_BOOTSTRAP_MOUNT_SELECTOR,
  renderedShellSelector: RIPPLE_RENDERED_SHELL_SELECTOR,
  renderedShellTagName: RIPPLE_RENDERED_SHELL_TAG_NAME,
  rootSelectors: RIPPLE_SOURCE_ROOT_SELECTORS,
  rootRenderContract: RIPPLE_SOURCE_ROOT_RENDER_CONTRACT,
  router: RIPPLE_SOURCE_ROUTER_CONTRACT,
  semanticContract: RIPPLE_SOURCE_SEMANTIC_CONTRACT,
  framework: {
    vue: '2.6.12',
    quasar: '1.15.4',
  },
  evidence: [
    'public/index.html:35',
    'src/main.js:2,48-52,324',
    'src/App.vue:1-5',
    'src/layouts/DefaultLayout.vue:1-2',
    'src/components/uikit/Loading.vue:1-12',
    'src/layouts/AuthLayout.vue:1-5',
    'src/router.js:270-274,323-332,1385-1462',
    'package-lock.json:vue@2.6.12',
    'package-lock.json:quasar@1.15.4',
  ],
} as const;

function normalizedNamespace(pathname: string): string {
  const path = pathname === '' ? '/' : pathname;
  return path.endsWith('/') ? path : `${path}/`;
}

/**
 * Return true only for the configured Ripple entry path or a route beneath
 * that source-proven path namespace. The trailing slash prevents /rippled
 * from being accepted as a Ripple route.
 */
export function isRippleRoutePath(configuredPath: string, actualPath: string): boolean {
  if (configuredPath === '/') return actualPath === '/';
  const namespace = normalizedNamespace(configuredPath);
  return actualPath === namespace || actualPath.startsWith(namespace);
}

/**
 * Final target confirmation is origin-exact plus source-proven Ripple route
 * namespace. Auth-host redirects, production hosts, unknown hosts, and
 * unrelated same-host paths are not final Ripple readiness.
 */
export function confirmsRippleTarget(
  configuredOrigin: string,
  configuredPath: string,
  actualOrigin: string,
  actualPath: string,
): boolean {
  return configuredOrigin === actualOrigin && isRippleRoutePath(configuredPath, actualPath);
}

export interface RippleStructuralState {
  documentReadyState: string;
  bootstrapMountSelector: string;
  renderedShellSelector: string;
  renderedShellPresent: boolean;
}

/**
 * Structural readiness intentionally excludes network silence and page text.
 * The rendered shell is required here. The bootstrap mount target is not part
 * of readiness because Vue 2 replaces it during a normal client-side mount.
 */
export function isRippleStructurallyReady(state: RippleStructuralState): boolean {
  return state.documentReadyState === 'complete' &&
    state.bootstrapMountSelector === RIPPLE_BOOTSTRAP_MOUNT_SELECTOR &&
    state.renderedShellSelector === RIPPLE_RENDERED_SHELL_SELECTOR &&
    state.renderedShellPresent;
}

export type RippleReadinessDiagnosis =
  | 'READY'
  | 'EARLY_DOCUMENT_OR_NAVIGATION'
  | 'WRONG_DOCUMENT_OR_PAGE'
  | 'SHELL_PRESENT_ONLY_IN_CHILD_FRAME'
  | 'DOCUMENT_OR_PAGE_UNAVAILABLE'
  | 'SHELL_MOUNT_OR_DEPLOYMENT_DIVERGENCE_UNRESOLVED';

export interface RippleReadinessDiagnosisInput extends RippleStructuralState {
  targetConfirmed: boolean;
  bodyPresent: boolean;
  renderedShellFrameCount: number;
  evaluationSucceeded: boolean;
  navigationInProgress: boolean;
  pageClosed: boolean;
}

/**
 * Classify only the sanitized structural signals. This is diagnostic metadata,
 * not a readiness override: the caller still requires all three independent
 * target/shell/stability signals to pass. Persistent main-frame shell absence
 * is intentionally left unresolved between a shell mount failure and
 * deployment/source divergence.
 */
export function classifyRippleReadiness(input: RippleReadinessDiagnosisInput): RippleReadinessDiagnosis {
  if (input.pageClosed || !input.evaluationSucceeded || !input.bodyPresent) {
    return 'DOCUMENT_OR_PAGE_UNAVAILABLE';
  }
  if (input.navigationInProgress || input.documentReadyState !== 'complete') {
    return 'EARLY_DOCUMENT_OR_NAVIGATION';
  }
  if (!input.targetConfirmed) return 'WRONG_DOCUMENT_OR_PAGE';
  if (input.renderedShellPresent && isRippleStructurallyReady(input)) return 'READY';
  if (input.renderedShellFrameCount > 0) return 'SHELL_PRESENT_ONLY_IN_CHILD_FRAME';
  return 'SHELL_MOUNT_OR_DEPLOYMENT_DIVERGENCE_UNRESOLVED';
}
