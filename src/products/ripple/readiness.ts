// ---------------------------------------------------------------------------
// Ripple authenticated readiness contract.
//
// Source provenance (mobingilabs/ripple-ui, origin/dev, 0bba40b7...):
//   - vue-router base is /ripple/;
//   - authenticated / is redirected to /dashboard;
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
  ref: 'origin/dev',
  sha: '0bba40b749a1d79cd2b3b3f9eb1aba44e4b313a2',
  bootstrapMountSelector: RIPPLE_BOOTSTRAP_MOUNT_SELECTOR,
  renderedShellSelector: RIPPLE_RENDERED_SHELL_SELECTOR,
  renderedShellTagName: RIPPLE_RENDERED_SHELL_TAG_NAME,
  framework: {
    vue: '2.6.12',
    quasar: '1.15.4',
  },
  evidence: [
    'public/index.html:35',
    'src/main.js:2,48-52,324',
    'src/App.vue:1-5',
    'src/layouts/DefaultLayout.vue:1-2',
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
