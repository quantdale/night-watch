// M8 task 9.6 (NW-AUD-035) — a body read that loses the race against its timer
// is JOINED (never left running, never unhandled), and acquisition is bounded
// by a refusal rather than an unbounded queue of readers.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

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
