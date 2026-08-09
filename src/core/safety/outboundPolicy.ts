// ---------------------------------------------------------------------------
// Nightwatch — fail-closed outbound request policy.
//
// Every outbound request the browser harness inspects is routed through
// OutboundPolicy.decide() before it is allowed to proceed. RULE ORDER IS
// SIGNIFICANT — first match wins, and the default is DENY. For an http(s)
// request the ONLY route to 'allow' is an explicit entry in the selected
// environment's allowedHosts (rule 3).
//
// A dev/next host (see hosts.ts DEV_HOSTS/NEXT_HOSTS) that is NOT in the
// selected environment's allowlist falls through to rule 8 (unknown Alphaus
// host — deny). That is correct and desired: each environment must
// explicitly allow its own hosts.
// ---------------------------------------------------------------------------

import type { EnvironmentConfig } from '../environment/types';
import type { HostClass, OutboundDecision } from './types';
import { isKnownProductionHost, LOCAL_HOSTS, CLOUD_RUN_SUFFIX } from './hosts';

function deny(host: string, hostClass: HostClass, reason: string): OutboundDecision {
  return { verdict: 'deny', hostClass, host, reason };
}

/**
 * Match a hostname (and host:port key) against a single allowlist-style entry.
 * - A `*.`-prefixed entry is a wildcard: matches any subdomain of the bare
 *   domain (suffix match after the dot; the bare domain itself does NOT match).
 * - A plain entry matches the exact hostname (any port), or the exact
 *   hostname:port key when the URL carries an explicit non-default port.
 */
function entryMatches(hostname: string, hostPortKey: string, entry: string): boolean {
  const e = entry.toLowerCase();
  if (e.startsWith('*.')) {
    return hostname.endsWith(e.slice(1));
  }
  return e === hostname || e === hostPortKey;
}

export class OutboundPolicy {
  constructor(private readonly env: EnvironmentConfig) {}

  /** Bound environment — exposed for canaries and diagnostics. */
  get environment(): EnvironmentConfig {
    return this.env;
  }

  decide(rawUrl: string): OutboundDecision {
    // R1 — unparsable URL: deny.
    let u: URL;
    try {
      u = new URL(rawUrl);
    } catch {
      return deny('', 'external', 'unparsable URL');
    }
    const hostname = u.hostname.toLowerCase();
    // WHATWG URL omits default ports (http:80/https:443), so an entry with a
    // non-default port only matches URLs that actually carry that port.
    const hostPortKey = u.port !== '' ? `${hostname}:${u.port}` : hostname;

    // R2 — non-http(s) schemes (data:, blob:, javascript:, mailto:, file:...)
    // are inert browser capabilities, not outbound requests: allow, internal.
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { verdict: 'allow', hostClass: 'internal', host: hostname, reason: 'non-http(s) scheme' };
    }

    // R3 — explicit environment allowlist: the ONLY route to 'allow'.
    if (this.env.allowedHosts.some((entry) => entryMatches(hostname, hostPortKey, entry))) {
      return {
        verdict: 'allow',
        hostClass: this.env.name,
        host: hostname,
        reason: `allowlisted host for ${this.env.name} environment`,
      };
    }

    // R4 — explicitly classified harmless static assets (CDNs, fonts...).
    if (this.env.staticAssetHosts.some((entry) => entryMatches(hostname, hostPortKey, entry))) {
      return { verdict: 'allow', hostClass: 'static', host: hostname, reason: 'classified static asset host' };
    }

    // R5 — telemetry/analytics: blocked (aborted) but does NOT fail the run.
    if (this.env.telemetryHosts.some((entry) => entryMatches(hostname, hostPortKey, entry))) {
      return { verdict: 'block-telemetry', hostClass: 'telemetry', host: hostname, reason: 'telemetry host — blocked, not failed' };
    }

    // R6 — known Alphaus production hosts (see KNOWN_PRODUCTION_HOSTS in hosts.ts).
    if (isKnownProductionHost(hostname)) {
      return deny(hostname, 'production', 'known Alphaus production host');
    }

    // R7 — GCP Cloud Run hosts are production-class compute.
    if (hostname === CLOUD_RUN_SUFFIX.slice(1) || hostname.endsWith(CLOUD_RUN_SUFFIX)) {
      return deny(hostname, 'production', 'GCP Cloud Run host (production-class)');
    }

    // R8 — unknown Alphaus hosts (alphaus.cloud domain not in any table):
    // fail closed, treat as hostile. This also catches dev/next hosts that are
    // not allowlisted in the selected environment.
    if (hostname === 'alphaus.cloud' || hostname.endsWith('.alphaus.cloud')) {
      return deny(hostname, 'unknown-alphaus', 'unknown Alphaus host — fail closed');
    }

    // R9 — legacy Alphaus domain (mobingi.com), not otherwise classified.
    if (hostname === 'mobingi.com' || hostname.endsWith('.mobingi.com')) {
      return deny(hostname, 'production', 'legacy Alphaus domain');
    }

    // R10 — localhost family is only reachable via the explicit allowlist (R3).
    if (LOCAL_HOSTS.includes(hostname)) {
      return deny(hostname, 'local', 'localhost not allowed in this environment allowlist');
    }

    // R11 — everything else: deny.
    return deny(hostname, 'external', 'unexpected external host');
  }
}
