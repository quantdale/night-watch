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
  if (cfg['name'] !== name) {
    throw new EnvironmentSelectionError(
      `fail-closed: config (${source}) name=${String(cfg['name'])} does not match requested env "${name}"`
    );
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
  return selectEnvironment(process.env[NIGHTWATCH_ENV_VAR]);
}
