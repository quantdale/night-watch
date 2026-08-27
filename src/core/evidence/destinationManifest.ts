// ---------------------------------------------------------------------------
// Nightwatch — sanitized real-runtime destination manifest (Phase 2A).
//
// The manifest records host-level transport facts only. URL paths, query
// values, headers, bodies, and browser-visible text are never part of it.
// Browser-denied attempts are merged with outer-proxy observations so a
// destination blocked before DNS/TCP still appears in the review.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import type { EnvironmentConfig } from '../environment/types';
import type { RunEvent } from './types';
import type { ProxyEvent, ProxyProtocol } from '../../proxy/types';
import {
  isBrowserBackgroundClassification,
  semanticClassificationForHostClass,
  type SemanticClassification,
} from '../safety/types';

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
type DestinationCategory = 'EXPECTED' | 'NEW_BUT_VERIFIED' | 'BLOCKED' | 'UNRESOLVED';

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface DestinationManifestEntry {
  hostname: string;
  protocol: string;
  environmentClassification: string;
  semanticClassification: SemanticClassification;
  policyRule: string;
  observedPurpose: string;
  decision: string;
  containmentViolation: boolean;
  requestCount: number;
}
export interface DestinationManifest {
  environment: string;
  source: 'REAL_RUNTIME_OBSERVATION';
  expected: DestinationManifestEntry[];
  newButVerified: DestinationManifestEntry[];
  blocked: DestinationManifestEntry[];
  unresolved: DestinationManifestEntry[];
}

interface Observation {
  hostname: string;
  protocol: string;
  classification: string;
  semanticClassification: SemanticClassification;
  decision: string;
  ruleId: string;
  purpose: string;
  containmentViolation: boolean;
  source: 'proxy' | 'browser';
}

function hostOnly(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function protocolFromUrl(rawUrl: string): string {
  try {
    return new URL(rawUrl).protocol.replace(':', '');
  } catch {
    return 'unknown';
  }
}

function hostEntryMatches(host: string, entry: string): boolean {
  const normalized = entry.toLowerCase();
  return normalized.startsWith('*.') ? host.endsWith(normalized.slice(1)) : host === normalized.replace(/:\d+$/, '');
}

function inEntries(host: string, entries: readonly string[]): boolean {
  return entries.some((entry) => hostEntryMatches(host, entry));
}

function purposeForHost(host: string, env: EnvironmentConfig): string {
  if (hostEntryMatches(host, new URL(env.uiBaseUrl).hostname)) return 'ui-navigation';
  if (inEntries(host, env.authHosts ?? [])) return 'authentication';
  if (inEntries(host, env.apiHosts ?? [])) return 'api';
  if (inEntries(host, env.staticAssetHosts)) return 'static-asset';
  if (inEntries(host, env.optionalThirdPartySupportHosts ?? [])) return 'optional-support-chat';
  const browserBackground = env.browserBackgroundHosts?.find((entry) => entry.host.toLowerCase() === host);
  if (browserBackground !== undefined) return browserBackground.classification.toLowerCase().replaceAll('_', '-');
  if (inEntries(host, env.telemetryHosts)) return 'telemetry';
  return 'unclassified';
}

function environmentClassification(classification: string): string {
  if (classification === 'dev' || classification === 'next') return classification;
  if (classification === 'production') return 'production';
  if (classification === 'telemetry') return 'telemetry';
  if (classification === 'optional-third-party-support') return 'optional-third-party-support';
  if (classification === 'browser-background-google') return 'browser-background-google';
  if (classification === 'browser-background-update') return 'browser-background-update';
  if (classification === 'browser-background-download') return 'browser-background-download';
  if (classification === 'static') return 'static';
  if (classification === 'local') return 'local';
  return 'unknown';
}

function categoryFor(observation: Observation, env: EnvironmentConfig, verified: ReadonlySet<string>): DestinationCategory {
  if (
    observation.decision === 'block-telemetry' ||
    observation.decision === 'block-optional-support' ||
    observation.decision === 'block-browser-background'
  ) return 'BLOCKED';
  if (observation.containmentViolation) return 'BLOCKED';
  if (observation.decision === 'deny') {
    return observation.classification === 'production' ? 'BLOCKED' : 'UNRESOLVED';
  }
  if (verified.has(observation.hostname)) return 'NEW_BUT_VERIFIED';
  return inEntries(observation.hostname, [
    ...env.allowedHosts,
    ...env.staticAssetHosts,
    ...env.telemetryHosts,
  ])
    ? 'EXPECTED'
    : 'UNRESOLVED';
}

function fromProxy(event: ProxyEvent, env: EnvironmentConfig): Observation {
  return {
    hostname: event.host.toLowerCase(),
    protocol: event.protocol,
    classification: event.classification,
    semanticClassification:
      event.semanticClassification ?? semanticClassificationForHostClass(event.classification),
    decision: event.decision,
    ruleId: event.ruleId,
    purpose: purposeForHost(event.host.toLowerCase(), env),
    containmentViolation: event.containmentViolation !== undefined,
    source: 'proxy',
  };
}

function fromBrowserEvent(event: RunEvent, env: EnvironmentConfig): Observation | null {
  if (event.type !== 'request' && event.type !== 'telemetry' && event.type !== 'optional-support' && event.type !== 'browser-background' && event.type !== 'hard-failure') return null;
  const rawUrl = event.data?.url;
  if (typeof rawUrl !== 'string') return null;
  const hostname = hostOnly(rawUrl);
  if (hostname === null) return null;
  const decision = typeof event.data?.verdict === 'string'
    ? event.data.verdict
    : event.type === 'telemetry'
      ? 'block-telemetry'
      : event.type === 'optional-support'
        ? 'block-optional-support'
        : event.type === 'browser-background'
          ? 'block-browser-background'
      : 'deny';
  const classification = typeof event.data?.hostClass === 'string' ? event.data.hostClass : 'unknown-alphaus';
  const semanticClassification = typeof event.data?.classification === 'string' && isBrowserBackgroundClassification(event.data.classification)
    ? event.data.classification
    : classification === 'telemetry'
      ? 'TELEMETRY'
      : classification === 'optional-third-party-support'
        ? 'OPTIONAL_THIRD_PARTY_SUPPORT'
        : classification === 'production'
          ? 'PRODUCTION_DENIED'
          : classification === 'dev' || classification === 'next' || classification === 'local' || classification === 'static' || classification === 'internal'
            ? 'EXPECTED'
            : 'UNKNOWN';
  return {
    hostname,
    protocol: protocolFromUrl(rawUrl),
    classification,
    semanticClassification,
    decision,
    ruleId: 'browser-policy',
    purpose: purposeForHost(hostname, env),
    containmentViolation: false,
    source: 'browser',
  };
}

/** Build a deterministic host-level manifest from sanitized runtime facts. */
export function buildDestinationManifest(
  env: EnvironmentConfig,
  proxyEvents: readonly ProxyEvent[],
  browserEvents: readonly RunEvent[],
  verifiedHosts: readonly string[] = []
): DestinationManifest {
  const verified = new Set(verifiedHosts.map((host) => host.toLowerCase()));
  const observations: Observation[] = proxyEvents.map((event) => fromProxy(event, env));
  const proxyKeys = new Set(
    observations.map((item) => `${item.hostname}|${item.protocol}|${item.decision}`)
  );

  // Proxy events are authoritative for traffic that reached the outer proxy.
  // Add only browser deny/block observations that the proxy could not see.
  for (const event of browserEvents) {
    const observation = fromBrowserEvent(event, env);
    if (observation === null || observation.decision === 'allow') continue;
    const key = `${observation.hostname}|${observation.protocol}|${observation.decision}`;
    if (!proxyKeys.has(key)) observations.push(observation);
  }

  const groups = new Map<string, { observation: Observation; count: number }>();
  for (const observation of observations) {
    const category = categoryFor(observation, env, verified);
    const key = `${category}|${observation.hostname}|${observation.protocol}|${observation.decision}`;
    const current = groups.get(key);
    if (current === undefined) groups.set(key, { observation, count: 1 });
    else current.count += 1;
  }

  const manifest: DestinationManifest = {
    environment: env.name,
    source: 'REAL_RUNTIME_OBSERVATION',
    expected: [],
    newButVerified: [],
    blocked: [],
    unresolved: [],
  };
  for (const [key, group] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const category = key.split('|', 1)[0] as DestinationCategory;
    const entry: DestinationManifestEntry = {
      hostname: group.observation.hostname,
      protocol: group.observation.protocol,
      environmentClassification: environmentClassification(group.observation.classification),
      semanticClassification: group.observation.semanticClassification,
      policyRule: group.observation.ruleId,
      observedPurpose: group.observation.purpose,
      decision: group.observation.decision,
      containmentViolation: group.observation.containmentViolation,
      requestCount: group.count,
    };
    if (category === 'EXPECTED') manifest.expected.push(entry);
    else if (category === 'NEW_BUT_VERIFIED') manifest.newButVerified.push(entry);
    else if (category === 'BLOCKED') manifest.blocked.push(entry);
    else manifest.unresolved.push(entry);
  }
  return manifest;
}

export function writeDestinationManifest(file: string, manifest: DestinationManifest): void {
  fs.writeFileSync(path.resolve(file), JSON.stringify(manifest, null, 2));
}
