// ---------------------------------------------------------------------------
// Nightwatch — RunRecorder unit tests.
// Fixtures live under <nightwatch>/.tmp-test/evidence and are cleaned up.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { RunRecorder, createRunId } from '../../src/core/evidence/runRecorder';
import type { RepoSnapshotRecord } from '../../src/core/evidence/types';

const TMP_ROOT = path.join(__dirname, '..', '..', '.tmp-test', 'evidence');
const FIXED = '2026-08-09T02:42:50.000Z';
const now = () => new Date(FIXED);

function baseOpts(runId: string) {
  return {
    runId,
    environment: 'local',
    product: 'ripple',
    browser: 'chromium',
    scenario: 'smoke',
    now,
    artifactsRoot: TMP_ROOT,
  };
}

function readJsonl(file: string): Array<Record<string, unknown>> {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  return lines.map((l) => JSON.parse(l) as Record<string, unknown>);
}

/** Minimal Playwright-like page stub: writes the png at the path it is given. */
const stubPage = {
  screenshot: async (opts?: { path?: string }) => {
    if (opts?.path) fs.writeFileSync(opts.path, 'fake-png-bytes');
    return 'ok';
  },
} as any;

test.beforeAll(() => {
  fs.mkdirSync(TMP_ROOT, { recursive: true });
});

test.afterAll(() => {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

test.describe('RunRecorder', () => {
  test('manifest.json is written at construction with all required fields', () => {
    const rec = new RunRecorder({ ...baseOpts('manifest-run'), seed: 's1', nightwatchSha: 'abc123' });
    const manifest = JSON.parse(fs.readFileSync(path.join(rec.dir, 'manifest.json'), 'utf8'));
    expect(manifest).toEqual({
      runId: 'manifest-run',
      timestamp: FIXED,
      environment: 'local',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'smoke',
      seed: 's1',
      nightwatchSha: 'abc123',
    });
  });

  test('manifest omits optional fields when not provided', () => {
    const rec = new RunRecorder(baseOpts('manifest-min'));
    const manifest = JSON.parse(fs.readFileSync(path.join(rec.dir, 'manifest.json'), 'utf8'));
    expect(manifest).toEqual({
      runId: 'manifest-min',
      timestamp: FIXED,
      environment: 'local',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'smoke',
    });
    expect('seed' in manifest).toBe(false);
    expect('nightwatchSha' in manifest).toBe(false);
  });

  test('invalid runId throws', () => {
    expect(() => new RunRecorder({ ...baseOpts('bad run id!') })).toThrow(/runId/);
    expect(() => new RunRecorder({ ...baseOpts('slash/name') })).toThrow(/runId/);
  });

  test('addManifestEntry adds and replaces entries deterministically', () => {
    const rec = new RunRecorder(baseOpts('manifest-extra'));
    rec.addManifestEntry('trace', { enabled: false, reason: 'authenticated storage state' });
    rec.addManifestEntry('product', 'ripple-overridden');
    const manifest = JSON.parse(fs.readFileSync(path.join(rec.dir, 'manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({
      runId: 'manifest-extra',
      environment: 'local',
      product: 'ripple-overridden',
      trace: { enabled: false, reason: 'authenticated storage state' },
    });
    // Deterministic: same inputs, same bytes.
    const a = fs.readFileSync(path.join(rec.dir, 'manifest.json'), 'utf8');
    const rec2 = new RunRecorder(baseOpts('manifest-extra'));
    rec2.addManifestEntry('trace', { enabled: false, reason: 'authenticated storage state' });
    rec2.addManifestEntry('product', 'ripple-overridden');
    expect(fs.readFileSync(path.join(rec2.dir, 'manifest.json'), 'utf8')).toBe(a);
  });

  test('events.jsonl / network.jsonl / console.jsonl capture the right events', () => {
    const rec = new RunRecorder(baseOpts('events-run'));
    rec.event({ type: 'start', severity: 'info', message: 'started' });
    rec.event({
      type: 'request',
      severity: 'info',
      message: 'GET https://example.com',
      data: { method: 'GET', url: 'https://example.com' },
    });
    rec.event({
      type: 'response',
      severity: 'info',
      message: '200 https://example.com',
      data: { url: 'https://example.com', status: 200 },
    });
    rec.event({ type: 'console', severity: 'warn', message: 'console warn' });

    const all = readJsonl(path.join(rec.dir, 'events.jsonl'));
    expect(all).toHaveLength(4);
    expect(all.map((e) => e.seq)).toEqual([0, 1, 2, 3]);
    for (const e of all) {
      expect(e.ts).toBe(FIXED);
      expect(typeof e.message).toBe('string');
    }
    // One JSON object per line, no trailing whitespace.
    const raw = fs.readFileSync(path.join(rec.dir, 'events.jsonl'), 'utf8');
    const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
    expect(lines).toHaveLength(4);
    expect(lines.every((l) => l === l.trimEnd())).toBe(true);

    const net = readJsonl(path.join(rec.dir, 'network.jsonl'));
    expect(net).toHaveLength(2);
    expect(net.map((e) => e.type)).toEqual(['request', 'response']);
    expect(net.map((e) => e.seq)).toEqual([1, 2]);

    const con = readJsonl(path.join(rec.dir, 'console.jsonl'));
    expect(con).toHaveLength(1);
    expect(con[0]?.type).toBe('console');
    expect(con[0]?.seq).toBe(3);
  });

  test('finalize writes a correct summary.json', async () => {
    const rec = new RunRecorder({ ...baseOpts('summary-run'), nightwatchSha: 'sha-123' });
    rec.event({ type: 'start', severity: 'info', message: 'run started' });
    rec.event({ type: 'request', severity: 'info', message: 'r1' });
    rec.event({ type: 'request', severity: 'info', message: 'r2' });
    rec.event({ type: 'response', severity: 'info', message: 'res' });
    rec.event({ type: 'console', severity: 'warn', message: 'cw' });
    rec.event({ type: 'pageerror', severity: 'error', message: 'boom' });
    rec.event({
      type: 'hard-failure',
      severity: 'fatal',
      message: 'denied request',
      data: { reason: 'deny: external host' },
    });
    rec.event({
      type: 'hard-failure',
      severity: 'fatal',
      message: 'second failure',
      data: { blockedByPolicy: true },
    });
    const shot = await rec.captureScreenshot(stubPage, 'main-page');
    expect(shot).toBe('screenshots/main-page.png');

    const summary = await rec.finalize({ passed: false, notes: ['blocked by policy'] });
    expect(summary.runId).toBe('summary-run');
    expect(summary.environment).toBe('local');
    expect(summary.product).toBe('ripple');
    expect(summary.browser).toBe('chromium');
    expect(summary.scenario).toBe('smoke');
    expect(summary.startedAt).toBe(FIXED);
    expect(summary.endedAt).toBe(FIXED);
    expect(summary.durationMs).toBe(0);
    expect(summary.passed).toBe(false);
    expect(summary.eventCount).toBe(9);
    expect(summary.counts).toEqual({
      start: 1,
      request: 2,
      response: 1,
      console: 1,
      pageerror: 1,
      'hard-failure': 2,
      screenshot: 1,
    });
    expect(summary.severityCounts).toEqual({ info: 5, warn: 1, error: 1, fatal: 2 });
    expect(summary.hardFailures).toEqual([
      { ts: FIXED, message: 'denied request', reason: 'deny: external host' },
      { ts: FIXED, message: 'second failure', reason: 'second failure' },
    ]);
    expect(summary.screenshots).toEqual(['screenshots/main-page.png']);
    expect(summary.nightwatchSha).toBe('sha-123');
    expect(summary.notes).toEqual(['blocked by policy']);

    // Same object is persisted to disk.
    const onDisk = JSON.parse(fs.readFileSync(path.join(rec.dir, 'summary.json'), 'utf8'));
    expect(onDisk).toEqual(summary);
    expect(fs.existsSync(path.join(rec.dir, 'screenshots', 'main-page.png'))).toBe(true);
  });

  test('captureScreenshot writes the png and records an info event', async () => {
    const rec = new RunRecorder(baseOpts('shot-run'));
    const page = stubPage;
    const rel = await rec.captureScreenshot(page, 'home');
    expect(rel).toBe('screenshots/home.png');
    expect(fs.existsSync(path.join(rec.dir, 'screenshots', 'home.png'))).toBe(true);
    const events = readJsonl(path.join(rec.dir, 'events.jsonl'));
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('screenshot');
    expect(events[0]?.severity).toBe('info');
    expect(events[0]?.data).toEqual({ file: 'screenshots/home.png' });
  });

  test('authenticated mode persists metadata only and disables screenshots', async () => {
    const rec = new RunRecorder({ ...baseOpts('auth-minimal-run'), authenticated: true });
    rec.event({
      type: 'request',
      severity: 'info',
      message: 'GET https://api.example.com/companies/0JXQq8Oe?customer=FAKE_CUSTOMER',
      data: {
        method: 'GET',
        url: 'https://api.example.com/companies/0JXQq8Oe?customer=FAKE_CUSTOMER',
        headers: { authorization: 'Bearer SYNTHETIC_FAKE_TOKEN', cookie: 'session=SYNTHETIC_COOKIE' },
        body: JSON.stringify({ customerName: 'SYNTHETIC_CUSTOMER_NAME', amount: 12345 }),
        status: 200,
        contentType: 'application/json',
      },
    });
    rec.event({
      type: 'console',
      severity: 'error',
      message: 'console-error',
      data: { type: 'error', text: 'SYNTHETIC_CUSTOMER_NAME Bearer SYNTHETIC_FAKE_TOKEN' },
    });
    const shot = await rec.captureScreenshot(stubPage, 'customer-page');
    expect(shot).toBeNull();

    const allText = fs.readdirSync(rec.dir)
      .filter((file) => file.endsWith('.json') || file.endsWith('.jsonl'))
      .map((file) => fs.readFileSync(path.join(rec.dir, file), 'utf8'))
      .join('\n');
    expect(allText).not.toContain('SYNTHETIC_FAKE_TOKEN');
    expect(allText).not.toContain('SYNTHETIC_COOKIE');
    expect(allText).not.toContain('SYNTHETIC_CUSTOMER_NAME');
    expect(allText).not.toContain('0JXQq8Oe');
    expect(allText).not.toContain('FAKE_CUSTOMER');
    expect(fs.existsSync(path.join(rec.dir, 'screenshots'))).toBe(false);

    const manifest = JSON.parse(fs.readFileSync(path.join(rec.dir, 'manifest.json'), 'utf8')) as Record<string, any>;
    expect(manifest.evidencePolicy).toMatchObject({
      mode: 'authenticated-metadata-first',
      requestHeaders: false,
      requestBodies: false,
      screenshots: false,
      traces: false,
    });
    const events = readJsonl(path.join(rec.dir, 'events.jsonl'));
    const requestData = events.find((event) => event.type === 'request')?.data as Record<string, unknown>;
    expect(requestData.headers).toBeUndefined();
    expect(requestData.body).toBeUndefined();
    expect(requestData.url).toBe('https://api.example.com/companies/<ID>');
  });

  test('captureScreenshot failure returns null and records a warn event', async () => {
    const rec = new RunRecorder(baseOpts('shot-fail-run'));
    const page = {
      screenshot: async () => {
        throw new Error('boom');
      },
    } as any;
    const rel = await rec.captureScreenshot(page, 'broken');
    expect(rel).toBeNull();
    const events = readJsonl(path.join(rec.dir, 'events.jsonl'));
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('screenshot');
    expect(events[0]?.severity).toBe('warn');
    expect(String(events[0]?.message)).toContain('broken');
  });

  test('screenshot names are sanitized (path separators stripped)', async () => {
    const rec = new RunRecorder(baseOpts('shot-sanitize-run'));
    const page = stubPage;
    const rel = await rec.captureScreenshot(page, 'a/b\\c');
    expect(rel).toBe('screenshots/a-b-c.png');
    if (rel === null) throw new Error('expected a screenshot path');
    expect(fs.existsSync(path.join(rec.dir, rel))).toBe(true);
  });

  test('identical inputs produce byte-identical outputs (reproducibility)', async () => {
    const feed = (rec: RunRecorder) => {
      rec.event({ type: 'start', severity: 'info', message: 'start' });
      rec.event({
        type: 'request',
        severity: 'info',
        message: 'req',
        data: { method: 'GET', url: 'https://example.com' },
      });
      rec.event({ type: 'console', severity: 'warn', message: 'console' });
      rec.event({ type: 'hard-failure', severity: 'fatal', message: 'hf', data: { reason: 'deny' } });
    };
    const opts = { ...baseOpts('repro-run'), seed: 'abc', nightwatchSha: 'nwsha' };

    // Recorder A.
    const a = new RunRecorder(opts);
    feed(a);
    await a.captureScreenshot(stubPage, 'repro');
    await a.finalize({ passed: true, notes: ['n'] });
    const files = ['manifest.json', 'events.jsonl', 'network.jsonl', 'console.jsonl', 'summary.json'] as const;
    const expected: Record<string, string> = {};
    for (const f of files) {
      expected[f] = fs.readFileSync(path.join(a.dir, f), 'utf8');
    }

    // Wipe the dir, then reproduce with recorder B (same runId, clock, root).
    fs.rmSync(a.dir, { recursive: true, force: true });
    const b = new RunRecorder(opts);
    feed(b);
    await b.captureScreenshot(stubPage, 'repro');
    await b.finalize({ passed: true, notes: ['n'] });

    for (const f of files) {
      expect(fs.readFileSync(path.join(b.dir, f), 'utf8')).toBe(expected[f]);
    }
  });

  test('writeRepositories persists the given snapshot records', async () => {
    const rec = new RunRecorder(baseOpts('repos-run'));
    const snapshots: RepoSnapshotRecord[] = [
      {
        path: 'alphauslabs/ripple-ui',
        branch: 'main',
        headSha: '1111111111111111111111111111111111111111',
        upstream: 'origin/main',
        aheadBehind: { ahead: 1, behind: 0 },
        dirty: false,
        dirtyFileCount: 0,
        lastCommit: '2026-08-08T10:00:00+09:00',
        timestamp: FIXED,
        ok: true,
      },
      {
        path: 'mobingilabs/ouchan',
        branch: 'HEAD (detached)',
        headSha: '2222222222222222222222222222222222222222',
        upstream: null,
        aheadBehind: null,
        dirty: true,
        dirtyFileCount: 3,
        lastCommit: '2026-08-07T09:00:00Z',
        timestamp: FIXED,
        ok: false,
        error: 'git rev-parse HEAD failed: fatal: not a git repository',
      },
    ];
    const file = await rec.writeRepositories(snapshots);
    expect(file).toBe(path.join(rec.dir, 'repositories.json'));
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual(snapshots);
  });

  test('createRunId produces the expected format', () => {
    const id = createRunId(new Date('2026-08-09T02:50:00.000Z'));
    expect(id).toMatch(/^nightwatch-20260809T025000Z-[0-9a-f]{4}$/);
    expect(createRunId()).toMatch(/^nightwatch-\d{8}T\d{6}Z-[0-9a-f]{4}$/);
  });
});
