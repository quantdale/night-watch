// ---------------------------------------------------------------------------
// Nightwatch — fail-closed environment selection and config loading.
//
// Rules:
//   - NIGHTWATCH_ENV must be one of local | dev | next  (else DENY)
//   - production is NOT supported in Phase 1 (else DENY)
//   - the config file must exist and pass shape validation (else DENY)
// ---------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { EnvironmentConfig, EnvironmentName } from './types';
import { isBrowserBackgroundClassification, type BrowserBackgroundHostConfig } from '../safety/types';
import { errnoCode, sensitiveDiagnostic } from '../policy/sensitiveDiagnostics';
import { assertEnvironmentSurface } from '../config/environmentSurface';
import { KNOWN_PRODUCTION_HOSTS } from '../safety/hosts';

export type { EnvironmentConfig, EnvironmentName } from './types';

export const SUPPORTED_ENVIRONMENTS: readonly EnvironmentName[] = ['local', 'dev', 'next'];
export const SUPPORTED_ENV_SET: ReadonlySet<string> = new Set(SUPPORTED_ENVIRONMENTS);

export const NIGHTWATCH_ENV_VAR = 'NIGHTWATCH_ENV';

export class EnvironmentSelectionError extends Error {}

/** Fail-closed gate: returns the canonical name or throws. Never returns 'prod'. */
export function assertSupportedEnvironment(name: string | undefined): EnvironmentName {
  if (!name || name.trim() === '') {
    throw new EnvironmentSelectionError(
      `fail-closed: no environment selected (${NIGHTWATCH_ENV_VAR} is not set). ` +
        `Allowed: ${SUPPORTED_ENVIRONMENTS.join(', ')}. production is NOT supported.`
    );
  }
  const trimmed = name.trim().toLowerCase();
  if (!SUPPORTED_ENV_SET.has(trimmed)) {
    throw new EnvironmentSelectionError(
      `fail-closed: environment "${name}" is not supported. ` +
        `Allowed: ${SUPPORTED_ENVIRONMENTS.join(', ')}. production is NOT supported.`
    );
  }
  return trimmed as EnvironmentName;
}

function configPath(name: EnvironmentName): string {
  // The repository source tree is the sole authority. Ambient process.cwd()
  // is untrusted launch state and must never select a safety policy.
  return path.join(__dirname, '..', '..', '..', 'config', 'environments', `${name}.json`);
}

/** Load and validate the JSON config for a supported environment. */
export function loadEnvironmentConfig(name: EnvironmentName): EnvironmentConfig {
  const file = configPath(name);
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    // NW-13: errno only. The native fs message embeds the absolute path.
    throw new EnvironmentSelectionError(
      `fail-closed: cannot read environment config for "${name}": ${sensitiveDiagnostic('ENVIRONMENT_CONFIG_UNREADABLE', { failure: 'NOT_READABLE', errno: errnoCode(err), target: file })}`
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // NW-13: the native SyntaxError embeds a window of the file's bytes.
    throw new EnvironmentSelectionError(
      `fail-closed: environment config is not valid JSON: ${sensitiveDiagnostic('ENVIRONMENT_CONFIG_PARSE_REFUSED', { failure: 'MALFORMED_JSON', target: file })}`
    );
  }
  return validateEnvironmentConfig(name, parsed, file);
}

// F-19: the environment files carry the allowlists the whole fail-closed
// egress model rests on. Shape alone is not enough, so these helpers validate
// each entry as a host pattern and assert the invariants the safety model
// already states: no known production host anywhere, and local stays
// loopback-only.
const ENVIRONMENT_CONFIG_KEYS: ReadonlySet<string> = new Set([
  'name',
  'label',
  'uiBaseUrl',
  'apiHosts',
  'authHosts',
  'allowedHosts',
  'staticAssetHosts',
  'telemetryHosts',
  'optionalThirdPartySupportHosts',
  'browserBackgroundHosts',
  'failOn',
]);

const HOST_LABEL_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

function invalidHostEntry(entry: string): string | null {
  if (entry.length === 0 || entry.trim() !== entry) return 'empty or untrimmed host entry';
  let bare = entry;
  if (bare.startsWith('*.')) {
    bare = bare.slice(2);
    if (bare.includes('*')) return 'only one leading wildcard label is allowed';
    if (bare.length === 0) return 'wildcard has no suffix';
  } else if (bare.includes('*')) {
    return 'a wildcard must be a single leading *. label';
  }
  if (bare.startsWith('[')) {
    const close = bare.indexOf(']');
    if (close < 0) return 'unterminated bracketed IPv6 literal';
    const literal = bare.slice(1, close);
    if (!/^[0-9a-f:.]{2,45}$/i.test(literal) || !literal.includes(':')) return 'malformed bracketed IPv6 literal';
    const suffix = bare.slice(close + 1);
    if (suffix !== '' && !/^:\d{1,5}$/.test(suffix)) return 'malformed port after bracketed IPv6 literal';
    return null;
  }
  const colon = bare.lastIndexOf(':');
  let host = bare;
  let port: string | null = null;
  if (colon >= 0) {
    host = bare.slice(0, colon);
    port = bare.slice(colon + 1);
    if (host.includes(':')) return 'malformed host entry';
    if (!/^\d{1,5}$/.test(port) || Number(port) > 65535) return 'malformed port';
  }
  if (host.length === 0) return 'empty host';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const octets = host.split('.').map((part) => Number(part));
    return octets.every((octet) => octet >= 0 && octet <= 255) ? null : 'malformed IPv4 literal';
  }
  const labels = host.split('.');
  if (labels.some((label) => !HOST_LABEL_RE.test(label))) return 'malformed hostname label';
  return null;
}

function isLoopbackEntry(entry: string): boolean {
  const bare = entry.startsWith('*.') ? entry.slice(2) : entry;
  if (bare.startsWith('[')) return /^\[(?:0*:)*1\]$/i.test(bare.replace(/:\d+$/, ''));
  const host = bare.includes(':') ? bare.slice(0, bare.lastIndexOf(':')) : bare;
  return host === 'localhost' || host === '::1' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

/** The production host a config entry names or wildcard-covers, if any. */
function productionHostCovered(entry: string): string | null {
  const lower = entry.toLowerCase();
  const suffix = lower.startsWith('*.') ? lower.slice(1) : null;
  for (const production of KNOWN_PRODUCTION_HOSTS) {
    if (lower === production) return production;
    if (suffix !== null && production.endsWith(suffix)) return production;
  }
  return null;
}

function assertHostList(source: string, field: string, entries: readonly string[]): void {
  for (const entry of entries) {
    const invalid = invalidHostEntry(entry);
    if (invalid !== null) {
      throw new EnvironmentSelectionError(
        `fail-closed: config (${source}) field "${field}" entry "${entry}" is not a valid host pattern: ${invalid}`
      );
    }
    const production = productionHostCovered(entry);
    if (production !== null) {
      throw new EnvironmentSelectionError(
        `fail-closed: config (${source}) field "${field}" entry "${entry}" names known production host "${production}"`
      );
    }
  }
}

/** Shape-validate a parsed environment config object. */
export function validateEnvironmentConfig(
  name: EnvironmentName,
  value: unknown,
  source = 'in-memory'
): EnvironmentConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new EnvironmentSelectionError(`fail-closed: environment config (${source}) is not an object`);
  }
  const cfg = value as Record<string, unknown>;
  for (const key of Object.keys(cfg)) {
    if (!ENVIRONMENT_CONFIG_KEYS.has(key)) {
      throw new EnvironmentSelectionError(
        `fail-closed: config (${source}) carries unknown key "${key}"; an unknown key may be a misspelled allowlist`
      );
    }
  }
  if (cfg['name'] !== name) {
    throw new EnvironmentSelectionError(
      `fail-closed: config (${source}) name=${String(cfg['name'])} does not match requested env "${name}"`
    );
  }
  for (const required of ['label', 'uiBaseUrl', 'allowedHosts', 'staticAssetHosts', 'telemetryHosts', 'failOn']) {
    if (cfg[required] === undefined) {
      throw new EnvironmentSelectionError(`fail-closed: config (${source}) is missing required key "${required}"`);
    }
  }
  const strFields: Array<[string, string]> = [
    ['label', 'string'],
    ['uiBaseUrl', 'string'],
  ];
  for (const [field, type] of strFields) {
    if (typeof cfg[field] !== type || String(cfg[field] ?? '').trim() === '') {
      throw new EnvironmentSelectionError(
        `fail-closed: config (${source}) field "${field}" must be a non-empty ${type}`
      );
    }
  }
  const listFields: Array<[string, Array<string>]> = [
    ['apiHosts', []],
    ['authHosts', []],
    ['allowedHosts', []],
    ['staticAssetHosts', []],
    ['telemetryHosts', []],
    ['optionalThirdPartySupportHosts', []],
    ['failOn', []],
  ];
  const out = {
    name,
    label: '',
    uiBaseUrl: '',
    apiHosts: [],
    authHosts: [],
    allowedHosts: [],
    staticAssetHosts: [],
    telemetryHosts: [],
    optionalThirdPartySupportHosts: [],
    browserBackgroundHosts: [],
    failOn: [],
  } as EnvironmentConfig;
  for (const [field, fallback] of listFields) {
    const v = cfg[field];
    if (v === undefined) {
      out[field as keyof EnvironmentConfig] = fallback as never;
      continue;
    }
    if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) {
      throw new EnvironmentSelectionError(
        `fail-closed: config (${source}) field "${field}" must be an array of strings`
      );
    }
    out[field as keyof EnvironmentConfig] = v as never;
  }
  const background = cfg['browserBackgroundHosts'];
  if (background === undefined) {
    out.browserBackgroundHosts = [];
  } else {
    if (!Array.isArray(background)) {
      throw new EnvironmentSelectionError(
        `fail-closed: config (${source}) field "browserBackgroundHosts" must be an array of exact host classifications`
      );
    }
    const seenHosts = new Set<string>();
    out.browserBackgroundHosts = background.map((item, index) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new EnvironmentSelectionError(
          `fail-closed: config (${source}) browserBackgroundHosts[${index}] must be an object`
        );
      }
      const record = item as Record<string, unknown>;
      const host = record['host'];
      const classification = record['classification'];
      if (
        typeof host !== 'string' ||
        host.trim() !== host ||
        host.length === 0 ||
        host.includes('*') ||
        host.includes('/') ||
        host.includes(':') ||
        typeof classification !== 'string' ||
        !isBrowserBackgroundClassification(classification)
      ) {
        throw new EnvironmentSelectionError(
          `fail-closed: config (${source}) browserBackgroundHosts[${index}] must contain one exact hostname and a supported browser-background classification`
        );
      }
      const normalizedHost = host.toLowerCase();
      if (seenHosts.has(normalizedHost)) {
        throw new EnvironmentSelectionError(
          `fail-closed: config (${source}) browserBackgroundHosts contains duplicate host "${normalizedHost}"`
        );
      }
      seenHosts.add(normalizedHost);
      return { host: normalizedHost, classification } as BrowserBackgroundHostConfig;
    });
  }
  // F-19: every host list is validated as host patterns and refused if it
  // names or wildcard-covers a known production host.
  assertHostList(source, 'allowedHosts', out.allowedHosts);
  assertHostList(source, 'apiHosts', out.apiHosts ?? []);
  assertHostList(source, 'authHosts', out.authHosts ?? []);
  assertHostList(source, 'staticAssetHosts', out.staticAssetHosts);
  assertHostList(source, 'telemetryHosts', out.telemetryHosts);
  assertHostList(source, 'optionalThirdPartySupportHosts', out.optionalThirdPartySupportHosts ?? []);

  if (name === 'local') {
    // The local allowlist is loopback-only; telemetry/optional lists are
    // blocked classes, never allowlists, so they are not held to this rule.
    for (const [field, entries] of [
      ['allowedHosts', out.allowedHosts],
      ['apiHosts', out.apiHosts ?? []],
      ['authHosts', out.authHosts ?? []],
    ] as const) {
      for (const entry of entries) {
        if (!isLoopbackEntry(entry)) {
          throw new EnvironmentSelectionError(
            `fail-closed: local.json field "${field}" entry "${entry}" is not loopback-only`
          );
        }
      }
    }
    let uiHost: string;
    try {
      uiHost = new URL(String(cfg['uiBaseUrl'])).hostname;
    } catch {
      throw new EnvironmentSelectionError(`fail-closed: config (${source}) field "uiBaseUrl" is not a valid URL`);
    }
    if (!isLoopbackEntry(uiHost)) {
      throw new EnvironmentSelectionError(
        `fail-closed: local.json uiBaseUrl host "${uiHost}" is not loopback-only`
      );
    }
  }

  out.label = cfg['label'] as string;
  out.uiBaseUrl = cfg['uiBaseUrl'] as string;
  return out;
}

/** Select environment by name (fail-closed). */
export function selectEnvironment(name: string | undefined): EnvironmentConfig {
  return loadEnvironmentConfig(assertSupportedEnvironment(name));
}

/** Convenience: read NIGHTWATCH_ENV from the process environment. */
export function selectEnvironmentFromProcessEnv(): EnvironmentConfig {
  // F-19: the declared surface is validated before an environment is selected,
  // so a malformed containment-relevant value (proxy lease, headed flag,
  // reasoner executable) refuses before any browser, subprocess or socket.
  assertEnvironmentSurface(process.env);
  return selectEnvironment(process.env.NIGHTWATCH_ENV);
}
