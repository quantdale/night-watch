// ---------------------------------------------------------------------------
// Nightwatch — Phase 0/1 shared environment contracts.
// Environment selection is fail-closed: no env, or an unsupported env, DENIES
// startup. production is NOT a supported environment in Phase 1.
// ---------------------------------------------------------------------------

import type { BrowserBackgroundHostConfig } from '../safety/types';

export type EnvironmentName = 'local' | 'dev' | 'next';

export interface EnvironmentConfig {
  /** Canonical name; must match the JSON file it was loaded from. */
  name: EnvironmentName;
  /** Human-readable description, including provenance of host facts. */
  label: string;
  /** Target UI origin for this environment (e.g. http://127.0.0.1:7311). */
  uiBaseUrl: string;
  /** Explicit API hosts expected by the selected environment. */
  apiHosts?: string[];
  /** Explicit authentication hosts expected by the selected environment. */
  authHosts?: string[];
  /**
   * Explicit host[:port] allowlist. An entry without a port matches any port.
   * A request whose host is NOT here (and not a classified static asset) is
   * DENIED — this is the only route to 'allow' for http(s) requests.
   */
  allowedHosts: string[];
  /** Hosts explicitly classified as harmless static assets (CDNs, fonts...). */
  staticAssetHosts: string[];
  /**
   * Telemetry/analytics hosts. Requests to these are BLOCKED (aborted before
   * leaving the browser) and recorded, but do NOT fail the run.
   * Entries may use a leading `*.` wildcard (suffix match).
   */
  telemetryHosts: string[];
  /** Exact optional support-widget hosts. Blocked locally, never allowlisted. */
  optionalThirdPartySupportHosts?: string[];
  /** Exact Chromium browser-background hosts. Blocked locally, never allowlisted. */
  browserBackgroundHosts?: BrowserBackgroundHostConfig[];
  /**
   * Oracle issue event types that fail the run when raised
   * (e.g. 'console-error', 'pageerror', 'malformed-json'). 'hard-failure'
   * (a denied outbound request) is ALWAYS fatal and cannot be turned off.
   */
  failOn: string[];
}
