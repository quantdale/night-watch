// M8 task 9.6 (NW-AUD-035) — a body read that loses the race against its timer
// is JOINED (never left running, never unhandled), and acquisition is bounded
// by a refusal rather than an unbounded queue of readers.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { MAX_CONCURRENT_BODY_READS, boundedResponseOperation } from '../../src/browser/observers/networkObserver';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OBSERVER = fs.readFileSync(path.join(REPO_ROOT, 'src', 'browser', 'observers', 'networkObserver.ts'), 'utf8');

test.describe('bounded response-body acquisition (9.6)', () => {
  test('the acquisition gate bounds concurrent reads and refuses rather than queues', () => {
    expect(OBSERVER).toContain('export const MAX_CONCURRENT_BODY_READS = 4;');
    expect(OBSERVER).toMatch(/if \(bodyReadsInFlight >= MAX_CONCURRENT_BODY_READS\) return \{ acquired: false \};/);
    // The refusal is a distinct outcome, not a timeout.
    expect(OBSERVER).toContain("if ('acquired' in bodyResult) {");
    expect(OBSERVER).toContain("noteCaptureFailure('BODY_READ_ACQUISITION_BOUND')");
  });

  test('the losing promise is joined: one settlement handler that discards value and rejection', () => {
    expect(OBSERVER).toMatch(/const joined = operation\.then\(\s*\(\) => undefined,\s*\(\) => undefined,\s*\)\.finally\(/);
    expect(OBSERVER).toContain('void joined;');
    // The slot is released exactly once, on whichever side settles first.
    const releases = OBSERVER.match(/bodyReadsInFlight -= 1;/g) ?? [];
    expect(releases.length).toBe(2);
    expect(OBSERVER).toMatch(/if \(!settled\) \{\s*settled = true;/);
  });

  test('the timer is still cleared on every path and the timeout keeps its own failure code', () => {
    expect(OBSERVER).toMatch(/finally \{\s*if \(timer !== undefined\) clearTimeout\(timer\);/);
    expect(OBSERVER).toContain("noteCaptureFailure('BODY_READ_TIMEOUT')");
    // The bound refusal is declared in the closed failure vocabulary.
    const types = fs.readFileSync(path.join(REPO_ROOT, 'src', 'core', 'journeys', 'types.ts'), 'utf8');
    expect(types).toContain("'BODY_READ_ACQUISITION_BOUND'");
    expect(types).toContain("'BODY_READ_TIMEOUT'");
  });

  test('the acquisition slot is taken before the race and released on success, timeout and rejection', () => {
    const gate = OBSERVER.indexOf('if (bodyReadsInFlight >= MAX_CONCURRENT_BODY_READS) return { acquired: false };');
    const increment = OBSERVER.indexOf('bodyReadsInFlight += 1;');
    const race = OBSERVER.indexOf('return await Promise.race([');
    expect(gate).toBeGreaterThan(0);
    expect(increment).toBeGreaterThan(gate);
    expect(race).toBeGreaterThan(increment);
    // Both the success branch and the joined-settlement branch release.
    expect(OBSERVER).toMatch(/operation\.then\(\(value\) => \{\s*if \(!settled\) \{\s*settled = true;\s*bodyReadsInFlight -= 1;/);
  });
});

// RV-12 / corrections task 7.10 — the bound proven by BEHAVIOUR: hold
// MAX_CONCURRENT_BODY_READS reads open, fire one more, and observe the refusal.
test.describe('bounded response-body acquisition — behaviour (7.10)', () => {
  /**
   * R4-15 / review-4 task 4.2 — every held body-read slot is released, even
   * when an assertion fails. `bodyReadsInFlight` is module-global, so a leaked
   * slot made a LATER test in the same worker observe a saturated gate: the
   * shared-worker coupling behind FLAKE-003.
   */
  const created: Array<{ release: (value: string) => void }> = [];
  test.afterEach(() => {
    while (created.length > 0) created.pop()!.release('drained by afterEach');
  });
  const held = () => {
    let release: (value: string) => void = () => undefined;
    let fail: (reason: Error) => void = () => undefined;
    const promise = new Promise<string>((resolve, reject) => {
      release = resolve;
      fail = reject;
    });
    const handle = { promise, release, fail };
    created.push(handle);
    return handle;
  };

  test('the read past the bound is refused as { acquired: false }, and a freed slot is reusable', async () => {
    const reads = Array.from({ length: MAX_CONCURRENT_BODY_READS }, () => held());
    const inflight = reads.map((read) => boundedResponseOperation(read.promise, 60_000));
    // MAX_CONCURRENT_BODY_READS reads are now outstanding; the next is REFUSED
    // (a distinct outcome — not a timeout, not a queued wait).
    const refused = await boundedResponseOperation(Promise.resolve('never read'), 60_000);
    expect(refused).toEqual({ acquired: false });
    expect('completed' in refused).toBe(false);
    // Completing one read frees exactly one slot.
    reads[0]!.release('first');
    expect(await inflight[0]).toEqual({ completed: true, value: 'first' });
    const reused = await boundedResponseOperation(Promise.resolve('reused'), 60_000);
    expect(reused).toEqual({ completed: true, value: 'reused' });
    // The gate refuses again as soon as it is full again (the freed slot was
    // taken and released, not leaked).
    const refill = held();
    const refillRead = boundedResponseOperation(refill.promise, 60_000);
    expect(await boundedResponseOperation(Promise.resolve('over'), 60_000)).toEqual({ acquired: false });
    refill.release('done');
    expect(await refillRead).toEqual({ completed: true, value: 'done' });
    for (const [index, read] of reads.entries()) {
      if (index === 0) continue;
      read.release(`r${index}`);
    }
    await Promise.all(inflight);
  });

  test('a rejected or timed-out read releases its slot exactly once', async () => {
    const reads = Array.from({ length: MAX_CONCURRENT_BODY_READS }, () => held());
    const inflight = reads.map((read, index) => boundedResponseOperation(read.promise, index === 0 ? 20 : 60_000));
    // The first read loses its 20 ms race: the result is `completed: false` and
    // the slot is released when the JOINED loser settles, not before.
    expect(await inflight[0]).toEqual({ completed: false });
    reads[0]!.release('late value discarded');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await boundedResponseOperation(Promise.resolve('after timeout'), 60_000)).toEqual({ completed: true, value: 'after timeout' });
    // A rejection surfaces to the caller and frees its slot too.
    reads[1]!.fail(new Error('transport'));
    await expect(inflight[1]).rejects.toThrow('transport');
    expect(await boundedResponseOperation(Promise.resolve('after rejection'), 60_000)).toEqual({ completed: true, value: 'after rejection' });
    for (const read of reads.slice(2)) read.release('x');
    await Promise.all(inflight.slice(2));
    // Fully drained: MAX reads can be held again without any refusal.
    const again = Array.from({ length: MAX_CONCURRENT_BODY_READS }, () => held());
    const againInflight = again.map((read) => boundedResponseOperation(read.promise, 60_000));
    for (const read of again) read.release('y');
    const settled = await Promise.all(againInflight);
    expect(settled.every((entry) => 'completed' in entry && entry.completed)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// R3-13 / corrections task 8.12 — the observer REFUSAL PATH by behaviour: hold
// more concurrent known-read bodies than the gate allows and observe the
// refusal on the observer's own capture health, not on source text.
// ---------------------------------------------------------------------------

import http from 'node:http';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { RunRecorder } from '../../src/core/evidence/runRecorder';
import { RunMonitor } from '../../src/state/run';
import { createNetworkObserver } from '../../src/browser/observers/networkObserver';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import type { EndpointSemanticClassification } from '../../src/core/safety/endpointSemantics';

function refusalEnvironment(origin: string): EnvironmentConfig {
  const host = new URL(origin).host;
  return {
    name: 'local',
    label: 'body-read refusal fixture',
    uiBaseUrl: origin,
    apiHosts: [host],
    authHosts: [],
    allowedHosts: [host, 'localhost'],
    staticAssetHosts: [],
    telemetryHosts: [],
    optionalThirdPartySupportHosts: [],
    browserBackgroundHosts: [],
    failOn: [],
  };
}

test.describe('observer body-read refusal — behaviour (R3-13)', () => {
  test('more concurrent known-read bodies than the gate allows refuses and marks the capture INCOMPLETE', async ({ browser }) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const environment = refusalEnvironment(origin);
    const recorder = new RunRecorder({
      runId: `body-read-refusal-${Date.now()}`,
      environment: 'local',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'body-read-refusal',
    });
    const monitor = new RunMonitor(environment.failOn);
    const observer = createNetworkObserver({
      policy: new OutboundPolicy(environment),
      recorder,
      monitor,
      endpointClassifier: (): EndpointSemanticClassification | null => 'KNOWN_READ',
    });
    const context = await browser.newContext();
    await observer.install(context);
    const page = await context.newPage();
    try {
      await page.goto(origin);
      observer.beginJourneyIntent('step-1', 'read');
      // A BURST of responses: the observer's response-handler passages overlap
      // and cross the 4-read gate, which refuses rather than queues. (A small
      // handshake never overlaps because Playwright buffers each body first.)
      await page.evaluate(async () => {
        await Promise.all(Array.from({ length: 200 }, (_, index) => fetch(`/api/burst-${index}`).then((response) => response.json())));
      });
      await expect.poll(() => observer.pendingResponseHandlers(), { timeout: 20_000 }).toBe(0);
      expect(observer.captureStatus?.()).toBe('INCOMPLETE');
      expect(observer.captureFailureCodes?.()).toContain('BODY_READ_ACQUISITION_BOUND');
      // D-149 Decision 4: the refusal COUNT is surfaced (the owner chose it).
      expect(observer.captureFailureCounts?.()['BODY_READ_ACQUISITION_BOUND'] ?? 0).toBeGreaterThanOrEqual(1);
    } finally {
      await context.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
