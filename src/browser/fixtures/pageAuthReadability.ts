// ---------------------------------------------------------------------------
// Nightwatch — live page-side Ripple authentication semantics.
//
// This module evaluates only fixed, source-defined cookie predicates in the
// page. It never returns document.cookie, a cookie value, or page text.
// ---------------------------------------------------------------------------

import type { Page } from '@playwright/test';
import {
  RIPPLE_SOURCE_BOOTSTRAP_STATE_CONTRACT,
} from '../../products/ripple/bootstrapContract';
import { RIPPLE_SOURCE_SEMANTIC_CONTRACT } from '../../products/ripple/readiness';

// Phase 15P A15 convergence: module-private (no external callers).
type RipplePageBootstrapSemantics = 'VALID' | 'INVALID' | 'UNRESOLVED';

export interface RipplePageAuthReadability {
  evaluationSucceeded: boolean;
  tokenPageReadable: boolean;
  tokenNonEmpty: boolean;
  apiTypePageVisible: boolean;
  apiTypeMatchesDev: boolean;
  appTypePageVisible: boolean;
  appTypeMatchesRipple: boolean;
  aggregatePageBootstrapSemantics: RipplePageBootstrapSemantics;
  basis: 'page-javascript-document-cookie' | 'page-evaluation-unavailable';
}

export function unavailableRipplePageAuthReadability(): RipplePageAuthReadability {
  return {
    evaluationSucceeded: false,
    tokenPageReadable: false,
    tokenNonEmpty: false,
    apiTypePageVisible: false,
    apiTypeMatchesDev: false,
    appTypePageVisible: false,
    appTypeMatchesRipple: false,
    aggregatePageBootstrapSemantics: 'UNRESOLVED',
    basis: 'page-evaluation-unavailable',
  };
}

/**
 * Prove fixed Ripple bootstrap-cookie visibility from the live page runtime.
 * The evaluator reduces document.cookie to booleans before crossing the page
 * boundary, so no cookie value can enter Nightwatch evidence.
 */
export async function inspectRipplePageAuthReadability(page: Page): Promise<RipplePageAuthReadability> {
  const authTokenKey = RIPPLE_SOURCE_BOOTSTRAP_STATE_CONTRACT.auth[0].key;
  const apiTypeKey = RIPPLE_SOURCE_BOOTSTRAP_STATE_CONTRACT.environmentSelection[0].key;
  const appTypeKey = RIPPLE_SOURCE_BOOTSTRAP_STATE_CONTRACT.environmentSelection[1].key;
  const apiTypeExpected = RIPPLE_SOURCE_SEMANTIC_CONTRACT.selectedDev.apiType;
  const appTypeExpected = RIPPLE_SOURCE_SEMANTIC_CONTRACT.selectedDev.appType;

  try {
    const result = await page.evaluate(
      ({ authTokenKey: tokenKey, apiTypeKey: environmentKey, appTypeKey: applicationKey, apiTypeExpected: expectedEnvironment, appTypeExpected: expectedApplication }) => {
        const pageGlobal = globalThis as unknown as { document?: { cookie?: unknown } };
        const cookieString = typeof pageGlobal.document?.cookie === 'string' ? pageGlobal.document.cookie : '';
        const cookieValue = (name: string): string | null => {
          const prefix = `${name}=`;
          const entry = cookieString
            .split(';')
            .map((part: string) => part.trim())
            .find((part: string) => part.startsWith(prefix));
          return entry === undefined ? null : entry.slice(prefix.length);
        };
        const tokenValue = cookieValue(tokenKey);
        const environmentValue = cookieValue(environmentKey);
        const applicationValue = cookieValue(applicationKey);
        const tokenPageReadable = tokenValue !== null;
        const tokenNonEmpty = tokenPageReadable && tokenValue.length > 0;
        const apiTypePageVisible = environmentValue !== null;
        const appTypePageVisible = applicationValue !== null;
        const apiTypeMatchesDev = apiTypePageVisible && environmentValue === expectedEnvironment;
        const appTypeMatchesRipple = appTypePageVisible && applicationValue === expectedApplication;
        const aggregatePageBootstrapSemantics: RipplePageBootstrapSemantics =
          !tokenNonEmpty || (apiTypePageVisible && !apiTypeMatchesDev) || (appTypePageVisible && !appTypeMatchesRipple)
            ? 'INVALID'
            : 'VALID';
        return {
          tokenPageReadable,
          tokenNonEmpty,
          apiTypePageVisible,
          apiTypeMatchesDev,
          appTypePageVisible,
          appTypeMatchesRipple,
          aggregatePageBootstrapSemantics,
        };
      },
      { authTokenKey, apiTypeKey, appTypeKey, apiTypeExpected, appTypeExpected },
    );
    return {
      evaluationSucceeded: true,
      ...result,
      basis: 'page-javascript-document-cookie',
    };
  } catch {
    return unavailableRipplePageAuthReadability();
  }
}
