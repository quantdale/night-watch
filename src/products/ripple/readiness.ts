// ---------------------------------------------------------------------------
// Ripple authenticated readiness contract.
//
// Source provenance (mobingilabs/ripple-ui, origin/dev, 0bba40b7...):
//   - vue-router base is /ripple/;
//   - authenticated / is redirected to /dashboard;
//   - public/index.html provides #app;
//   - src/main.js mounts Vue with vm.$mount('#app').
//
// Keep this contract structural and bounded to the configured Ripple path
// namespace. It must never depend on customer text, account values, or data.
// ---------------------------------------------------------------------------

export const RIPPLE_APP_ROOT_SELECTOR = '#app';

/**
 * The source reference used for the current authenticated readiness contract.
 * This is deliberately explicit so a runtime result can be compared with the
 * source contract that was actually reviewed, instead of silently relying on
 * an older checkout.
 */
export const RIPPLE_SOURCE_ROOT_CONTRACT = {
  status: 'CURRENT_SOURCE_STILL_USES_APP',
  repository: 'mobingilabs/ripple-ui',
  ref: 'origin/dev',
  sha: '0bba40b749a1d79cd2b3b3f9eb1aba44e4b313a2',
  selector: RIPPLE_APP_ROOT_SELECTOR,
  evidence: ['public/index.html:35', 'src/main.js:48,324'],
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
  appRootSelector: string;
  appRootPresent: boolean;
}

/**
 * Structural readiness intentionally excludes network silence and page text.
 * The app root is required here, so a missing root is the upstream cause of a
 * structural-stability failure rather than a second independent failure.
 */
export function isRippleStructurallyReady(state: RippleStructuralState): boolean {
  return state.documentReadyState === 'complete' &&
    state.appRootSelector === RIPPLE_APP_ROOT_SELECTOR &&
    state.appRootPresent;
}

export type RippleReadinessDiagnosis =
  | 'READY'
  | 'EARLY_DOCUMENT_OR_NAVIGATION'
  | 'WRONG_DOCUMENT_OR_PAGE'
  | 'ROOT_PRESENT_ONLY_IN_CHILD_FRAME'
  | 'DOCUMENT_OR_PAGE_UNAVAILABLE'
  | 'SHELL_MOUNT_OR_DEPLOYMENT_DIVERGENCE_UNRESOLVED';

export interface RippleReadinessDiagnosisInput extends RippleStructuralState {
  targetConfirmed: boolean;
  bodyPresent: boolean;
  appRootFrameCount: number;
  evaluationSucceeded: boolean;
  navigationInProgress: boolean;
  pageClosed: boolean;
}

/**
 * Classify only the sanitized structural signals. This is diagnostic metadata,
 * not a readiness override: the caller still requires all three independent
 * target/root/stability signals to pass. Persistent main-frame root absence is
 * intentionally left unresolved between a shell mount failure and
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
  if (input.appRootPresent && isRippleStructurallyReady(input)) return 'READY';
  if (input.appRootFrameCount > 0) return 'ROOT_PRESENT_ONLY_IN_CHILD_FRAME';
  return 'SHELL_MOUNT_OR_DEPLOYMENT_DIVERGENCE_UNRESOLVED';
}
