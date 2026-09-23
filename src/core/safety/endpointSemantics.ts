// ---------------------------------------------------------------------------
// Nightwatch — Ripple endpoint semantic registry.
//
// HTTP method is not a read/write contract. Only source-backed, exact rules
// may classify an API endpoint as KNOWN_READ or KNOWN_MUTATION. The initial
// the default registry remains intentionally empty. Product journey contracts
// supply a reviewed registry explicitly; unrelated observations therefore
// remain UNKNOWN and are never deliberately replayed or invoked.
// ---------------------------------------------------------------------------

import type { EnvironmentConfig } from '../environment/types';
import { ProvenRouteTable, safeRuleMarker } from './provenRoutes';

export type EndpointSemanticClassification = 'KNOWN_READ' | 'KNOWN_MUTATION' | 'UNKNOWN';

export interface EndpointSemanticRule {
  id: string;
  host: string;
  method: string;
  /** Exact URL pathname. */
  path?: string;
  /** Anchored source-reviewed pathname pattern for dynamic route segments. */
  pathPattern?: string;
  classification: EndpointSemanticClassification;
  provenance: string;
}

/** No API semantics are asserted without a reviewed exact source-backed rule. */
export const RIPPLE_ENDPOINT_SEMANTIC_REGISTRY: readonly EndpointSemanticRule[] = [];

export interface EndpointSemanticMatch {
  ruleId: string;
  classification: EndpointSemanticClassification;
}

function hostMatches(url: URL, configuredHost: string): boolean {
  const normalized = configuredHost.toLowerCase();
  const configured = normalized.includes(':') ? normalized : `${normalized}:${url.port || (url.protocol === 'https:' ? '443' : '80')}`;
  const actual = `${url.hostname.toLowerCase()}:${url.port || (url.protocol === 'https:' ? '443' : '80')}`;
  return configured === actual || normalized === url.hostname.toLowerCase();
}

function isApiHost(url: URL, env: EnvironmentConfig): boolean {
  return (env.apiHosts ?? []).some((host) => hostMatches(url, host));
}

function pathMatches(candidate: EndpointSemanticRule, pathname: string): boolean {
  if (candidate.path === pathname) return true;
  if (candidate.pathPattern === undefined) return false;
  // A semantic rule must describe the whole pathname. Substring matching
  // could silently classify a different customer/resource surface as the
  // reviewed endpoint and erase a meaningful replay divergence.
  if (!candidate.pathPattern.startsWith('^') || !candidate.pathPattern.endsWith('$')) return false;
  try {
    return new RegExp(candidate.pathPattern).test(pathname);
  } catch {
    // A malformed local registry entry is never allowed to classify traffic.
    return false;
  }
}

/**
 * NW-AUD-020: shared route-proof primitives. The semantic admission
 * authority (semanticAdmission.ts) resolves host and path membership through
 * THESE functions so no second, competing route-proof system exists.
 */
export function ruleHostMatches(url: URL, configuredHost: string): boolean {
  return hostMatches(url, configuredHost);
}

export function rulePathMatches(rule: EndpointSemanticRule, pathname: string): boolean {
  return pathMatches(rule, pathname);
}

/**
 * Classify one encountered API URL. `null` means it is not an API endpoint
 * for the selected environment and is intentionally omitted from semantic
 * endpoint reporting.
 */
export function classifyRippleEndpoint(
  rawUrl: string,
  method: string,
  env: EnvironmentConfig,
  registry: readonly EndpointSemanticRule[] = RIPPLE_ENDPOINT_SEMANTIC_REGISTRY,
): EndpointSemanticClassification | null {
  return matchRippleEndpoint(rawUrl, method, env, registry)?.classification ??
    (isApiUrl(rawUrl, env) ? 'UNKNOWN' : null);
}

/**
 * Return the reviewed rule identity as well as its semantic class. The rule
 * identity is metadata-only evidence; URL paths and query values are never
 * returned to callers for persistence.
 */
export function matchRippleEndpoint(
  rawUrl: string,
  method: string,
  env: EnvironmentConfig,
  registry: readonly EndpointSemanticRule[] = RIPPLE_ENDPOINT_SEMANTIC_REGISTRY,
): EndpointSemanticMatch | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ruleId: 'invalid-url', classification: 'UNKNOWN' };
  }
  if (!isApiHost(url, env)) return null;

  const normalizedMethod = method.toUpperCase();
  const rule = registry.find(
    (candidate) =>
      hostMatches(url, candidate.host) &&
      candidate.method.toUpperCase() === normalizedMethod &&
      pathMatches(candidate, url.pathname),
  );
  return rule === undefined
    ? { ruleId: 'unreviewed-api-endpoint', classification: 'UNKNOWN' }
    : { ruleId: rule.id, classification: rule.classification };
}

function isApiUrl(rawUrl: string, env: EnvironmentConfig): boolean {
  try {
    return isApiHost(new URL(rawUrl), env);
  } catch {
    return true;
  }
}


/**
 * NW-AUD-018 — build the proven route table that authenticated URL
 * persistence may quote. Exact `path` rules persist the path itself;
 * `pathPattern` rules persist the categorical `<RULE:id>` marker carrying
 * the proven rule identity — never a concrete matched path. Rules with
 * neither form, or with an unsafe rule id, fail closed (the rule cannot be
 * proven and must not silently degrade into a guess).
 */
export function provenRouteTableFromRules(
  registry: readonly EndpointSemanticRule[] = RIPPLE_ENDPOINT_SEMANTIC_REGISTRY,
): ProvenRouteTable {
  const inputs = registry.map((rule) => {
    if (rule.path !== undefined && rule.pathPattern === undefined) {
      return { pattern: `^${rule.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, emit: rule.path };
    }
    if (rule.pathPattern !== undefined) {
      const marker = safeRuleMarker(rule.id);
      if (marker === null) throw new Error('PROVEN_ROUTE_RULE_ID_UNSAFE');
      return { pattern: rule.pathPattern, emit: marker };
    }
    throw new Error('PROVEN_ROUTE_RULE_SHAPE_INVALID');
  });
  return ProvenRouteTable.bind(inputs);
}
