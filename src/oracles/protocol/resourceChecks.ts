// ---------------------------------------------------------------------------
// Nightwatch — resource-role and lifecycle oracle helpers.
//
// Resource delivery is not resource execution. These helpers classify only
// metadata already available to the observer; they never read or persist a
// response body. Optional asset failures remain visible without inheriting
// application-entry severity.
// ---------------------------------------------------------------------------

import type { EndpointSemanticClassification } from '../../core/safety/endpointSemantics';

export type ResourceRole =
  | 'MAIN_DOCUMENT'
  | 'APPLICATION_ENTRY'
  | 'CRITICAL_SCRIPT'
  | 'CRITICAL_STYLESHEET'
  | 'API_KNOWN_READ'
  | 'API_UNKNOWN'
  | 'FONT'
  | 'IMAGE'
  | 'OPTIONAL_RESOURCE'
  | 'THIRD_PARTY'
  | 'OTHER';

export type ResourceLifecycleState =
  | 'REQUESTED'
  | 'COMPLETED'
  | 'NETWORK_FAILED'
  | 'HTTP_FAILED'
  | 'CANCELED_BY_NAVIGATION'
  | 'CANCELED_BY_DOCUMENT_REPLACEMENT'
  | 'CANCELED_BY_BROWSER'
  | 'CANCELED_BY_POLICY'
  | 'UNRESOLVED';

export type ResourceImpact = 'BOOTSTRAP' | 'KNOWN_READ' | 'ASSET' | 'OPTIONAL' | 'BACKGROUND' | 'OTHER';

export interface ResourceRoleInput {
  url: string;
  resourceType: string;
  endpointClassification?: EndpointSemanticClassification | null;
  targetOrigin?: string;
}

export interface ResourceStatusOracleInput {
  status: number;
  role: ResourceRole;
  url: string;
}

export interface ResourceStatusOracleResult {
  type: 'unexpected-status';
  severity: 'error' | 'warn';
  oracleSeverity: 'anomaly';
  protocolExpected: 'http-status';
  protocolObserved: 'unexpected-status';
  resourceRole: ResourceRole;
  impact: ResourceImpact;
  message: string;
}

export interface ContentTypeOracleResult {
  type: 'wrong-content-type';
  severity: 'error' | 'warn';
  oracleSeverity: 'anomaly';
  resourceRole: ResourceRole;
  impact: ResourceImpact;
  expected: string;
  observed: string;
  message: string;
}

function sameOrigin(url: string, targetOrigin: string | undefined): boolean {
  if (targetOrigin === undefined) return true;
  try {
    return new URL(url).origin === targetOrigin;
  } catch {
    return false;
  }
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return '';
  }
}

export function classifyResourceRole(input: ResourceRoleInput): ResourceRole {
  if (input.endpointClassification === 'KNOWN_READ') return 'API_KNOWN_READ';
  if (input.endpointClassification === 'UNKNOWN' &&
      (input.resourceType === 'fetch' || input.resourceType === 'xhr' || /^\/m\//i.test(pathOf(input.url)) || /^\/api\//i.test(pathOf(input.url)))) return 'API_UNKNOWN';
  if (input.resourceType === 'document') return 'MAIN_DOCUMENT';
  const path = pathOf(input.url);
  const local = sameOrigin(input.url, input.targetOrigin);
  if (input.resourceType === 'font' || /\.(?:woff2?|ttf|otf|eot)(?:$|\?)/i.test(path)) return 'FONT';
  if (input.resourceType === 'image' || /\.(?:png|jpe?g|gif|svg|webp|ico)(?:$|\?)/i.test(path)) return local ? 'IMAGE' : 'THIRD_PARTY';
  if (input.resourceType === 'stylesheet' || /\.css(?:$|\?)/i.test(path)) return local ? 'CRITICAL_STYLESHEET' : 'OPTIONAL_RESOURCE';
  if (input.resourceType === 'script' || input.resourceType === 'module' || /\.m?js(?:$|\?)/i.test(path)) {
    if (!local) return 'THIRD_PARTY';
    if (/\/static\/js\/app(?:\.[^/]+)?\.m?js$/i.test(path)) return 'APPLICATION_ENTRY';
    return 'CRITICAL_SCRIPT';
  }
  if (!local) return 'THIRD_PARTY';
  return 'OTHER';
}

export function resourceImpact(role: ResourceRole): ResourceImpact {
  if (role === 'MAIN_DOCUMENT' || role === 'APPLICATION_ENTRY' || role === 'CRITICAL_SCRIPT' || role === 'CRITICAL_STYLESHEET') return 'BOOTSTRAP';
  if (role === 'API_KNOWN_READ') return 'KNOWN_READ';
  if (role === 'FONT' || role === 'IMAGE') return 'ASSET';
  if (role === 'OPTIONAL_RESOURCE' || role === 'THIRD_PARTY') return 'OPTIONAL';
  return 'OTHER';
}

export function checkResourceStatus(input: ResourceStatusOracleInput): ResourceStatusOracleResult | null {
  if (input.status < 500) return null;
  const impact = resourceImpact(input.role);
  return {
    type: 'unexpected-status',
    severity: impact === 'OPTIONAL' || impact === 'ASSET' ? 'warn' : 'error',
    oracleSeverity: 'anomaly',
    protocolExpected: 'http-status',
    protocolObserved: 'unexpected-status',
    resourceRole: input.role,
    impact,
    message: `unexpected-status: HTTP ${input.status} for ${input.url}`,
  };
}

function expectedContentType(role: ResourceRole): RegExp | null {
  if (role === 'MAIN_DOCUMENT') return /html/i;
  if (role === 'APPLICATION_ENTRY' || role === 'CRITICAL_SCRIPT') return /(?:java|ecma)script/i;
  if (role === 'CRITICAL_STYLESHEET') return /css/i;
  if (role === 'API_KNOWN_READ') return /json/i;
  if (role === 'FONT') return /font|octet-stream/i;
  return null;
}

export function checkResourceContentType(
  role: ResourceRole,
  status: number,
  contentType: string | undefined,
  url: string,
): ContentTypeOracleResult | null {
  if (status < 200 || status >= 300) return null;
  const expected = expectedContentType(role);
  if (expected === null || contentType === undefined || expected.test(contentType)) return null;
  const impact = resourceImpact(role);
  return {
    type: 'wrong-content-type',
    severity: impact === 'OPTIONAL' || impact === 'ASSET' ? 'warn' : 'error',
    oracleSeverity: 'anomaly',
    resourceRole: role,
    impact,
    expected: role === 'API_KNOWN_READ' ? 'application/json' : role === 'FONT' ? 'font-or-binary' : role === 'CRITICAL_STYLESHEET' ? 'text/css' : role === 'MAIN_DOCUMENT' ? 'text/html' : 'javascript',
    observed: contentType.split(';', 1)[0]?.trim().toLowerCase() ?? 'unknown',
    message: `wrong-content-type: ${url}`,
  };
}

export function classifyRequestFailure(errorText: string, wasNavigation: boolean): ResourceLifecycleState {
  if (/ERR_ABORTED|inspector/i.test(errorText)) return wasNavigation ? 'CANCELED_BY_NAVIGATION' : 'CANCELED_BY_BROWSER';
  if (/ERR_BLOCKED_BY_CLIENT/i.test(errorText)) return 'CANCELED_BY_POLICY';
  return 'NETWORK_FAILED';
}
