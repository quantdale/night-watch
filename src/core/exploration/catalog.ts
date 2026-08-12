import type { SafeAction } from './types';

const FORBIDDEN_LOCATOR_PATTERNS = /:nth-(?:child|last-child|of-type)|text\s*=|xpath\s*=|:has-text\(|customer|account[_-]?id|resource[_-]?id/i;

export function validateSafeActionCatalog(actions: readonly SafeAction[]): void {
  const ids = new Set<string>();
  for (const action of actions) {
    if (ids.has(action.actionId)) throw new Error(`duplicate safe action: ${action.actionId}`);
    ids.add(action.actionId);
    if (!/^[A-Za-z0-9_.-]{1,120}$/.test(action.actionId)) throw new Error(`non-canonical action ID: ${action.actionId}`);
    if (action.semanticClass !== 'KNOWN_READ' && action.semanticClass !== 'LOCAL_ONLY') {
      throw new Error(`unsafe semantic class: ${action.actionId}`);
    }
    if (action.persistedPreferenceEffect === 'SERVER_STATE') throw new Error(`server preference action: ${action.actionId}`);
    if (!action.forbiddenRequestFamilies.some((family) => family.includes('write'))) {
      throw new Error(`approved action has no forbidden mutation family: ${action.actionId}`);
    }
    if (action.semanticClass === 'KNOWN_READ' && action.expectedReadFamilies.length === 0) {
      throw new Error(`known-read action has no expected read family: ${action.actionId}`);
    }
    if (action.sourceProvenance.length === 0) throw new Error(`action has no source provenance: ${action.actionId}`);
    for (const provenance of action.sourceProvenance) {
      if (!/^[0-9a-f]{40}$/.test(provenance.sourceSha) && action.product === 'ripple') {
        throw new Error(`Ripple action source SHA is not complete: ${action.actionId}`);
      }
      if (provenance.freshness !== 'LOCAL_TRACKING_REF_ONLY' && provenance.freshness !== 'CURRENT_DEPLOYMENT_VERIFIED') {
        throw new Error(`unknown source freshness: ${action.actionId}`);
      }
    }
    const locatorText = JSON.stringify(action.locator);
    if (FORBIDDEN_LOCATOR_PATTERNS.test(locatorText)) throw new Error(`unstable or customer-specific locator: ${action.actionId}`);
    if (!action.preconditions.routeClasses.every((route) => route.startsWith('/') && !route.includes('?') && !route.includes('#'))) {
      throw new Error(`unsafe action route precondition: ${action.actionId}`);
    }
  }
}

export function approvedActions(actions: readonly SafeAction[]): readonly SafeAction[] {
  validateSafeActionCatalog(actions);
  return actions.filter((action) => action.status === 'APPROVED');
}
