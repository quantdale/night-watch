// Playwright timing reporter (F-PERF-1).
//
// A second, silent reporter that writes one bounded timing document per
// invocation under the owned `test-results/timings/` directory. It never
// prints to stdio, never changes a test outcome, and never lets its own
// failure fail a run: telemetry that can turn a green run red would be a
// defect, not an improvement.
//
// The document schema and every aggregation rule live in the pure core
// `src/core/validation/validationTiming.ts`; this file is only the Playwright
// adapter.

import fs from 'node:fs';
import path from 'node:path';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { resolvePlaywrightOutputDir } from '../../src/core/workspace/ephemeralLayout';
import {
  sanitizeTimingLane,
  summarizeTimingRun,
  type ValidationTimingEvent,
} from '../../src/core/validation/validationTiming';

interface NightwatchTimingOptions {
  readonly lane?: string;
}

export default class NightwatchTimingReporter implements Reporter {
  private readonly lane: string;
  private readonly events: ValidationTimingEvent[] = [];
  private rootDir = process.cwd();
  private startedAtMs = Date.now();
  private workers = 1;

  constructor(options: NightwatchTimingOptions = {}) {
    this.lane = sanitizeTimingLane(options.lane ?? process.env.NIGHTWATCH_TIMING_LANE ?? 'default');
  }

  onBegin(config: FullConfig, _suite: Suite): void {
    this.startedAtMs = Date.now();
    this.workers = Number.isInteger(config.workers) && config.workers > 0 ? config.workers : 1;
    if (typeof config.rootDir === 'string' && config.rootDir.length > 0) this.rootDir = config.rootDir;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    try {
      const file = path.relative(this.rootDir, test.location.file).split(path.sep).join('/');
      this.events.push({
        file,
        title: test.title,
        durationMs: Number.isFinite(result.duration) ? result.duration : 0,
        status: String(result.status),
        retry: Number.isInteger(result.retry) ? result.retry : 0,
      });
    } catch {
      // A telemetry event that cannot be read is dropped, never fatal.
    }
  }

  onEnd(result: FullResult): void {
    try {
      const finishedAtMs = Date.now();
      const durationMs = Number.isFinite(result.duration) ? result.duration : finishedAtMs - this.startedAtMs;
      const document = summarizeTimingRun({
        lane: this.lane,
        startedAt: new Date(this.startedAtMs).toISOString(),
        finishedAt: new Date(finishedAtMs).toISOString(),
        durationMs,
        workers: this.workers,
        events: this.events,
      });
      const directory = path.join(this.rootDir, resolvePlaywrightOutputDir('timings'));
      fs.mkdirSync(directory, { recursive: true });
      const destination = path.join(directory, `${this.lane}-${process.pid}.json`);
      const temporary = `${destination}.tmp`;
      fs.writeFileSync(temporary, `${JSON.stringify(document)}\n`, 'utf8');
      fs.renameSync(temporary, destination);
    } catch {
      // Telemetry is best-effort; the lane's own result remains authoritative.
    }
  }

  printsToStdio(): boolean {
    return false;
  }
}
