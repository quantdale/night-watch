// @ts-check

/**
 * VD-04 / corrections task 4.4 (design D3) — the G19 and G21 release probes
 * EXERCISE their contracts instead of reporting that a rule exists.
 *
 *   G19  render the effective configuration over a synthetic environment and
 *        validate every declared variable: each refuses a malformed value of
 *        its own shape, each required-in-mode variable refuses absence, an
 *        undeclared NIGHTWATCH_* name is reported unknown, and a secret-bearing
 *        value never reaches the rendered text.
 *   G21  run the real capability pre-flight over synthetic non-VALID
 *        artefacts and require the state's own refusal code with no effect on
 *        the artefact directory.
 *
 * The functions take the modules they exercise as parameters, so a test can
 * inject a deliberately lenient implementation and prove the exercise fails.
 * Synthetic values only; the only side effect is one disposable directory
 * under the OS temp root, removed before returning.
 */

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

/**
 * One malformed sample per shape kind whose validator can refuse a value. The
 * `string` kind has none: a whitespace-only value counts as unset, so no SET
 * value is malformed by shape.
 */
export const MALFORMED_SAMPLE_BY_SHAPE = Object.freeze(/** @type {Record<string, string>} */ ({
  enum: '__NOT_A_DECLARED_MEMBER__',
  integer: 'not-an-integer',
  url: 'not a url',
  json: '{not json',
  path: 'bad\0path',
  'string-list': 'a,,b',
  'absolute-executable': 'relative/executable',
}));

/**
 * The slices of the exercised modules this file depends on. Declared here so
 * the parameters are typed without widening to `any`.
 * @typedef {{ name: string, secretBearing?: boolean, requiredIn?: readonly string[], shape?: { kind?: string } }} DeclaredVariable
 * @typedef {{ variables: readonly DeclaredVariable[] }} Declaration
 * @typedef {{ refusals: ReadonlyArray<{ name: string, code: string }>, unknown: ReadonlyArray<{ name: string }> }} EnvironmentValidation
 * @typedef {{
 *   effectiveConfiguration: (environment: Record<string, string>, declaration: Declaration, file: Record<string, string>) => ReadonlyArray<unknown>,
 *   renderEffectiveConfiguration: (rows: ReadonlyArray<never>) => string,
 *   validateEnvironmentValues: (environment: Record<string, string>, declaration: Declaration, options?: { mode?: string }) => EnvironmentValidation,
 * }} EnvironmentSurfaceModule
 * @typedef {{
 *   authLifecycleRecordPath: (artefactPath: string) => string,
 *   assertAuthCapabilityPreflight: (input: { artefactPath: string, environment: 'local' }) => unknown,
 *   AUTH_CAPABILITY_REFUSAL_CODES: Readonly<Record<string, string>>,
 *   AuthCapabilityRefusalError: abstract new (...args: never[]) => Error & { code: string, state: string },
 * }} CapabilityLifecycleModule
 */

const SECRET_SENTINEL = 'nw-synthetic-secret-sentinel-value';
const UNDECLARED_PROBE_NAME = 'NIGHTWATCH_SYNTHETIC_UNDECLARED_PROBE';

/**
 * @param {EnvironmentSurfaceModule} surface the environment-surface module
 * @param {Declaration} parsed the parsed declaration
 * @returns {{ failures: string[], rendered: number, secretRows: number, refused: number, required: number, unrejectable: number }}
 */
export function exerciseConfigurationContract(surface, parsed) {
  /** @type {string[]} */
  const failures = [];
  const variables = Array.isArray(parsed.variables) ? parsed.variables : [];
  if (variables.length === 0) failures.push('the declaration carries no variables to exercise');
  // 1. The effective configuration renders every declared variable, and a
  //    secret-bearing value set to a synthetic sentinel never reaches the text.
  /** @type {Record<string, string>} */
  const syntheticEnvironment = {};
  for (const entry of variables) {
    if (entry.secretBearing === true) syntheticEnvironment[entry.name] = SECRET_SENTINEL;
  }
  const rows = surface.effectiveConfiguration(syntheticEnvironment, parsed, {});
  const text = String(surface.renderEffectiveConfiguration(/** @type {ReadonlyArray<never>} */ (rows)));
  if (rows.length !== variables.length) failures.push(`effective configuration has ${rows.length} rows for ${variables.length} declared variables`);
  for (const entry of variables) {
    if (!text.includes(entry.name)) failures.push(`effective configuration omits ${entry.name}`);
  }
  if (text.includes(SECRET_SENTINEL)) failures.push('effective configuration leaked a secret-bearing value');
  const secretRows = variables.filter((entry) => entry.secretBearing === true).length;
  // 2. Every declared variable refuses a malformed value of its own shape.
  let refused = 0;
  let unrejectable = 0;
  for (const entry of variables) {
    const sample = MALFORMED_SAMPLE_BY_SHAPE[String(entry.shape?.kind)];
    if (sample === undefined) {
      unrejectable += 1;
      continue;
    }
    const validation = surface.validateEnvironmentValues({ [entry.name]: sample }, parsed);
    if (validation.refusals.some((refusal) => refusal.name === entry.name && refusal.code === 'ENVIRONMENT_VALUE_MALFORMED')) refused += 1;
    else failures.push(`${entry.name} (${entry.shape?.kind}) accepted a malformed value`);
  }
  // 3. A variable required in a mode refuses absence in that mode.
  let required = 0;
  for (const entry of variables) {
    for (const mode of entry.requiredIn ?? []) {
      const validation = surface.validateEnvironmentValues({}, parsed, { mode });
      if (validation.refusals.some((refusal) => refusal.name === entry.name && refusal.code === 'ENVIRONMENT_VALUE_REQUIRED')) required += 1;
      else failures.push(`${entry.name} did not refuse absence in mode ${mode}`);
    }
  }
  // 4. An undeclared NIGHTWATCH_* name is reported, never adopted.
  const unknownValidation = surface.validateEnvironmentValues({ [UNDECLARED_PROBE_NAME]: '1' }, parsed);
  if (!unknownValidation.unknown.some((entry) => entry.name === UNDECLARED_PROBE_NAME)) failures.push('an undeclared NIGHTWATCH_* name was not reported unknown');
  return { failures, rendered: rows.length, secretRows, refused, required, unrejectable };
}

/**
 * @param {CapabilityLifecycleModule} lifecycle the capabilityLifecycle module
 * @returns {{ failures: string[], refused: number, states: string[] }}
 */
export function exercisePreflightRefusal(lifecycle) {
  /** @type {string[]} */
  const failures = [];
  /** @type {string[]} */
  const states = [];
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-g21-'));
  try {
    const present = path.join(directory, 'present.storage-state.json');
    fs.writeFileSync(present, JSON.stringify({ cookies: [], origins: [] }), { mode: 0o600 });
    const malformed = path.join(directory, 'malformed.storage-state.json');
    fs.writeFileSync(malformed, JSON.stringify({ cookies: [], origins: [] }), { mode: 0o600 });
    fs.writeFileSync(lifecycle.authLifecycleRecordPath(malformed), '{ not a lifecycle record', { mode: 0o600 });
    // R3-17 / corrections task 8.16: EXPIRED and WRONG_ENVIRONMENT are part of
    // the pre-flight's closed state vocabulary and are exercised too.
    const expired = path.join(directory, 'expired.storage-state.json');
    fs.writeFileSync(expired, JSON.stringify({ cookies: [], origins: [] }), { mode: 0o600 });
    const wrongEnvironment = path.join(directory, 'wrong-environment.storage-state.json');
    fs.writeFileSync(wrongEnvironment, JSON.stringify({ cookies: [], origins: [] }), { mode: 0o600 });
    const digestOf = (file) => `sha256:${createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 24)}`;
    const lifecycleRecord = (file, environment, captureInstant, validityWindowMs) => JSON.stringify({
      schemaVersion: 'nightwatch.auth-capability-record.v1',
      captureInstant,
      environment,
      origin: 'http://127.0.0.1:9',
      earliestCookieExpiry: null,
      validityWindowMs,
      artefactDigest: digestOf(file),
    });
    fs.writeFileSync(
      lifecycle.authLifecycleRecordPath(expired),
      lifecycleRecord(expired, 'local', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), 60 * 60 * 1000),
      { mode: 0o600 },
    );
    fs.writeFileSync(
      lifecycle.authLifecycleRecordPath(wrongEnvironment),
      lifecycleRecord(wrongEnvironment, 'next', new Date().toISOString(), 24 * 60 * 60 * 1000),
      { mode: 0o600 },
    );
    const cases = [
      { state: 'MISSING', artefactPath: path.join(directory, 'absent.storage-state.json') },
      { state: 'UNKNOWN_AGE', artefactPath: present },
      { state: 'UNREADABLE', artefactPath: malformed },
      { state: 'EXPIRED', artefactPath: expired },
      { state: 'WRONG_ENVIRONMENT', artefactPath: wrongEnvironment },
    ];
    const listing = () => fs.readdirSync(directory).sort().join('\n');
    for (const item of cases) {
      const before = listing();
      /** @type {unknown} */
      let refusal = null;
      try {
        lifecycle.assertAuthCapabilityPreflight({ artefactPath: item.artefactPath, environment: 'local' });
      } catch (error) {
        refusal = error;
      }
      const expectedCode = lifecycle.AUTH_CAPABILITY_REFUSAL_CODES[item.state];
      if (refusal === null) failures.push(`${item.state} artefact was not refused`);
      else if (!(refusal instanceof lifecycle.AuthCapabilityRefusalError) || refusal.code !== expectedCode || refusal.state !== item.state) {
        failures.push(`${item.state} artefact refused with the wrong class or code`);
      } else {
        states.push(item.state);
      }
      if (listing() !== before) failures.push(`${item.state} refusal changed the artefact directory`);
    }
    return { failures, refused: states.length, states };
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
