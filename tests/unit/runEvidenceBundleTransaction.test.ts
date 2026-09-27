// M8 task 9.7 (NW-AUD-024 residual, R2-02/R2-08/R2-25/R2-39/R2-40/R2-43/R2-64) —
// the run-evidence bundle is a bounded, generation-identified transaction: the
// manifest parse fails closed, appends are bounded at append time, the download
// cancel is in a finally, and the writer/reader surfaces are censused.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RunRecorder } from '../../src/core/evidence/runRecorder';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RECORDER = fs.readFileSync(path.join(REPO_ROOT, 'src', 'core', 'evidence', 'runRecorder.ts'), 'utf8');
const CONTEXT = fs.readFileSync(path.join(REPO_ROOT, 'src', 'browser', 'context.ts'), 'utf8');

function recorderFor(runId: string): { recorder: RunRecorder; root: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-run-evidence-'));
  const recorder = new RunRecorder({
    runId,
    artifactsRoot: root,
    environment: 'local',
    product: 'ripple',
    browser: 'chromium',
    scenario: 'synthetic-scenario',
  });
  return { recorder, root };
}

test.describe('run evidence bundle transaction integrity (9.7)', () => {
  test('a run is identified by a generation token, not only by its reused run id', () => {
    const first = recorderFor('synthetic-generation');
    const second = recorderFor('synthetic-generation');
    const firstManifest = JSON.parse(fs.readFileSync(path.join(first.recorder.dir, 'manifest.json'), 'utf8')) as Record<string, string>;
    const secondManifest = JSON.parse(fs.readFileSync(path.join(second.recorder.dir, 'manifest.json'), 'utf8')) as Record<string, string>;
    expect(firstManifest.runId).toBe('synthetic-generation');
    expect(firstManifest.generation).toMatch(/^[0-9a-f]{24}$/);
    expect(secondManifest.generation).toMatch(/^[0-9a-f]{24}$/);
    expect(firstManifest.generation).not.toBe(secondManifest.generation);
    // The exclusive directory still refuses a second recorder in one generation.
    expect(() => new RunRecorder({
      runId: 'synthetic-generation',
      artifactsRoot: first.root,
      environment: 'local',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'synthetic-scenario',
    })).toThrow(/RUN_EVIDENCE_DIRECTORY_EXISTS/);
  });

  test('a malformed manifest is refused instead of silently replaced with an empty one', () => {
    const { recorder } = recorderFor('synthetic-manifest');
    fs.writeFileSync(path.join(recorder.dir, 'manifest.json'), '{ not json');
    expect(() => recorder.addManifestEntry('scenario', 'synthetic')).toThrow(/RUN_EVIDENCE_MANIFEST_INVALID/);
    // The malformed bytes are left exactly as they were: no partial rewrite.
    expect(fs.readFileSync(path.join(recorder.dir, 'manifest.json'), 'utf8')).toBe('{ not json');
  });

  test('the append-time bound refuses an oversized record rather than writing it', () => {
    const { recorder } = recorderFor('synthetic-bounds');
    // A record larger than the whole-stream bound must be refused at the append.
    const huge = 'x'.repeat(17 * 1024 * 1024);
    expect(() => recorder.event({ type: 'env', severity: 'info', message: huge })).toThrow();
    const eventsPath = path.join(recorder.dir, 'events.jsonl');
    const size = fs.existsSync(eventsPath) ? fs.statSync(eventsPath).size : 0;
    expect(size).toBeLessThan(17 * 1024 * 1024);
  });

  test('the download cancel runs in a finally so every path cancels', () => {
    const onDownload = CONTEXT.slice(CONTEXT.indexOf('async function onDownload('));
    const finallyAt = onDownload.indexOf('} finally {');
    const cancelAt = onDownload.indexOf('await download.cancel();');
    expect(finallyAt).toBeGreaterThan(0);
    expect(cancelAt).toBeGreaterThan(finallyAt);
    // Exactly one cancel site, and it is not inside the recording try.
    expect((onDownload.match(/download\.cancel\(\)/g) ?? []).length).toBe(1);
  });

  test('writer/reader census: the bundle has one exclusive writer and a bounded, fail-closed reader', () => {
    // One writer: the recorder owns every publish path.
    const publishers = RECORDER.match(/private publishJson\(/g) ?? [];
    expect(publishers.length).toBe(1);
    // The writer fsyncs the file, the directory and every appended line.
    expect(RECORDER).toContain('fs.fsyncSync(descriptor);');
    expect(RECORDER).toContain('this.fsyncRunDirectory();');
    expect(RECORDER).toContain('RUN_EVIDENCE_DIRECTORY_FSYNC_FAILED');
    // The reader's durable-state parse fails closed on every malformed shape.
    const invalid = RECORDER.match(/RUN_EVIDENCE_DURABLE_STATE_INVALID/g) ?? [];
    expect(invalid.length).toBeGreaterThanOrEqual(4);
    // The append bound is enforced at append time, with its own code.
    expect(RECORDER).toContain('RUN_EVIDENCE_APPEND_BOUND_EXCEEDED');
    expect(RECORDER).toMatch(/private appendedEventRecords = 0;/);
    expect(RECORDER).toMatch(/private appendedEventBytes = 0;/);
  });

  test('a killed writer leaves a readable-or-refused bundle, never a half-written record', async () => {
    const { recorder } = recorderFor('synthetic-killed-writer');
    recorder.event({ type: 'env', severity: 'info', message: 'synthetic complete record' });
    const eventsPath = path.join(recorder.dir, 'events.jsonl');
    const good = fs.readFileSync(eventsPath, 'utf8');
    expect(good.endsWith('\n')).toBe(true);
    // Simulate a writer killed mid-append: a torn final line.
    fs.appendFileSync(eventsPath, '{"seq":9999,"ts":"2026-01-01T00:00:00.000Z"');
    // A torn line is refused by the strict durable reader, never parsed as a
    // partial event.
    await expect(recorder.finalize({ passed: true })).rejects.toThrow(/RUN_EVIDENCE_DURABLE_STATE_INVALID/);
  });

  test('a temporary-name collision cannot overwrite another writer’s file', () => {
    // The atomic publish opens its temporary with the exclusive-create flag, so
    // a collision fails instead of truncating an existing file.
    expect(RECORDER).toContain("'wx'");
    expect(RECORDER).toMatch(/openSync\([^)]*'wx'/);
  });
});
