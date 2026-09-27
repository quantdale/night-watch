// M8 task 9.3 (NW-AUD-015) — the storage-state artefact and its lifecycle
// sidecar publish as ONE transaction, and an interrupted publication is
// refused by readers until recovery resolves it.
import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  AUTH_BUNDLE_JOURNAL_SUFFIX,
  AUTH_BUNDLE_RECOVERY_REFUSED,
  AUTH_BUNDLE_TRANSACTION_PENDING,
  authBundleJournalPath,
  authBundleTransactionPending,
  authLifecycleRecordPath,
  buildAuthCapabilityRecord,
  publishAuthCapabilityBundle,
  recoverAuthCapabilityBundle,
} from '../../src/auth/capabilityLifecycle';

const SYNTHETIC_COOKIE_VALUE = 'SYNTHETIC_STATE_SENTINEL_3c9a71e5';

function syntheticState(expirySeconds: number): string {
  return JSON.stringify({
    cookies: [{
      name: 'synthetic_session',
      value: SYNTHETIC_COOKIE_VALUE,
      domain: 'appdev.alphaus.cloud',
      path: '/',
      expires: expirySeconds,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    }],
    origins: [],
  });
}

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-auth-bundle-'));
  const staged = path.join(directory, '.staged-state.json');
  const output = path.join(directory, 'ripple-state.json');
  fs.writeFileSync(staged, syntheticState(Math.floor(Date.now() / 1000) + 3600), { mode: 0o600 });
  fs.chmodSync(staged, 0o600);
  return { directory, staged, output };
}

function recordFor(staged: string) {
  return buildAuthCapabilityRecord({
    artefactPath: staged,
    environment: 'dev',
    origin: 'https://appdev.alphaus.cloud',
    validityWindowMs: 3_600_000,
  });
}

test.describe('auth capability bundle transaction (9.3)', () => {
  test('a published bundle commits the artefact and its sidecar together and leaves no journal', () => {
    const { staged, output } = fixture();
    const record = recordFor(staged);
    const published = publishAuthCapabilityBundle({ stagedArtefactPath: staged, outputPath: output, record });
    expect(published.recordPath).toBe(authLifecycleRecordPath(output));
    expect(fs.existsSync(output)).toBe(true);
    expect(fs.existsSync(published.recordPath)).toBe(true);
    expect(authBundleTransactionPending(output)).toBe(false);
    expect(fs.existsSync(staged)).toBe(false);
    // The record's digest is the digest of the COMMITTED artefact bytes.
    const digest = `sha256:${crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex').slice(0, 24)}`;
    expect(published.record.artefactDigest).toBe(digest);
    // No secret value reaches the sidecar.
    expect(fs.readFileSync(published.recordPath, 'utf8')).not.toContain(SYNTHETIC_COOKIE_VALUE);
  });

  test('a record whose digest does not match the staged artefact is refused before any rename', () => {
    const { staged, output } = fixture();
    const other = fixture();
    // A DIFFERENT capture: the staged bytes differ, so the digests differ.
    fs.writeFileSync(other.staged, syntheticState(Math.floor(Date.now() / 1000) + 7200), { mode: 0o600 });
    fs.chmodSync(other.staged, 0o600);
    const record = recordFor(other.staged);
    expect(() => publishAuthCapabilityBundle({ stagedArtefactPath: staged, outputPath: output, record }))
      .toThrow(/AUTH_BUNDLE_DIGEST_MISMATCH/);
    expect(fs.existsSync(output)).toBe(false);
    expect(authBundleTransactionPending(output)).toBe(false);
  });

  test('an interrupted publication (journal plus staged bytes) is completed by recovery', () => {
    const { directory, staged, output } = fixture();
    const record = recordFor(staged);
    const recordPath = authLifecycleRecordPath(output);
    // Simulate the crash window: the journal exists, both files are staged,
    // and neither final has been renamed yet.
    const recordStaged = path.join(directory, '.staged-record.json');
    fs.writeFileSync(recordStaged, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
    fs.writeFileSync(authBundleJournalPath(output), `${JSON.stringify({
      schemaVersion: 'nightwatch.auth-bundle-transaction.v1',
      artefactStaged: staged,
      artefactFinal: output,
      artefactDigest: `sha256:${crypto.createHash('sha256').update(fs.readFileSync(staged)).digest('hex').slice(0, 24)}`,
      recordStaged,
      recordFinal: recordPath,
      recordDigest: `sha256:${crypto.createHash('sha256').update(fs.readFileSync(recordStaged)).digest('hex').slice(0, 24)}`,
    }, null, 2)}\n`);
    expect(authBundleTransactionPending(output)).toBe(true);
    expect(recoverAuthCapabilityBundle(output)).toBe('COMPLETED');
    expect(fs.existsSync(output)).toBe(true);
    expect(fs.existsSync(recordPath)).toBe(true);
    expect(authBundleTransactionPending(output)).toBe(false);
  });

  test('recovery finishes a commit whose journal removal was lost', () => {
    const { staged, output } = fixture();
    const published = publishAuthCapabilityBundle({ stagedArtefactPath: staged, outputPath: output, record: recordFor(staged) });
    const journal = authBundleJournalPath(output);
    fs.writeFileSync(journal, `${JSON.stringify({
      schemaVersion: 'nightwatch.auth-bundle-transaction.v1',
      artefactStaged: path.join(path.dirname(output), '.gone'),
      artefactFinal: output,
      artefactDigest: published.record.artefactDigest,
      recordStaged: path.join(path.dirname(output), '.gone-record'),
      recordFinal: published.recordPath,
      recordDigest: `sha256:${crypto.createHash('sha256').update(fs.readFileSync(published.recordPath)).digest('hex').slice(0, 24)}`,
    }, null, 2)}\n`);
    expect(recoverAuthCapabilityBundle(output)).toBe('COMPLETED');
    expect(authBundleTransactionPending(output)).toBe(false);
  });

  test('recovery refuses when neither the staged nor the final bytes match the journal', () => {
    const { directory, staged, output } = fixture();
    fs.writeFileSync(authBundleJournalPath(output), `${JSON.stringify({
      schemaVersion: 'nightwatch.auth-bundle-transaction.v1',
      artefactStaged: staged,
      artefactFinal: output,
      artefactDigest: 'sha256:000000000000000000000000',
      recordStaged: path.join(directory, '.absent-record'),
      recordFinal: authLifecycleRecordPath(output),
      recordDigest: 'sha256:000000000000000000000000',
    }, null, 2)}\n`);
    expect(() => recoverAuthCapabilityBundle(output)).toThrow(new RegExp(AUTH_BUNDLE_RECOVERY_REFUSED));
  });

  test('a malformed journal is refused rather than guessed at', () => {
    const { output } = fixture();
    fs.writeFileSync(authBundleJournalPath(output), '{ not json');
    expect(() => recoverAuthCapabilityBundle(output)).toThrow(new RegExp(AUTH_BUNDLE_RECOVERY_REFUSED));
  });

  test('the journal suffix is a distinct artifact and the capture path publishes through the bundle', () => {
    expect(authBundleJournalPath('/tmp/synthetic-state.json')).toBe(`/tmp/synthetic-state.json${AUTH_BUNDLE_JOURNAL_SUFFIX}`);
    const runner = fs.readFileSync(path.resolve(__dirname, '..', '..', 'src', 'auth', 'directRunner.ts'), 'utf8');
    expect(runner).toContain('publishAuthCapabilityBundle({');
    // The old separate-write pair is gone: no bare record write beside a
    // separately-renamed artefact.
    expect(runner).not.toContain('writeAuthCaptureRecord(');
    expect(runner).not.toContain('atomicallyReplaceValidatedStorageState(pendingOutputPath, outputPath');
    expect(AUTH_BUNDLE_TRANSACTION_PENDING).toBe('AUTH_BUNDLE_TRANSACTION_PENDING');
  });
});
