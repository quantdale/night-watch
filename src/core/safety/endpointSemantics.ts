// ---------------------------------------------------------------------------
// Nightwatch — Ripple endpoint semantic registry (Phase 2A).
//
// HTTP method is not a read/write contract. Only source-backed, exact rules
// may classify an API endpoint as KNOWN_READ or KNOWN_MUTATION. The initial
// real-observation registry is intentionally empty: an encountered API call
// therefore remains UNKNOWN and is recorded without being deliberately
// replayed or invoked by Nightwatch.
// ---------------------------------------------------------------------------

import type { EnvironmentConfig } from '../environment/types';

export type EndpointSemanticClassification = 'KNOWN_READ' | 'KNOWN_MUTATION' | 'UNKNOWN';

export interface EndpointSemanticRule {
  id: string;
  host: string;
  method: string;
  path: string;
  classification: EndpointSemanticClassification;
  provenance: string;
}

/** No API semantics are asserted without a reviewed exact source-backed rule. */
export const RIPPLE_ENDPOINT_SEMANTIC_REGISTRY: readonly EndpointSemanticRule[] = [];

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
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return 'UNKNOWN';
  }
  if (!isApiHost(url, env)) return null;

  const normalizedMethod = method.toUpperCase();
  const rule = registry.find(
    (candidate) =>
      candidate.host.toLowerCase() === url.hostname.toLowerCase() &&
      candidate.method.toUpperCase() === normalizedMethod &&
      candidate.path === url.pathname,
  );
  return rule?.classification ?? 'UNKNOWN';
}

