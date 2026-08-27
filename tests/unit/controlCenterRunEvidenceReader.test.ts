import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { projectRunDetail, projectRunList, projectTimeline } from '../../src/controlCenter/adapters/runAdapter';
import {
  createRunEvidenceReaderForTests,
} from '../../src/controlCenter/authorities/runEvidenceReader';
import { createDefaultControlCenterCollector } from '../../src/controlCenter/server/defaultCollector';
import { asSafeControlCenterId } from '../../src/controlCenter/contracts/common';

const TIMESTAMP = '2026-08-26T10:20:30.000Z';
const SHA = 'a'.repeat(40);

function event(seq: number, type: 'start' | 'end' = seq === 0 ? 'start' : 'end') {
  return {
    seq,
    ts: TIMESTAMP,
    type,
    severity: 'info',
    message: seq === 0 ? 'SYNTHETIC_RAW_MESSAGE' : 'SYNTHETIC_RAW_END_MESSAGE',
    data: seq === 0 ? { rawBody: 'SYNTHETIC_RAW_BODY', ROUTE_CLASS: 'summary' } : undefined,
  };
}

function writeRun(root: string, runId: string, options: { readonly events?: readonly ReturnType<typeof event>[]; readonly summary?: Record<string, unknown>; readonly manifest?: Record<string, unknown> } = {}): string {
  const directory = path.join(root, runId);
  fs.mkdirSync(directory, { recursive: true });
  const events = options.events ?? [event(0), event(1)];
  const manifest = options.manifest ?? {
    runId,
    timestamp: TIMESTAMP,
    environment: 'LOCAL_SYNTHETIC',
    product: 'ripple',
    browser: 'chromium',
    scenario: 'control-center-reader',
    nightwatchSha: SHA,
  };
  const summary = options.summary ?? {
    runId,
    environment: 'LOCAL_SYNTHETIC',
    product: 'ripple',
    browser: 'chromium',
    scenario: 'control-center-reader',
    startedAt: TIMESTAMP,
    endedAt: TIMESTAMP,
    durationMs: 0,
    passed: true,
    eventCount: 2,
    counts: { start: 1, end: 1 },
    severityCounts: { info: 2 },
    hardFailures: [],
    screenshots: [],
    nightwatchSha: SHA,
  };
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest));
  fs.writeFileSync(path.join(directory, 'events.jsonl'), `${events.map((value) => JSON.stringify(value)).join('\n')}\n`);
  fs.writeFileSync(path.join(directory, 'summary.json'), JSON.stringify(summary));
  fs.writeFileSync(path.join(directory, 'repositories.json'), JSON.stringify([{
    path: 'src',
    branch: 'main',
    headSha: SHA,
    upstream: 'origin/main',
    aheadBehind: { ahead: 0, behind: 0 },
    dirty: false,
    dirtyFileCount: 0,
    lastCommit: TIMESTAMP,
    timestamp: TIMESTAMP,
    ok: true,
  }]));
  return directory;
}

function summaryWithProxy(runId: string, proxy: Record<string, unknown>): Record<string, unknown> {
  return {
    runId,
    environment: 'LOCAL_SYNTHETIC',
    product: 'ripple',
    browser: 'chromium',
    scenario: 'control-center-reader',
    startedAt: TIMESTAMP,
    endedAt: TIMESTAMP,
    durationMs: 0,
    passed: true,
    eventCount: 2,
    counts: { start: 1, end: 1 },
    severityCounts: { info: 2 },
    hardFailures: [],
    screenshots: [],
    nightwatchSha: SHA,
    proxy,
  };
}

test.describe('Control Center bounded run-evidence reader', () => {
  let root: string;

  test.beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-control-center-runs-'));
  });

  test.afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('reads recorder-shaped evidence and projects only safe metadata', () => {
    writeRun(root, 'synthetic-run');
    const snapshot = createRunEvidenceReaderForTests(root).snapshot();
    expect(snapshot.state).toBe('AVAILABLE');
    expect(snapshot.records).toHaveLength(1);
    const record = snapshot.records[0];
    expect(record).toBeDefined();
    expect(record?.summary.runId).toBe('synthetic-run');
    expect(record?.summary.nightwatchSha).toBe(SHA);
    expect(record?.events?.[0]).toMatchObject({ message: '[REDACTED_EVENT_MESSAGE]', type: 'start' });
    expect(JSON.stringify(record)).not.toContain('SYNTHETIC_RAW');
    expect(JSON.stringify(record)).not.toContain('rawBody');
    expect(projectRunList(snapshot.records).items[0]?.status).toBe('PASSED');
    expect(projectTimeline(record!, 0, 10).events[0]?.messageCode).toBe('EVENT_END');
    expect(snapshot.generation).toMatch(/^runs:sha256:[0-9a-f]{24}$/);
    expect(snapshot.generation).toBe(createRunEvidenceReaderForTests(root).snapshot().generation);
  });

  test('distinguishes missing and empty roots without making a pass claim', () => {
    const missing = createRunEvidenceReaderForTests(path.join(root, 'missing')).snapshot();
    expect(missing).toMatchObject({ state: 'UNAVAILABLE', records: [], reasonCodes: ['RUN_EVIDENCE_ROOT_UNAVAILABLE'] });
    expect(missing.generation).toBeNull();

    const empty = createRunEvidenceReaderForTests(root).snapshot();
    expect(empty.state).toBe('EMPTY');
    expect(empty.reasonCodes).toContain('RUN_EVIDENCE_EMPTY');
    expect(empty.generation).toMatch(/^runs:sha256:[0-9a-f]{24}$/);
  });

  test('keeps valid records visible but marks partial corruption as UNKNOWN', () => {
    writeRun(root, 'valid-run');
    const broken = writeRun(root, 'broken-run');
    fs.writeFileSync(path.join(broken, 'summary.json'), JSON.stringify({ schemaVersion: 'unknown' }));
    const snapshot = createRunEvidenceReaderForTests(root).snapshot();
    expect(snapshot.state).toBe('UNKNOWN');
    expect(snapshot.records.map((record) => record.summary.runId)).toEqual(['valid-run']);
    expect(snapshot.reasonCodes).toContain('RUN_EVIDENCE_PARTIAL_CORRUPTION');
    expect(snapshot.reasonCodes).toContain('RUN_EVIDENCE_SCHEMA_INVALID');
  });

  test('rejects privacy sentinels, duplicate sequences, symlinks, and oversized records', () => {
    const privacy = writeRun(root, 'privacy-run');
    fs.writeFileSync(path.join(privacy, 'events.jsonl'), `${JSON.stringify({ ...event(0), message: 'TOKEN_SENTINEL' })}\n`);

    writeRun(root, 'duplicate-run', { events: [event(0), event(0)] });

    const outside = path.join(root, '..', 'nightwatch-control-center-run-outside');
    fs.writeFileSync(outside, 'outside');
    fs.symlinkSync(outside, path.join(root, 'symlink-run'));

    const oversized = writeRun(root, 'oversized-run');
    fs.writeFileSync(path.join(oversized, 'summary.json'), Buffer.alloc(512 * 1024 + 1, 32));

    const snapshot = createRunEvidenceReaderForTests(root).snapshot();
    expect(snapshot.state).toBe('UNKNOWN');
    expect(snapshot.records).toHaveLength(0);
    expect(snapshot.reasonCodes).toEqual(expect.arrayContaining([
      'RUN_EVIDENCE_PRIVACY_BLOCKED',
      'RUN_EVIDENCE_DUPLICATE_SEQUENCE',
      'RUN_EVIDENCE_PATH_UNSAFE',
      'RUN_EVIDENCE_RECORD_OVERSIZED',
    ]));
    expect(JSON.stringify(snapshot)).not.toContain('TOKEN_SENTINEL');
    fs.rmSync(outside, { force: true });
  });

  test('re-reads stable evidence deterministically without exposing raw fields', () => {
    writeRun(root, 'stable-run');
    const reader = createRunEvidenceReaderForTests(root);
    const first = reader.snapshot();
    expect(first.state).toBe('AVAILABLE');
    const eventFile = path.join(root, 'stable-run', 'events.jsonl');
    fs.writeFileSync(eventFile, `${JSON.stringify(event(0))}\n${JSON.stringify(event(1))}\n`);
    const second = reader.snapshot();
    expect(second).toEqual(first);
  });

  test('reads v2 proxy lifecycle summaries and migrates legacy summaries conservatively', () => {
    const v2 = writeRun(root, 'proxy-v2-run', {
      summary: summaryWithProxy('proxy-v2-run', {
        schemaVersion: 'nightwatch.proxy-summary.v2',
        policyAuthorized: 2,
        allowed: 2,
        telemetryBlocked: 0,
        optionalSupportBlocked: 0,
        browserBackgroundBlocked: 0,
        denied: 0,
        unknown: 0,
        resolutionAdmitted: 1,
        resolutionDenied: 1,
        resolutionFailed: 0,
        connectAttempted: 1,
        connected: 0,
        connectFailed: 1,
        outcomeCoverage: 'complete',
        violations: 1,
      }),
    });
    const legacy = writeRun(root, 'proxy-legacy-run', {
      summary: summaryWithProxy('proxy-legacy-run', {
        allowed: 1,
        telemetryBlocked: 0,
        optionalSupportBlocked: 0,
        browserBackgroundBlocked: 0,
        denied: 0,
        unknown: 0,
        violations: 0,
      }),
    });
    const snapshot = createRunEvidenceReaderForTests(root).snapshot();
    const v2Record = snapshot.records.find((record) => record.summary.runId === 'proxy-v2-run');
    const legacyRecord = snapshot.records.find((record) => record.summary.runId === 'proxy-legacy-run');
    expect(v2Record?.summary.proxy).toMatchObject({
      schemaVersion: 'nightwatch.proxy-summary.v2',
      policyAuthorized: 2,
      resolutionDenied: 1,
      connectFailed: 1,
      violations: 1,
      outcomeCoverage: 'complete',
    });
    expect(legacyRecord?.summary.proxy).toMatchObject({
      schemaVersion: 'nightwatch.proxy-summary.v2',
      policyAuthorized: 1,
      resolutionAdmitted: 0,
      connectAttempted: 0,
      outcomeCoverage: 'legacy-unknown',
    });
    expect(projectRunDetail(v2Record!).proxy).toMatchObject({
      resolutionDenied: 1,
      connectFailed: 1,
      outcomeCoverage: 'complete',
    });
    expect(v2).toContain('proxy-v2-run');
    expect(legacy).toContain('proxy-legacy-run');
  });

  test('collector shares one bounded run snapshot across list, detail, timeline, and graph', async () => {
    writeRun(root, 'collector-run');
    const reader = createRunEvidenceReaderForTests(root);
    let calls = 0;
    const authoritativeReader = {
      snapshot: () => {
        calls += 1;
        return reader.snapshot();
      },
      find: reader.find,
    };
    const collector = createDefaultControlCenterCollector({
      runReader: authoritativeReader,
      now: () => 1_000,
      runSnapshotTtlMs: 500,
    });
    const runId = asSafeControlCenterId('collector-run')!;
    const list = await collector.runs({ limit: 50, cursor: null });
    const detail = await collector.run(runId);
    const timeline = await collector.timeline(runId, 0, 100);
    const graph = await collector.executionGraph(runId);
    expect(calls).toBe(1);
    expect(list.state).toBe('AVAILABLE');
    expect(list.items).toHaveLength(1);
    expect(detail).not.toBeNull();
    expect(timeline).not.toBeNull();
    expect(graph).not.toBeNull();
    expect(JSON.stringify({ list, detail, timeline, graph })).not.toContain('SYNTHETIC_RAW');
  });

  test('collector turns a reader exception into explicit unavailable run state', async () => {
    const collector = createDefaultControlCenterCollector({
      runReader: {
        snapshot: () => { throw new Error('SYNTHETIC_INTERNAL_DETAIL'); },
        find: () => null,
      },
      now: () => 1_000,
    });
    const list = await collector.runs({ limit: 50, cursor: null });
    expect(list).toMatchObject({ state: 'UNAVAILABLE', items: [], reasonCodes: ['RUN_EVIDENCE_ROOT_UNAVAILABLE'] });
    expect(JSON.stringify(list)).not.toContain('SYNTHETIC_INTERNAL_DETAIL');
  });
});
