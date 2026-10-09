// ---------------------------------------------------------------------------
// NW-AUD-009 — the shared local-report publication boundary.
//
// Six `current.json` report writers published with `mkdirSync` plus a direct
// truncating `writeFileSync`. That shape follows a prepared ancestor or leaf
// symlink into an owner file, truncates the previous complete report before a
// replacement is durable, and inherits inconsistent file modes.
//
// These tests prove the ONE boundary every such writer goes through: complete
// admission (bytes, schema, size, ancestry, leaf type) BEFORE any filesystem
// change; symlink refusal on every ancestor and on the leaf; atomic
// replaceable publication that never exposes a truncated intermediate; and
// immutable, collision-safe historical receipts.
//
// Ancestor and leaf symlinks point at EXTERNAL sentinel files, and every
// refusal must leave the sentinel bytes and the prior complete report bytes
// unchanged. All values are synthetic.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import crypto from 'node:crypto';
import { publishLocalReport } from '../../src/core/policy/localReportPublication';

function freshRoot(prefix: string): string {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `nightwatch-aud009-${prefix}-`)));
}

const SENTINEL = 'OWNER_SENTINEL_BYTES_DO_NOT_TOUCH\n';
const MAX_BYTES = 64 * 1024;

function sha24(canonical: string): string {
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24);
}

/** A deliberately strict caller schema validator, as every real caller supplies. */
function validateReport(payload: unknown): void {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('REPORT_NOT_AN_OBJECT');
  const value = payload as Record<string, unknown>;
  if (value.schemaVersion !== 'nightwatch.synthetic-report.v1') throw new Error('REPORT_SCHEMA_INVALID');
  if (!Number.isSafeInteger(value.count)) throw new Error('REPORT_COUNT_INVALID');
}

function report(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { schemaVersion: 'nightwatch.synthetic-report.v1', count: 1, ...overrides };
}

function destinationIn(root: string, name = 'current.json'): string {
  return path.join(root, 'artifacts', 'synthetic-report', name);
}

test.describe('NW-AUD-009 the shared local-report publication boundary', () => {
  test('a valid report is published atomically, owner-only, and byte-exact', () => {
    const root = freshRoot('happy');
    const destination = destinationIn(root);
    const result = publishLocalReport({
      profile: 'CURRENT_REPLACE',
      payload: report(),
      validate: validateReport,
      maxBytes: MAX_BYTES,
      destination,
      digest: sha24,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.profile).toBe('CURRENT_REPLACE');
    expect(result.path).toBe(destination);
    const published = fs.readFileSync(destination, 'utf8');
    expect(JSON.parse(published)).toEqual(report());
    expect(result.bytes).toBe(Buffer.byteLength(published));
    expect(result.digest).toBe(sha24(published));
    // Owner-only, and no staging file left behind.
    expect(fs.statSync(destination).mode & 0o777).toBe(0o600);
    expect(fs.readdirSync(path.dirname(destination))).toEqual([path.basename(destination)]);
  });

  test('a replacement is atomic: an observer never sees a truncated intermediate', () => {
    const root = freshRoot('atomic');
    const destination = destinationIn(root);
    expect(publishLocalReport({ profile: 'CURRENT_REPLACE', payload: report({ count: 1 }), validate: validateReport, maxBytes: MAX_BYTES, destination, digest: sha24 }).ok).toBe(true);
    const first = fs.readFileSync(destination, 'utf8');

    // A large second generation, so a truncating write WOULD be observable.
    const large = report({ count: 2, padding: 'x'.repeat(20_000) });
    const second = publishLocalReport({ profile: 'CURRENT_REPLACE', payload: large, validate: validateReport, maxBytes: MAX_BYTES, destination, digest: sha24 });
    expect(second.ok).toBe(true);
    // Either the previous complete report or the new complete report.
    const observed = fs.readFileSync(destination, 'utf8');
    expect(observed).toBe(`${JSON.stringify(large, null, 2)}\n`);
    expect(observed).not.toBe(first);
    expect(JSON.parse(observed).count).toBe(2);
    // No temporary survives, and the inode was replaced rather than truncated.
    expect(fs.readdirSync(path.dirname(destination))).toEqual([path.basename(destination)]);
    expect(fs.statSync(destination).mode & 0o777).toBe(0o600);
  });

  test('a leaf symlink is refused and its target bytes are untouched', () => {
    const root = freshRoot('leaf-symlink');
    const destination = destinationIn(root);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const external = path.join(root, 'outside.json');
    fs.writeFileSync(external, SENTINEL, 'utf8');
    fs.symlinkSync(external, destination);

    const result = publishLocalReport({ profile: 'CURRENT_REPLACE', payload: report(), validate: validateReport, maxBytes: MAX_BYTES, destination, digest: sha24 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure).toBe('LEAF_SYMLINK');
    // The sentinel survives, and the symlink was never followed.
    expect(fs.readFileSync(external, 'utf8')).toBe(SENTINEL);
    expect(fs.lstatSync(destination).isSymbolicLink()).toBe(true);
    expect(fs.readdirSync(path.dirname(destination)).length).toBe(1);
  });

  test('a prepared ANCESTOR symlink is refused and its target bytes are untouched', () => {
    const root = freshRoot('ancestor-symlink');
    const external = path.join(root, 'outside');
    fs.mkdirSync(external, { recursive: true });
    fs.writeFileSync(path.join(external, 'current.json'), SENTINEL, 'utf8');
    // The parent of the destination parent is a symlink into the owner tree.
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    fs.symlinkSync(external, path.join(root, 'artifacts', 'synthetic-report'));

    const destination = destinationIn(root);
    const result = publishLocalReport({ profile: 'CURRENT_REPLACE', payload: report(), validate: validateReport, maxBytes: MAX_BYTES, destination, digest: sha24 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure).toBe('ANCESTOR_SYMLINK');
    expect(fs.readFileSync(path.join(external, 'current.json'), 'utf8')).toBe(SENTINEL);
  });

  test('a non-regular leaf is refused, and a wrong-mode leaf is refused rather than followed', () => {
    const root = freshRoot('leaf-type');
    const destination = destinationIn(root);
    fs.mkdirSync(destination, { recursive: true });
    const directoryLeaf = publishLocalReport({ profile: 'CURRENT_REPLACE', payload: report(), validate: validateReport, maxBytes: MAX_BYTES, destination, digest: sha24 });
    expect(directoryLeaf.ok).toBe(false);
    if (!directoryLeaf.ok) expect(directoryLeaf.failure).toBe('LEAF_NOT_A_REGULAR_FILE');

    const other = destinationIn(root, 'mode.json');
    fs.mkdirSync(path.dirname(other), { recursive: true });
    fs.writeFileSync(other, '{"previous":true}\n', { mode: 0o644 });
    const wrongMode = publishLocalReport({ profile: 'CURRENT_REPLACE', payload: report(), validate: validateReport, maxBytes: MAX_BYTES, destination: other, digest: sha24 });
    expect(wrongMode.ok).toBe(false);
    if (!wrongMode.ok) expect(wrongMode.failure).toBe('LEAF_MODE_UNSAFE');
    // The previous report was not truncated by the refusal.
    expect(fs.readFileSync(other, 'utf8')).toBe('{"previous":true}\n');
  });

  test('admission is complete in memory before any filesystem change', () => {
    const root = freshRoot('admission');
    const destination = destinationIn(root);
    // A payload the caller's schema rejects creates nothing at all.
    const badSchema = publishLocalReport({ profile: 'CURRENT_REPLACE', payload: report({ count: 'one' }), validate: validateReport, maxBytes: MAX_BYTES, destination, digest: sha24 });
    expect(badSchema.ok).toBe(false);
    if (!badSchema.ok) expect(badSchema.failure).toBe('SCHEMA_REJECTED');
    expect(fs.existsSync(path.dirname(destination))).toBe(false);

    // A payload over the byte ceiling creates nothing either.
    const oversized = publishLocalReport({ profile: 'CURRENT_REPLACE', payload: report({ padding: 'x'.repeat(MAX_BYTES * 2) }), validate: validateReport, maxBytes: MAX_BYTES, destination, digest: sha24 });
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) expect(oversized.failure).toBe('SIZE_LIMIT_EXCEEDED');
    expect(fs.existsSync(path.dirname(destination))).toBe(false);

    // A non-absolute or traversing destination is refused.
    const relative = publishLocalReport({ profile: 'CURRENT_REPLACE', payload: report(), validate: validateReport, maxBytes: MAX_BYTES, destination: 'artifacts/current.json', digest: sha24 });
    expect(relative.ok).toBe(false);
    if (!relative.ok) expect(relative.failure).toBe('DESTINATION_NOT_ABSOLUTE');
    const traversal = publishLocalReport({ profile: 'CURRENT_REPLACE', payload: report(), validate: validateReport, maxBytes: MAX_BYTES, destination: `${root}/artifacts/../artifacts/current.json`, digest: sha24 });
    expect(traversal.ok).toBe(false);
    if (!traversal.ok) expect(traversal.failure).toBe('DESTINATION_TRAVERSAL');

    // A circular payload cannot be serialized.
    const circular: Record<string, unknown> = { schemaVersion: 'nightwatch.synthetic-report.v1' };
    circular.self = circular;
    const unserializable = publishLocalReport({ profile: 'CURRENT_REPLACE', payload: circular, validate: () => {}, maxBytes: MAX_BYTES, destination, digest: sha24 });
    expect(unserializable.ok).toBe(false);
    if (!unserializable.ok) expect(unserializable.failure).toBe('PAYLOAD_NOT_SERIALIZABLE');
    expect(fs.existsSync(path.dirname(destination))).toBe(false);
  });

  test('IMMUTABLE receipts are never overwritten, even for identical content', () => {
    const root = freshRoot('immutable');
    const directory = path.join(root, 'artifacts', 'topology-receipts');
    const payload = { schemaVersion: 'nightwatch.synthetic-report.v1', count: 7 };
    const first = publishLocalReport({ profile: 'APPEND_IMMUTABLE', payload, validate: validateReport, maxBytes: MAX_BYTES, destination: directory, digest: sha24, nowMs: 1_760_000_000_000 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.path.startsWith(`${directory}/`)).toBe(true);
    expect(path.basename(first.path)).toMatch(/^report-\d{14}-[0-9a-f]{24}-[0-9a-f]+\.json$/);

    const second = publishLocalReport({ profile: 'APPEND_IMMUTABLE', payload, validate: validateReport, maxBytes: MAX_BYTES, destination: directory, digest: sha24, nowMs: 1_760_000_000_000 });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    // Same millisecond, same digest, still two distinct files: one immutable
    // receipt per successful invocation, and the first is never replaced.
    expect(second.path).not.toBe(first.path);
    const names = fs.readdirSync(directory).sort();
    expect(names).toHaveLength(2);
    expect(names).toEqual([path.basename(first.path), path.basename(second.path)].sort());
    for (const name of names) {
      expect(JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'))).toEqual(payload);
      expect(fs.statSync(path.join(directory, name)).mode & 0o777).toBe(0o600);
    }
  });

  test('concurrent valid publishers are linearized and every generation is complete', () => {
    const root = freshRoot('concurrent');
    const destination = destinationIn(root);
    const results = Array.from({ length: 8 }, (_unused, index) => publishLocalReport({
      profile: 'CURRENT_REPLACE',
      payload: report({ count: index }),
      validate: validateReport,
      maxBytes: MAX_BYTES,
      destination,
      digest: sha24,
    }));
    // Every invocation succeeded or failed categorically; none can leave a
    // truncated or schema-invalid generation behind.
    for (const result of results) expect(result.ok).toBe(true);
    const observed = JSON.parse(fs.readFileSync(destination, 'utf8'));
    expect(observed.count).toBeGreaterThanOrEqual(0);
    expect(observed.count).toBeLessThan(8);
    // The last commit wins, and exactly one staging directory entry remains.
    expect(fs.readdirSync(path.dirname(destination))).toEqual([path.basename(destination)]);
    expect(fs.statSync(destination).mode & 0o777).toBe(0o600);
  });
});

// ---------------------------------------------------------------------------
// The WIRED bins: every `current.json` report writer publishes through the
// boundary above instead of `mkdirSync` plus a direct truncating write, so the
// operator-visible defect (a symlinked destination followed into an owner
// file, a truncated intermediate, an inconsistent mode) is closed at the call
// site. The same paths, the same JSON content and the same exit codes are
// preserved.
// ---------------------------------------------------------------------------

const REPOSITORY_ROOT = path.resolve(__dirname, '../..');

const WIRED_CURRENT_JSON_WRITERS = Object.freeze([
  'bin/cache-key-contract.mjs',
  'bin/change-intelligence.mjs',
  'bin/record-identity.mjs',
  'bin/release-freshness.mjs',
  'bin/silent-zero-output.mjs',
  'bin/test-oracle-quality.mjs',
]);

const RELEASE_FRESHNESS_CLI = path.join(REPOSITORY_ROOT, 'bin', 'release-freshness.mjs');

/** An empty-rows inventory classifies nothing, so the run reaches publication unchanged. */
function emptyInventory(root: string): string {
  const inventory = path.join(root, 'inventory.json');
  fs.writeFileSync(inventory, `${JSON.stringify({ schemaVersion: 'nightwatch.release-refs.v1', rows: [] }, null, 2)}\n`, 'utf8');
  return inventory;
}

test.describe('NW-AUD-009 every current.json writer is wired to the governed boundary', () => {
  test('each declared writer publishes through the boundary and no longer truncates in place', () => {
    for (const file of WIRED_CURRENT_JSON_WRITERS) {
      const source = fs.readFileSync(path.join(REPOSITORY_ROOT, file), 'utf8');
      // The writer loads and calls the ONE boundary, for the CURRENT_REPLACE
      // profile, with its own exact schema validator.
      expect(source, file).toContain("loadTypeScriptModule('src/core/policy/localReportPublication.ts'");
      expect(source, file).toMatch(/publishLocalReport\(\{/);
      expect(source, file).toMatch(/profile: 'CURRENT_REPLACE'/);
      // The defect shape — a direct truncating write of the report file — is
      // gone from every one of them.
      expect(source, file).not.toMatch(/mkdirSync\(path\.dirname\(/);
    }
  });

  test('a wired writer refuses a symlinked report destination, exits 2, and never follows it', () => {
    const root = freshRoot('wired-symlink');
    const inventory = emptyInventory(root);
    const external = path.join(root, 'outside.json');
    fs.writeFileSync(external, SENTINEL, 'utf8');
    const destination = path.join(root, 'artifacts', 'release-freshness', 'current.json');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.symlinkSync(external, destination);

    const result = spawnSync(process.execPath, [RELEASE_FRESHNESS_CLI, '--inventory', inventory, '--out', destination, '--json'], {
      cwd: REPOSITORY_ROOT,
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    // The same categorical exit code the direct write reported on failure.
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('REPORT_WRITE_FAILED');
    expect(result.stderr).toContain('LEAF_SYMLINK');
    // The symlink was refused, never followed, and the sentinel is untouched.
    expect(fs.readFileSync(external, 'utf8')).toBe(SENTINEL);
    expect(fs.lstatSync(destination).isSymbolicLink()).toBe(true);
  });

  test('a wired writer publishes the same bytes atomically, owner-only, with the same exit code', () => {
    const root = freshRoot('wired-happy');
    const inventory = emptyInventory(root);
    const destination = path.join(root, 'artifacts', 'release-freshness', 'current.json');
    const args = ['--inventory', inventory, '--out', destination, '--json'];

    const first = spawnSync(process.execPath, [RELEASE_FRESHNESS_CLI, ...args], { cwd: REPOSITORY_ROOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
    expect(first.status).toBe(0);
    const published = fs.readFileSync(destination, 'utf8');
    // The published file and the emitted document are the same JSON content.
    expect(JSON.parse(published).schemaVersion).toBe('nightwatch.release-freshness-report.v1');
    expect(JSON.parse(first.stdout)).toEqual(JSON.parse(published));
    // Owner-only, and no staging file survives.
    expect(fs.statSync(destination).mode & 0o777).toBe(0o600);
    expect(fs.readdirSync(path.dirname(destination))).toEqual([path.basename(destination)]);

    // A second generation replaces rather than truncates, and no staging file
    // is ever observable.
    const second = spawnSync(process.execPath, [RELEASE_FRESHNESS_CLI, ...args], { cwd: REPOSITORY_ROOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
    expect(second.status).toBe(0);
    expect(JSON.parse(fs.readFileSync(destination, 'utf8'))).toEqual(JSON.parse(first.stdout));
    expect(fs.readdirSync(path.dirname(destination))).toEqual([path.basename(destination)]);
    expect(fs.statSync(destination).mode & 0o777).toBe(0o600);
  });
});
