import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  inspectStorageStateKeyPresence,
  inspectStorageStateKeySemantics,
  validateStorageStateFile,
} from '../../src/browser/fixtures/storageState';
import {
  SENSITIVE_READ_FAILURES,
  errnoCode,
  sensitiveDiagnostic,
  sensitivePathDigest,
} from '../../src/core/policy/sensitiveDiagnostics';

/**
 * NW-13. Storage state is credential material. Its JSON parse failures were
 * reported by wrapping the native `SyntaxError.message`, and Node embeds a
 * window of the INPUT around the offending token:
 *
 *   Unexpected token 'o', ..."_ABCDEF": oops}" is not valid JSON
 *
 * Measured on Node 22.22.1, the leak is position-dependent — a window of
 * roughly twenty characters centred on the syntax error, which can be a
 * prefix, a middle fragment, or a suffix of a planted secret depending on
 * where the malformation sits. Two of the parse sites did not even wrap the
 * error, so the raw `SyntaxError` propagated untouched.
 *
 * The invariant is therefore not "no prefix" but "no fragment": no substring
 * of a planted secret, of any length worth recognising, may appear in
 * anything the process emits.
 */

/** Obviously fabricated. Long enough that a fragment is unmistakable. */
const PLANTED = 'PLANTED_NW13_SECRET_eyJhbGciOiJIUzI1NiJ9_TAIL_MARKER';
const MIN_FRAGMENT = 6;

/** The longest fragment of PLANTED that appears in `text`, or ''. */
function longestPlantedFragment(text: string): string {
  let longest = '';
  for (let start = 0; start < PLANTED.length; start += 1) {
    for (let end = start + MIN_FRAGMENT; end <= PLANTED.length; end += 1) {
      const candidate = PLANTED.slice(start, end);
      if (text.includes(candidate) && candidate.length > longest.length) longest = candidate;
    }
  }
  return longest;
}

/**
 * Malformed documents that place the planted secret at the beginning, middle
 * and end relative to the syntax error, so at least one of them lands inside
 * Node's error window whatever its exact formatting.
 */
const MALFORMED = {
  'secret adjacent to a stray token': `{${JSON.stringify(PLANTED)}: oops}`,
  'secret immediately before the error': `{"token":"${PLANTED}"oops}`,
  'secret then trailing garbage': `{"token":"${PLANTED}"}${PLANTED}`,
  'secret inside an unterminated string': `{"token":"${PLANTED}`,
  'secret in a truncated document': `{"cookies":[{"name":"a","value":"${PLANTED}"`,
} as const;

function tmpStateFile(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw13-'));
  const file = path.join(dir, 'state.json');
  fs.writeFileSync(file, content, { mode: 0o600 });
  return file;
}

const NIGHTWATCH_ROOT = path.resolve(__dirname, '..', '..');
const WORKSPACE_ROOT = path.resolve(NIGHTWATCH_ROOT, '..');

function everythingThrown(run: () => unknown): string {
  try {
    run();
    return '';
  } catch (error) {
    // The whole error, not just its message: a `cause` chain, a stack frame,
    // or an enumerable property can carry the excerpt just as far.
    const parts = [
      String((error as Error)?.message ?? ''),
      String((error as Error)?.stack ?? ''),
      String((error as { cause?: unknown })?.cause ?? ''),
    ];
    try {
      parts.push(JSON.stringify(error, Object.getOwnPropertyNames(error as object)));
    } catch {
      // A payload that cannot be serialised is not a reason to skip the rest.
    }
    return parts.join('\n');
  }
}

test.describe('NW-13 — sensitive parse diagnostics are content-free', () => {
  test('a malformed storage-state file never echoes a fragment of its content', () => {
    for (const [name, content] of Object.entries(MALFORMED)) {
      const file = tmpStateFile(content);
      try {
        const thrown = everythingThrown(() =>
          validateStorageStateFile(file, { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT }));
        expect(thrown, `${name}: nothing was thrown`).not.toBe('');
        const leak = longestPlantedFragment(thrown);
        expect(leak, `${name}: leaked ${JSON.stringify(leak)}`).toBe('');
      } finally {
        fs.rmSync(path.dirname(file), { recursive: true, force: true });
      }
    }
  });

  test('the other storage-state parse sites are content-free too', () => {
    // These two called JSON.parse with no catch at all, so the raw SyntaxError
    // propagated with its window of the input intact.
    for (const [name, content] of Object.entries(MALFORMED)) {
      const file = tmpStateFile(content);
      try {
        for (const [site, run] of [
          ['inspectStorageStateKeyPresence', () => inspectStorageStateKeyPresence(file, { cookie: ['nw_session'] })],
          ['inspectStorageStateKeySemantics', () => inspectStorageStateKeySemantics(file, {
            authTokenKey: 'nw_session',
            apiTypeKey: 'api_type',
            apiTypeExpected: 'x',
            appTypeKey: 'app_type',
            appTypeExpected: 'y',
          })],
        ] as const) {
          const thrown = everythingThrown(run);
          expect(thrown, `${site} / ${name}: nothing was thrown`).not.toBe('');
          expect(longestPlantedFragment(thrown), `${site} / ${name} leaked content`).toBe('');
        }
      } finally {
        fs.rmSync(path.dirname(file), { recursive: true, force: true });
      }
    }
  });

  test('the operator still gets a category, not one opaque failure', () => {
    // Collapsing every failure into a single code would trade a privacy bug
    // for a diagnosability bug. Missing, unsafe-path and malformed-JSON must
    // stay distinguishable.
    const malformed = tmpStateFile('this is not json {');
    try {
      expect(() => validateStorageStateFile(malformed, { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT }))
        .toThrow(/not valid JSON/);
      const missing = path.join(path.dirname(malformed), 'absent.json');
      const missingThrown = everythingThrown(() =>
        validateStorageStateFile(missing, { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT }));
      expect(missingThrown).not.toMatch(/not valid JSON/);
      expect(missingThrown).not.toBe('');
    } finally {
      fs.rmSync(path.dirname(malformed), { recursive: true, force: true });
    }
  });

  test('a diagnostic can only be built from allowlisted parts', () => {
    const rendered = sensitiveDiagnostic('SYNTHETIC_CODE', {
      failure: 'MALFORMED_JSON',
      errno: 'ENOENT',
      bytes: 42,
      target: '/synthetic/path/state.json',
    });
    expect(rendered).toContain('failure=MALFORMED_JSON');
    expect(rendered).toContain('errno=ENOENT');
    expect(rendered).toContain('bytes=42');
    expect(rendered).toContain('pathClass=ABSOLUTE');
    expect(rendered).toContain(`pathDigest=${sensitivePathDigest('/synthetic/path/state.json')}`);
    // The path itself is never rendered — only its class and digest.
    expect(rendered).not.toContain('/synthetic/path/state.json');
    expect(rendered).not.toContain('state.json');

    // An unknown failure class or an unsafe errno cannot be smuggled through.
    expect(() => sensitiveDiagnostic('C', { failure: 'constructor' as never })).toThrow('SENSITIVE_DIAGNOSTIC_FAILURE_UNKNOWN');
    expect(() => sensitiveDiagnostic('C', { failure: 'MISSING', errno: `leaked ${PLANTED}` })).toThrow('SENSITIVE_DIAGNOSTIC_ERRNO_UNSAFE');
    expect(() => sensitiveDiagnostic('C', { failure: 'MISSING', bytes: -1 })).toThrow('SENSITIVE_DIAGNOSTIC_BYTES_UNSAFE');
    expect(SENSITIVE_READ_FAILURES).toContain('SCHEMA_INVALID');
  });

  test('errnoCode reports the code and never the message', () => {
    const thrown = everythingThrown(() => fs.readFileSync(path.join(os.tmpdir(), `nw13-absent-${PLANTED}`)));
    // The native fs message embeds the path, and the path here embeds the
    // planted value — which is exactly why the code is what gets reported.
    expect(longestPlantedFragment(thrown)).not.toBe('');
    try {
      fs.readFileSync(path.join(os.tmpdir(), `nw13-absent-${PLANTED}`));
      throw new Error('the read should have failed');
    } catch (error) {
      const code = errnoCode(error);
      expect(code).toBe('ENOENT');
      expect(longestPlantedFragment(code)).toBe('');
    }
    expect(errnoCode(new Error('plain error'))).toBe('UNKNOWN');
    expect(errnoCode(null)).toBe('UNKNOWN');
    expect(errnoCode({ code: `EVIL ${PLANTED}` })).toBe('UNKNOWN');
  });
});
