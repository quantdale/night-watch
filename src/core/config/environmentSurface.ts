// ---------------------------------------------------------------------------
// Nightwatch — the environment-variable declaration surface.
//
// F-19. `src` and `bin` read dozens of NIGHTWATCH_* variables, some assembled
// from constants at runtime, with no single declaration of what exists, what
// shape each value takes, whether it is secret-bearing, or which surfaces
// consume it. A typo in a variable name was indistinguishable from choosing
// the default.
//
// This module owns the declaration (data in
// `config/environment-surface.v1.json`), validates a process environment
// against it, reports an undeclared NIGHTWATCH_* name with its closest
// declared neighbour, and renders the effective configuration with
// secret-bearing values reduced to presence only. It is pure: no I/O beyond
// reading its own declaration file, no subprocess, no socket, no browser.
// ---------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as path from 'node:path';

export const ENVIRONMENT_SURFACE_SCHEMA = 'nightwatch.environment-surface.v1';

export type EnvironmentSurfaceMode =
  | 'startup'
  | 'scenario'
  | 'campaign'
  | 'control-center'
  | 'owner-manual';

export interface EnumShape {
  readonly kind: 'enum';
  readonly values: readonly string[];
}
export interface StringShape {
  readonly kind: 'string';
}
export interface PathShape {
  readonly kind: 'path';
}
export interface StringListShape {
  readonly kind: 'string-list';
}
export interface IntegerShape {
  readonly kind: 'integer';
  readonly min?: number;
  readonly max?: number;
}
export interface JsonShape {
  readonly kind: 'json';
}
export interface UrlShape {
  readonly kind: 'url';
}
export interface AbsoluteExecutableShape {
  readonly kind: 'absolute-executable';
}

export type EnvironmentVariableShape =
  | EnumShape
  | StringShape
  | PathShape
  | StringListShape
  | IntegerShape
  | JsonShape
  | UrlShape
  | AbsoluteExecutableShape;

export interface EnvironmentVariableDeclaration {
  readonly name: string;
  readonly purpose: string;
  readonly requiredIn: readonly EnvironmentSurfaceMode[];
  readonly shape: EnvironmentVariableShape;
  /** A default literal, or a symbolic default resolved by the consuming code. */
  readonly default: string | null;
  readonly secretBearing: boolean;
  readonly consumers: readonly string[];
}

export interface AssembledEnvironmentRead {
  readonly name: string;
  readonly construction: string;
  readonly consumer: string;
}

export interface EnvironmentSurface {
  readonly schemaVersion: typeof ENVIRONMENT_SURFACE_SCHEMA;
  readonly purpose: string;
  readonly modes: readonly EnvironmentSurfaceMode[];
  readonly variables: readonly EnvironmentVariableDeclaration[];
  readonly assembledReads: readonly AssembledEnvironmentRead[];
}

export class EnvironmentSurfaceError extends Error {}

export interface EnvironmentRefusal {
  readonly name: string;
  readonly code: string;
  readonly detail: string;
}

export interface UnknownEnvironmentVariable {
  readonly name: string;
  readonly closest: string;
  readonly distance: number;
}

export interface EnvironmentSurfaceValidation {
  readonly ok: boolean;
  readonly refusals: readonly EnvironmentRefusal[];
  readonly unknown: readonly UnknownEnvironmentVariable[];
}

export interface EffectiveConfigurationRow {
  readonly name: string;
  readonly source: 'PROCESS_ENVIRONMENT' | 'ENV_FILE' | 'DECLARATION_DEFAULT';
  /** Presence is separate from the value: a redacted secret keeps presence. */
  readonly present: boolean;
  readonly value: string | null;
  readonly secretBearing: boolean;
}

const MODE_SET: ReadonlySet<string> = new Set([
  'startup',
  'scenario',
  'campaign',
  'control-center',
  'owner-manual',
]);

const SHAPE_KINDS: ReadonlySet<string> = new Set([
  'enum',
  'string',
  'path',
  'string-list',
  'integer',
  'json',
  'url',
  'absolute-executable',
]);

export const ENVIRONMENT_SURFACE_FILE = 'config/environment-surface.v1.json';

function declarationPath(file?: string): string {
  if (typeof file === 'string' && file.length > 0) return file;
  // The repository source tree is the authority, never the ambient cwd.
  return path.join(__dirname, '..', '..', '..', ENVIRONMENT_SURFACE_FILE);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseShape(name: string, value: unknown): EnvironmentVariableShape {
  if (!isRecord(value) || typeof value.kind !== 'string' || !SHAPE_KINDS.has(value.kind)) {
    throw new EnvironmentSurfaceError(`environment surface: ${name} has no supported shape kind`);
  }
  if (value.kind === 'enum') {
    if (!Array.isArray(value.values) || value.values.length === 0 || value.values.some((item) => typeof item !== 'string')) {
      throw new EnvironmentSurfaceError(`environment surface: ${name} enum shape needs non-empty string values`);
    }
    return { kind: 'enum', values: Object.freeze([...(value.values as string[])]) };
  }
  if (value.kind === 'integer') {
    const min = value.min;
    const max = value.max;
    if (min !== undefined && (typeof min !== 'number' || !Number.isInteger(min))) {
      throw new EnvironmentSurfaceError(`environment surface: ${name} integer min must be an integer`);
    }
    if (max !== undefined && (typeof max !== 'number' || !Number.isInteger(max))) {
      throw new EnvironmentSurfaceError(`environment surface: ${name} integer max must be an integer`);
    }
    return {
      kind: 'integer',
      ...(min === undefined ? {} : { min }),
      ...(max === undefined ? {} : { max }),
    };
  }
  return { kind: value.kind } as EnvironmentVariableShape;
}

/** Parse and strictly validate the declaration. Unknown keys fail closed. */
export function parseEnvironmentSurface(value: unknown): EnvironmentSurface {
  if (!isRecord(value)) throw new EnvironmentSurfaceError('environment surface: declaration is not an object');
  if (value.schemaVersion !== ENVIRONMENT_SURFACE_SCHEMA) {
    throw new EnvironmentSurfaceError(
      `environment surface: schemaVersion is ${String(value.schemaVersion)}, expected ${ENVIRONMENT_SURFACE_SCHEMA}`,
    );
  }
  if (typeof value.purpose !== 'string' || value.purpose.trim().length < 20) {
    throw new EnvironmentSurfaceError('environment surface: purpose must be a substantive string');
  }
  const modes = value.modes;
  if (!Array.isArray(modes) || modes.length === 0 || modes.some((mode) => typeof mode !== 'string' || !MODE_SET.has(mode))) {
    throw new EnvironmentSurfaceError('environment surface: modes must be a non-empty array of declared modes');
  }
  if (!Array.isArray(value.variables) || value.variables.length === 0) {
    throw new EnvironmentSurfaceError('environment surface: variables must be a non-empty array');
  }
  const seen = new Set<string>();
  const variables: EnvironmentVariableDeclaration[] = [];
  for (const entry of value.variables) {
    if (!isRecord(entry)) throw new EnvironmentSurfaceError('environment surface: every variable must be an object');
    const name = entry.name;
    if (typeof name !== 'string' || !/^NIGHTWATCH_[A-Z0-9_]+$/.test(name)) {
      throw new EnvironmentSurfaceError(`environment surface: invalid variable name ${String(name)}`);
    }
    if (seen.has(name)) throw new EnvironmentSurfaceError(`environment surface: duplicate variable ${name}`);
    seen.add(name);
    if (typeof entry.purpose !== 'string' || entry.purpose.trim().length < 12) {
      throw new EnvironmentSurfaceError(`environment surface: ${name} purpose must be a substantive string`);
    }
    if (!Array.isArray(entry.requiredIn) || entry.requiredIn.some((mode) => typeof mode !== 'string' || !MODE_SET.has(mode))) {
      throw new EnvironmentSurfaceError(`environment surface: ${name} requiredIn must be an array of declared modes`);
    }
    if (!Array.isArray(entry.consumers) || entry.consumers.length === 0 || entry.consumers.some((c) => typeof c !== 'string' || c.length === 0)) {
      throw new EnvironmentSurfaceError(`environment surface: ${name} consumers must be a non-empty string array`);
    }
    if (typeof entry.secretBearing !== 'boolean') {
      throw new EnvironmentSurfaceError(`environment surface: ${name} secretBearing must be a boolean`);
    }
    if (entry.default !== null && typeof entry.default !== 'string') {
      throw new EnvironmentSurfaceError(`environment surface: ${name} default must be a string or null`);
    }
    variables.push({
      name,
      purpose: entry.purpose,
      requiredIn: Object.freeze([...(entry.requiredIn as string[])]) as readonly EnvironmentSurfaceMode[],
      shape: parseShape(name, entry.shape),
      default: entry.default,
      secretBearing: entry.secretBearing,
      consumers: Object.freeze([...(entry.consumers as string[])]),
    });
  }
  const assembledRaw = value.assembledReads ?? [];
  if (!Array.isArray(assembledRaw)) throw new EnvironmentSurfaceError('environment surface: assembledReads must be an array');
  const assembledReads: AssembledEnvironmentRead[] = assembledRaw.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.name !== 'string' ||
      !seen.has(entry.name) ||
      typeof entry.construction !== 'string' ||
      entry.construction.length === 0 ||
      typeof entry.consumer !== 'string'
    ) {
      throw new EnvironmentSurfaceError('environment surface: an assembledRead must name a declared variable, construction and consumer');
    }
    return { name: entry.name, construction: entry.construction, consumer: entry.consumer };
  });
  return Object.freeze({
    schemaVersion: ENVIRONMENT_SURFACE_SCHEMA,
    purpose: value.purpose,
    modes: Object.freeze([...(modes as string[])]) as readonly EnvironmentSurfaceMode[],
    variables: Object.freeze(variables),
    assembledReads: Object.freeze(assembledReads),
  });
}

let cached: EnvironmentSurface | null = null;

export function loadEnvironmentSurface(file?: string): EnvironmentSurface {
  if (file === undefined && cached !== null) return cached;
  const target = declarationPath(file);
  let raw: string;
  try {
    raw = fs.readFileSync(target, 'utf8');
  } catch {
    throw new EnvironmentSurfaceError('environment surface: declaration file is unreadable');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new EnvironmentSurfaceError('environment surface: declaration file is not valid JSON');
  }
  const surface = parseEnvironmentSurface(parsed);
  if (file === undefined) cached = surface;
  return surface;
}

function isSet(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function shapeRefusal(name: string, shape: EnvironmentVariableShape, value: string): string | null {
  switch (shape.kind) {
    case 'enum':
      return shape.values.includes(value) ? null : `expected one of ${shape.values.join('|')}`;
    case 'string':
      return value.trim().length > 0 ? null : 'expected a non-empty string';
    case 'path':
      if (value.includes('\0')) return 'expected a path without NUL';
      return value.trim().length > 0 ? null : 'expected a non-empty path';
    case 'string-list':
      return value.split(',').every((part) => part.trim().length > 0) ? null : 'expected a comma-separated list with no empty entries';
    case 'integer': {
      if (!/^-?\d+$/.test(value.trim())) return 'expected an integer';
      const numeric = Number.parseInt(value.trim(), 10);
      if (shape.min !== undefined && numeric < shape.min) return `expected an integer >= ${shape.min}`;
      if (shape.max !== undefined && numeric > shape.max) return `expected an integer <= ${shape.max}`;
      return null;
    }
    case 'json':
      try {
        JSON.parse(value);
        return null;
      } catch {
        return 'expected a JSON document';
      }
    case 'url':
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:' ? null : 'expected an http(s) URL';
      } catch {
        return 'expected a valid absolute URL';
      }
    case 'absolute-executable':
      if (value.includes('\0')) return 'expected an absolute path without NUL';
      return path.isAbsolute(value) ? null : 'expected an absolute path';
    default:
      return null;
  }
}

/**
 * Validate a process environment against a declaration. Malformed values are
 * refusals; undeclared NIGHTWATCH_* names are reported with their closest
 * declared neighbour. The function never throws and never mutates its input.
 */
export function validateEnvironmentValues(
  environment: NodeJS.ProcessEnv,
  surface: EnvironmentSurface = loadEnvironmentSurface(),
  options: { readonly mode?: EnvironmentSurfaceMode } = {},
): EnvironmentSurfaceValidation {
  const refusals: EnvironmentRefusal[] = [];
  const declared = new Map(surface.variables.map((entry) => [entry.name, entry]));
  for (const entry of surface.variables) {
    const raw = environment[entry.name];
    if (!isSet(raw)) {
      if (options.mode !== undefined && entry.requiredIn.includes(options.mode)) {
        refusals.push({
          name: entry.name,
          code: 'ENVIRONMENT_VALUE_REQUIRED',
          detail: `required in mode ${options.mode} but not set`,
        });
      }
      continue;
    }
    const reason = shapeRefusal(entry.name, entry.shape, raw);
    if (reason !== null) {
      refusals.push({ name: entry.name, code: 'ENVIRONMENT_VALUE_MALFORMED', detail: `expected shape ${entry.shape.kind}: ${reason}` });
    }
  }
  const unknown: UnknownEnvironmentVariable[] = [];
  for (const key of Object.keys(environment)) {
    if (!key.startsWith('NIGHTWATCH_') || declared.has(key)) continue;
    const closest = closestDeclaredName(key, [...declared.keys()]);
    unknown.push({ name: key, closest: closest.name, distance: closest.distance });
  }
  unknown.sort((left, right) => left.name.localeCompare(right.name));
  return Object.freeze({
    ok: refusals.length === 0,
    refusals: Object.freeze(refusals),
    unknown: Object.freeze(unknown),
  });
}

/**
 * A refusal on any malformed declared value. Unknown NIGHTWATCH_* names are
 * reported by `reportUnknownEnvironmentVariables` and never silently dropped.
 */
export function assertEnvironmentSurface(
  environment: NodeJS.ProcessEnv,
  surface: EnvironmentSurface = loadEnvironmentSurface(),
  options: { readonly mode?: EnvironmentSurfaceMode } = {},
): void {
  const verdict = validateEnvironmentValues(environment, surface, options);
  if (verdict.refusals.length > 0) {
    const first = verdict.refusals[0] as EnvironmentRefusal;
    throw new EnvironmentSurfaceError(
      `ENVIRONMENT_VALUE_MALFORMED: ${first.name} — ${first.detail}`,
    );
  }
}

/** One reporting line per undeclared NIGHTWATCH_* name and its closest declared name. */
export function reportUnknownEnvironmentVariables(
  environment: NodeJS.ProcessEnv,
  surface: EnvironmentSurface = loadEnvironmentSurface(),
): readonly string[] {
  return validateEnvironmentValues(environment, surface).unknown.map(
    (entry) => `ENVIRONMENT_VARIABLE_UNKNOWN: ${entry.name} is not declared; closest declared name is ${entry.closest} (distance ${entry.distance})`,
  );
}

export function closestDeclaredName(name: string, declared: readonly string[]): { readonly name: string; readonly distance: number } {
  let best = declared[0] ?? '';
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of declared) {
    const distance = levenshtein(name, candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return { name: best, distance: bestDistance };
}

function levenshtein(left: string, right: string): number {
  const rows = left.length + 1;
  const columns = right.length + 1;
  let previous: number[] = Array.from({ length: columns }, (_, index) => index);
  for (let row = 1; row < rows; row += 1) {
    const current: number[] = [row];
    for (let column = 1; column < columns; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      current[column] = Math.min(
        (previous[column] ?? 0) + 1,
        (current[column - 1] ?? 0) + 1,
        (previous[column - 1] ?? 0) + cost,
      );
    }
    previous = current;
  }
  return previous[columns - 1] ?? Math.max(left.length, right.length);
}

/**
 * Resolve every declared variable's effective source. `fileEnvironment` is the
 * optional `.env` layer; it is applied only where the process environment
 * does not set the variable, and only for declared names (an undeclared name
 * in `.env` is never adopted).
 */
export function effectiveConfiguration(
  environment: NodeJS.ProcessEnv,
  surface: EnvironmentSurface = loadEnvironmentSurface(),
  fileEnvironment: Readonly<Record<string, string>> = {},
): readonly EffectiveConfigurationRow[] {
  const rows: EffectiveConfigurationRow[] = [];
  for (const entry of surface.variables) {
    const fromProcess = environment[entry.name];
    const fromFile = fileEnvironment[entry.name];
    let source: EffectiveConfigurationRow['source'] = 'DECLARATION_DEFAULT';
    let value: string | null = entry.default;
    if (isSet(fromProcess)) {
      source = 'PROCESS_ENVIRONMENT';
      value = fromProcess;
    } else if (typeof fromFile === 'string' && fromFile.length > 0) {
      source = 'ENV_FILE';
      value = fromFile;
    }
    rows.push({
      name: entry.name,
      source,
      present: value !== null,
      value: entry.secretBearing ? null : value,
      secretBearing: entry.secretBearing,
    });
  }
  return Object.freeze(rows);
}

/** Render the effective configuration with secret-bearing values presence-only. */
export function renderEffectiveConfiguration(rows: readonly EffectiveConfigurationRow[]): string {
  const lines = ['NIGHTWATCH effective configuration (secret-bearing values are presence-only):'];
  for (const row of rows) {
    const rendered = row.secretBearing
      ? row.present ? '<set>' : '<unset>'
      : row.value === null ? '<unset>' : JSON.stringify(row.value);
    lines.push(`  ${row.name} = ${rendered}  [${row.source}]${row.secretBearing ? ' [SECRET]' : ''}`);
  }
  return lines.join('\n');
}

/**
 * Read the optional repository-root `.env` layer. It never replaces a
 * process value; the config view and startup validation may consider it, but
 * a launcher forwards only the variables it explicitly names.
 */
export function loadDotEnvLayer(root?: string): Readonly<Record<string, string>> {
  const base = root ?? path.join(__dirname, '..', '..', '..');
  try {
    return parseDotEnv(fs.readFileSync(path.join(base, '.env'), 'utf8'));
  } catch {
    return Object.freeze({});
  }
}

/** A copy of `environment` where declared names absent from it take `.env` values. */
export function mergeDotEnvLayer(
  environment: NodeJS.ProcessEnv,
  fileEnvironment: Readonly<Record<string, string>>,
  surface: EnvironmentSurface = loadEnvironmentSurface(),
): NodeJS.ProcessEnv {
  const merged: NodeJS.ProcessEnv = { ...environment };
  for (const entry of surface.variables) {
    if (!isSet(merged[entry.name]) && typeof fileEnvironment[entry.name] === 'string' && fileEnvironment[entry.name] !== '') {
      merged[entry.name] = fileEnvironment[entry.name];
    }
  }
  return merged;
}

/** Parse the declared `.env` layer. Only `KEY=value` and comments are accepted. */
export function parseDotEnv(text: string): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    const equals = line.indexOf('=');
    if (equals <= 0) continue;
    const key = line.slice(0, equals).trim();
    if (!/^NIGHTWATCH_[A-Z0-9_]+$/.test(key)) continue;
    let value = line.slice(equals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return Object.freeze(out);
}
