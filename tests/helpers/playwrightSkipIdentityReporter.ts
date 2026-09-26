// D-10 / 4.6 — skip-identity reporter for one validation shard.
//
// The execution receipt (playwrightShardReporter) is deliberately free of
// titles and paths. Skip POLICY evaluation needs the identity of every skip
// (file, line, title, reason), so it runs through this separate, explicitly
// scoped reporter: the identity report is written only to the path the parent
// runner names, and carries nothing else — no timings, no diagnostics, no
// environment values.

import fs from 'node:fs';
import path from 'node:path';
import type { FullConfig, FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

interface SkipIdentity {
  readonly file: string;
  readonly line: number | null;
  readonly title: string;
  readonly reason: string;
}

export default class PlaywrightSkipIdentityReporter implements Reporter {
  private readonly destination: string | null;
  private skips: SkipIdentity[] = [];

  constructor() {
    const authorized = process.env.NIGHTWATCH_GATE_ENVIRONMENT === 'SHARDS';
    const requested = authorized ? process.env.NIGHTWATCH_SKIP_REPORT_PATH : undefined;
    this.destination = requested === undefined || requested === '' ? null : requested;
    if (this.destination !== null && !path.isAbsolute(this.destination)) {
      throw new Error('SKIP_REPORT_PATH_NOT_ABSOLUTE');
    }
  }

  onBegin(_config: FullConfig): void {
    if (this.destination === null) return;
    this.skips = [];
  }

  onTestEnd(test: TestCase, _result: TestResult): void {
    if (this.destination === null) return;
    if (test.outcome() !== 'skipped') return;
    const annotation = test.annotations.find((entry) => entry.type === 'skip');
    this.skips.push({
      // Repo-relative, forward-slashed: the canonical allowlist is written in
      // repository paths and must be comparable without host context.
      file: path.relative(process.cwd(), test.location.file).split(path.sep).join('/'),
      line: test.location.line ?? null,
      title: test.title,
      reason: typeof annotation?.description === 'string' ? annotation.description.trim() : '',
    });
  }

  onEnd(_result: FullResult): void {
    if (this.destination === null) return;
    fs.writeFileSync(this.destination, `${JSON.stringify({
      schemaVersion: 'nightwatch.skip-identity-report.v1',
      skips: this.skips,
    }, null, 2)}\n`);
  }
}
