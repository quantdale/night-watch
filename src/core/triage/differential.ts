// ---------------------------------------------------------------------------
// Browser/API app-layer differential.
// ---------------------------------------------------------------------------

import type { ApiObservation, BrowserApiDifferential, BrowserObservation } from './types';

export function compareBrowserAndApi(browser: BrowserObservation, api: ApiObservation | null): BrowserApiDifferential {
  if (api === null || !api.available || api.operationFamily !== browser.operationFamily) {
    return {
      status: 'NOT_AVAILABLE',
      appLayerDiscriminator: 'NOT_AVAILABLE',
      browserOperationFamily: browser.operationFamily,
      apiOperationFamily: api?.operationFamily ?? null,
      statusClassSame: null,
      contentTypeClassSame: null,
      routeClassSame: null,
      structuralStateSame: null,
      parseabilitySame: null,
      rootCauseClaim: 'NONE',
    };
  }
  const statusClassSame = browser.statusClass === api.statusClass;
  const contentTypeClassSame = browser.contentTypeClass === api.contentTypeClass;
  const parseabilitySame = api.parseCategory === 'valid' || api.parseCategory === 'json-valid' || api.parseCategory === 'ndjson-valid'
    ? !browser.failed
    : browser.failed;
  const routeClassSame = api.routeClass === undefined ? null : browser.routeClass === api.routeClass;
  const structuralStateSame = api.structuralState === undefined ? null : browser.structuralState === api.structuralState;
  const identicalFailure = browser.failed && api.failed && statusClassSame && contentTypeClassSame && browser.oracleFingerprint === api.oracleFingerprint;
  if (browser.failed && !api.failed) {
    return {
      status: 'UI_FAILURE_API_PASS',
      appLayerDiscriminator: 'UI_CLIENT_SIDE_STRONGER',
      browserOperationFamily: browser.operationFamily,
      apiOperationFamily: api.operationFamily,
      statusClassSame,
      contentTypeClassSame,
      routeClassSame,
      structuralStateSame,
      parseabilitySame,
      rootCauseClaim: 'NONE',
    };
  }
  if (identicalFailure) {
    return {
      status: 'BROWSER_API_FAILURE_AGREE',
      appLayerDiscriminator: 'API_SERVER_PROTOCOL_STRONGER',
      browserOperationFamily: browser.operationFamily,
      apiOperationFamily: api.operationFamily,
      statusClassSame,
      contentTypeClassSame,
      routeClassSame,
      structuralStateSame,
      parseabilitySame,
      rootCauseClaim: 'NONE',
    };
  }
  return {
    status: 'BROWSER_API_DIVERGE',
    appLayerDiscriminator: 'INCONCLUSIVE',
    browserOperationFamily: browser.operationFamily,
    apiOperationFamily: api.operationFamily,
    statusClassSame,
    contentTypeClassSame,
    routeClassSame,
    structuralStateSame,
    parseabilitySame,
    rootCauseClaim: 'NONE',
  };
}
