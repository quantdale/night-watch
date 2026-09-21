// F-PERF-1 validation timing telemetry tests.
//
// Exercises the pure aggregation core, the Playwright reporter adapter (with
// fake Playwright objects and a scratch root), and the real `bin/test-timings`
// CLI against synthetic fixture directories. No network, no real test run.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  VALIDATION_TIMING_DOCUMENT_SCHEMA,
  VALIDATION_TIMING_REPORT_SCHEMA,
  aggregateTimingDocuments,
  renderTimingReport,
  sanitizeTimingLane,
  summarizeGateReceipt,
  summarizeTimingRun,
  validateTimingDocument,
} from '../../src/core/validation/validationTiming';
import NightwatchTimingReporter from '../helpers/playwrightTimingReporter';
import { resolveScratchPath } from '../../src/core/workspace/ephemeralLayout';

const ROOT = path.join(__dirname, '..', '..');
const CLI = path.join(ROOT, 'bin', 'test-timings.mjs');

function scratch(name: string): string {
  const directory = path.join(ROOT, resolveScratchPath('validation-timing', name));
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

test('summarizeTimingRun aggregates files, statuses and bounds the ranking', () => {
  const document = summarizeTimingRun({
    lane: 'Unit Lane!',
    startedAt: '2026-09-20T00:00:00.000Z',
    finishedAt: '2026-09-20T00:00:10.000Z',
    durationMs: 10_000,
    workers: 2,
    top: 1,
    events: [
      { file: 'tests/unit/a.test.ts', title: 'slow', durationMs: 900, status: 'passed' },
      { file: 'tests/unit/a.test.ts', title: 'fast', durationMs: 100, status: 'failed' },
      { file: 'tests/unit/b.test.ts', title: 'skip', durationMs: 5, status: 'skipped' },
      { file: 'tests/unit/b.test.ts', title: 'retry', durationMs: 5, status: 'passed', retry: 1 },
    ],
  });
  expect(document.schemaVersion).toBe(VALIDATION_TIMING_DOCUMENT_SCHEMA);
  expect(document.lane).toBe('unit-lane');
  expect(document.workers).toBe(2);
  expect(document.totals).toEqual({ files: 2, tests: 4, passed: 2, failed: 1, skipped: 1, timedOut: 0, interrupted: 0, retries: 1 });
  expect(document.files.map((file) => file.file)).toEqual(['tests/unit/a.test.ts', 'tests/unit/b.test.ts']);
  expect(document.slowestTests).toHaveLength(1);
  expect(document.slowestTests[0]!.title).toBe('slow');
  expect(validateTimingDocument(document).ok).toBe(true);
});

test('unsafe paths are dropped rather than persisted', () => {
  const document = summarizeTimingRun({
    lane: 'unit',
    startedAt: '',
    finishedAt: '',
    durationMs: 1,
    workers: 1,
    events: [
      { file: '/etc/passwd', title: 'absolute', durationMs: 10, status: 'passed' },
      { file: 'tests/unit/../secret.test.ts', title: 'traversal', durationMs: 10, status: 'passed' },
      { file: 'tests/unit/ok.test.ts', title: 'ok', durationMs: 10, status: 'passed' },
    ],
  });
  expect(document.totals.tests).toBe(1);
  expect(document.files.map((file) => file.file)).toEqual(['tests/unit/ok.test.ts']);
});

test('validateTimingDocument refuses malformed and forged documents', () => {
  expect(validateTimingDocument(null).ok).toBe(false);
  expect(validateTimingDocument({ schemaVersion: 'other' }).ok).toBe(false);
  expect(validateTimingDocument({
    schemaVersion: VALIDATION_TIMING_DOCUMENT_SCHEMA,
    lane: 'unit',
    durationMs: -1,
    workers: 1,
    totals: { files: 1, tests: 1, passed: 1, failed: 0, skipped: 0, timedOut: 0, interrupted: 0, retries: 0 },
    files: [{ file: '/abs.test.ts', tests: 1, durationMs: 1 }],
    slowestTests: [],
  }).ok).toBe(false);
});

test('aggregateTimingDocuments merges lanes and records unreadable documents', () => {
  const first = summarizeTimingRun({ lane: 'full-regression', startedAt: '', finishedAt: '', durationMs: 100, workers: 1, events: [{ file: 'tests/unit/a.test.ts', title: 'a', durationMs: 70, status: 'passed' }] });
  const second = summarizeTimingRun({ lane: 'full-regression', startedAt: '', finishedAt: '', durationMs: 200, workers: 1, events: [{ file: 'tests/unit/a.test.ts', title: 'a2', durationMs: 150, status: 'passed' }] });
  const report = aggregateTimingDocuments({
    generatedAt: '2026-09-20T00:00:00.000Z',
    documents: [
      { source: 'first.json', value: first },
      { source: 'second.json', value: second },
      { source: 'broken.json', value: { schemaVersion: 'forged' } },
    ],
    gateReceipts: [],
    top: 5,
  });
  expect(report.schemaVersion).toBe(VALIDATION_TIMING_REPORT_SCHEMA);
  expect(report.documentCount).toBe(2);
  expect(report.unreadable).toEqual(['broken.json']);
  expect(report.lanes).toHaveLength(1);
  expect(report.lanes[0]!.runs).toBe(2);
  expect(report.lanes[0]!.totalDurationMs).toBe(300);
  expect(report.slowestFiles[0]).toMatchObject({ file: 'tests/unit/a.test.ts', durationMs: 220 });
});

test('summarizeGateReceipt reports unmeasured groups instead of zero', () => {
  const summary = summarizeGateReceipt({
    schemaVersion: 'nightwatch.quality-gate-receipt.v1',
    receiptDigest: 'receipt:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    environmentClass: 'LOCAL',
    gitHead: 'a'.repeat(40),
    finalResult: 'PASS',
    groups: [
      { id: 'STATIC', status: 'PASS', counts: { total: null, passed: null, skipped: null, failed: null }, durationMs: 1500 },
      { id: 'HARDENING', status: 'PASS', counts: null },
    ],
  });
  expect(summary).not.toBeNull();
  expect(summary!.measuredDurationMs).toBe(1500);
  expect(summary!.unmeasuredGroups).toEqual(['HARDENING']);
  expect(summarizeGateReceipt({ schemaVersion: 'other' })).toBeNull();
});

test('renderTimingReport states absence rather than guessing', () => {
  const empty = renderTimingReport(aggregateTimingDocuments({ generatedAt: 'x', documents: [], gateReceipts: [] }));
  expect(empty).toContain('no timing evidence found');
  const summary = summarizeGateReceipt({
    schemaVersion: 'nightwatch.quality-gate-receipt.v1',
    environmentClass: 'CLEAN',
    finalResult: 'PASS',
    groups: [{ id: 'STATIC', status: 'PASS', durationMs: 2000 }],
  })!;
  const text = renderTimingReport(aggregateTimingDocuments({ generatedAt: 'x', documents: [], gateReceipts: [summary] }));
  expect(text).toContain('[gate CLEAN]');
  expect(text).toContain('STATIC');
});

test('the reporter adapter writes a valid document under the configured root', () => {
  const directory = scratch('reporter');
  const reporter = new NightwatchTimingReporter({ lane: 'adapter-test' });
  reporter.onBegin({ rootDir: directory, workers: 1 } as never, { allTests: () => [] } as never);
  reporter.onTestEnd(
    { location: { file: path.join(directory, 'tests', 'unit', 'x.test.ts') }, title: 'x' } as never,
    { duration: 42, status: 'passed', retry: 0 } as never,
  );
  reporter.onEnd({ status: 'passed', duration: 42 } as never);
  const timingDirectory = path.join(directory, 'test-results', 'timings');
  const files = fs.readdirSync(timingDirectory);
  expect(files).toHaveLength(1);
  const document = JSON.parse(fs.readFileSync(path.join(timingDirectory, files[0]!), 'utf8'));
  expect(validateTimingDocument(document).ok).toBe(true);
  expect(document.lane).toBe('adapter-test');
  expect(document.totals.tests).toBe(1);
  fs.rmSync(directory, { recursive: true, force: true });
});

test('bin/test-timings emits JSON and text from bounded fixture directories', () => {
  const directory = scratch('cli');
  const lane = summarizeTimingRun({ lane: 'full-regression', startedAt: '', finishedAt: '', durationMs: 5000, workers: 1, events: [{ file: 'tests/unit/cli.test.ts', title: 'cli', durationMs: 4000, status: 'passed' }] });
  fs.writeFileSync(path.join(directory, 'lane.json'), JSON.stringify(lane), 'utf8');
  fs.writeFileSync(path.join(directory, 'receipt.json'), JSON.stringify({
    schemaVersion: 'nightwatch.quality-gate-receipt.v1',
    receiptDigest: 'receipt:sha256:bbbbbbbbbbbbbbbbbbbbbbbb',
    environmentClass: 'LOCAL',
    finalResult: 'PASS',
    groups: [{ id: 'SYNTHETIC_CAMPAIGN', status: 'PASS', durationMs: 600_000 }],
  }), 'utf8');

  const json = spawnSync(process.execPath, [CLI, '--json', `--dir=${directory}`, `--receipts=${directory}`], { encoding: 'utf8', timeout: 60_000 });
  expect(json.status).toBe(0);
  const report = JSON.parse(json.stdout);
  expect(report.schemaVersion).toBe(VALIDATION_TIMING_REPORT_SCHEMA);
  expect(report.lanes[0].lane).toBe('full-regression');
  expect(report.gateReceipts[0].groups[0].id).toBe('SYNTHETIC_CAMPAIGN');

  const text = spawnSync(process.execPath, [CLI, `--dir=${directory}`, `--receipts=${directory}`, '--top=3'], { encoding: 'utf8', timeout: 60_000 });
  expect(text.status).toBe(0);
  expect(text.stdout).toContain('[lane full-regression]');
  expect(text.stdout).toContain('tests/unit/cli.test.ts');
  fs.rmSync(directory, { recursive: true, force: true });
});

test('sanitizeTimingLane bounds hostile labels', () => {
  expect(sanitizeTimingLane('FULL Regression!!')).toBe('full-regression');
  expect(sanitizeTimingLane('../../etc')).toBe('etc');
  expect(sanitizeTimingLane('')).toBe('default');
  expect(sanitizeTimingLane(undefined)).toBe('default');
  expect(sanitizeTimingLane('a'.repeat(200))).toBe('default');
});
