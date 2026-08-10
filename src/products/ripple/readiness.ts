// ---------------------------------------------------------------------------
// Ripple authenticated readiness contract.
//
// Source provenance (mobingilabs/ripple-ui, branch dev, d80b161b...):
//   - vue-router base is /ripple/;
//   - authenticated / is redirected to /dashboard;
//   - public/index.html provides #app;
//   - src/main.js mounts Vue with vm.$mount('#app').
//
// Keep this contract structural and bounded to the configured Ripple path
// namespace. It must never depend on customer text, account values, or data.
// ---------------------------------------------------------------------------

export const RIPPLE_APP_ROOT_SELECTOR = '#app';

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
  appRootPresent: boolean;
}

/**
 * Structural readiness intentionally excludes network silence and page text.
 * The app root is required here, so a missing root is the upstream cause of a
 * structural-stability failure rather than a second independent failure.
 */
export function isRippleStructurallyReady(state: RippleStructuralState): boolean {
  return state.documentReadyState === 'complete' && state.appRootPresent;
}
