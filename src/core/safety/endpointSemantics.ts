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
      (candidate.path === url.pathname ||
        (candidate.pathPattern !== undefined && new RegExp(candidate.pathPattern).test(url.pathname))),
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
