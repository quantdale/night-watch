// ---------------------------------------------------------------------------
// Nightwatch — explicit host classification tables.
//
// This module is the SOURCE OF TRUTH for which hosts are known Alphaus
// production/dev/next hosts. Anything Alphaus-related that is NOT listed here
// (or in the selected environment's allowlist) fails closed in the outbound
// policy (src/core/safety/outboundPolicy.ts).
//
// All comparisons are case-insensitive: helpers lowercase the input before
// comparing against these (already-lowercase) tables.
// ---------------------------------------------------------------------------

/**
 * Known Alphaus PRODUCTION hosts. Any request to these is DENIED in every
 * supported environment (local/dev/next): Nightwatch is strictly read-only
 * and never permitted to touch production data planes.
 */
export const KNOWN_PRODUCTION_HOSTS: readonly string[] = [
  // Prod REST + /m/blue gateway — mobingilabs/ripple-ui src/config/common.js @ d80b161b
  'api.alphaus.cloud',
  // Prod ConnectRPC — alphauslabs/blue-sdk-ts conn/conn.ts:6
  'bluerpc.alphaus.cloud',
  // Prod gRPC — alphauslabs/blue-sdk-go conn/conn.go:14 ("blue.alphaus.cloud:443" global LB)
  'blue.alphaus.cloud',
  // Prod OIDC login — mobingilabs/ripple-ui src/config/common.js @ d80b161b
  'login.alphaus.cloud',
  // Prod app UI — mobingilabs/ripple-ui src/config/common.js @ d80b161b
  'app.alphaus.cloud',
  // Legacy prod REST — legacy Mobingi-era API host
  'service.mobingi.com',
  // Legacy prod login — legacy Mobingi-era login host
  'login.mobingi.com',
  // Legacy prod app — legacy Mobingi-era app host
  'app.mobingi.com',
];

/** Dev hosts. Only allowed when the selected environment is 'dev'. */
export const DEV_HOSTS: readonly string[] = [
  // Dev REST /m/blue gateway — mobingilabs/ripple-ui src/config/common.js @ d80b161b
  'apidev.alphaus.cloud',
  // Dev OIDC login — mobingilabs/ripple-ui src/config/common.js @ d80b161b
  'logindev.alphaus.cloud',
  // Dev app UI — mobingilabs/ripple-ui src/config/common.js @ d80b161b
  'appdev.alphaus.cloud',
  // Legacy dev REST — legacy Mobingi-era dev API host
  'servicedev.mobingi.com',
  // Legacy dev app — legacy Mobingi-era dev app host
  'appdev.mobingi.com',
];

/** Next (staging) hosts. Only allowed when the selected environment is 'next'. */
export const NEXT_HOSTS: readonly string[] = [
  // Next REST /m/blue gateway — mobingilabs/ripple-ui src/config/common.js @ d80b161b
  'apinext.alphaus.cloud',
  // Next OIDC login — mobingilabs/ripple-ui src/config/common.js @ d80b161b
  'loginnext.alphaus.cloud',
  // Next app UI — mobingilabs/ripple-ui src/config/common.js @ d80b161b
  'next.alphaus.cloud',
];

/** Alphaus-owned second-level domains. */
export const ALPHAUS_DOMAINS: readonly string[] = ['alphaus.cloud', 'mobingi.com'];

/** Localhost family. Only allowed when the selected environment is 'local'. */
export const LOCAL_HOSTS: readonly string[] = ['localhost', '127.0.0.1', '::1', '[::1]'];

/**
 * GCP Cloud Run host suffix. Cloud Run hosts are production-class compute —
 * Nightwatch denies them in every supported environment.
 */
export const CLOUD_RUN_SUFFIX = '.run.app';

const lower = (s: string): string => s.toLowerCase();

function hostSet(list: readonly string[]): ReadonlySet<string> {
  return new Set(list.map(lower));
}

const KNOWN_PRODUCTION_SET: ReadonlySet<string> = hostSet(KNOWN_PRODUCTION_HOSTS);
const DEV_SET: ReadonlySet<string> = hostSet(DEV_HOSTS);
const NEXT_SET: ReadonlySet<string> = hostSet(NEXT_HOSTS);

/** True when `host` is a known Alphaus production host (case-insensitive). */
export function isKnownProductionHost(host: string): boolean {
  return KNOWN_PRODUCTION_SET.has(lower(host));
}

/** True when `host` is a known dev host (case-insensitive). */
export function isDevHost(host: string): boolean {
  return DEV_SET.has(lower(host));
}

/** True when `host` is a known next host (case-insensitive). */
export function isNextHost(host: string): boolean {
  return NEXT_SET.has(lower(host));
}
