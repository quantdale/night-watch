// D-10 / 4.6 — bounded skip-identity reporter for authoritative Playwright lanes.
//
// The report carries only repo-relative test identity and a sanitized skip
// reason. Gate runners supply a private report path; authorized lanes fail
// closed if they omit it. No timing, diagnostics, or arbitrary environment data
// is included.

import fs from 'node:fs';
import path from 'node:path';
import type { FullConfig, FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

interface SkipIdentity {
  readonly file: string;
  readonly line: number | null;
  readonly titlePath: readonly string[];
  readonly reason: string;
}

const AUTHORIZED_ENVIRONMENTS = new Set(['SHARDS', 'SYNTHETIC_CAMPAIGN', 'OWNER_PROVENANCE', 'COMPATIBILITY']);
const REPORT_SCHEMA = 'nightwatch.skip-identity-report.v2';

function safeReason(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim()
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/(^|[\s=:])(?:[A-Za-z]:[\\/]|\/)[^\s<>"']+/g, '$1<path>')
    .slice(0, 512);
}

function canonicalTitlePath(test: TestCase, file: string): string[] {
  const titlePath = test.titlePath().filter((part) => part.trim().length > 0);
  const fileIndex = titlePath.findIndex((part) => part === file || part === path.basename(file));
  return fileIndex < 0 ? titlePath : titlePath.slice(fileIndex + 1);
}

export default class PlaywrightSkipIdentityReporter implements Reporter {
  private readonly destination: string | null;
  private skips: SkipIdentity[] = [];

  constructor() {
    const gateEnvironment = process.env.NIGHTWATCH_GATE_ENVIRONMENT ?? '';
    const authorized = AUTHORIZED_ENVIRONMENTS.has(gateEnvironment);
    const requested = authorized ? process.env.NIGHTWATCH_SKIP_REPORT_PATH : undefined;
    if (authorized && (requested === undefined || requested.trim() === '')) {
      throw new Error('SKIP_REPORT_PATH_REQUIRED');
    }
    this.destination = requested ?? null;
    if (this.destination !== null && !path.isAbsolute(this.destination)) {
      throw new Error('SKIP_REPORT_PATH_NOT_ABSOLUTE');
    }
  }

  onBegin(_config: FullConfig): void {
    this.skips = [];
  }

  onTestEnd(test: TestCase, _result: TestResult): void {
    if (test.outcome() !== 'skipped') return;
    const annotation = test.annotations.find((entry) => entry.type === 'skip');
    const file = path.relative(process.cwd(), test.location.file).split(path.sep).join('/');
    this.skips.push({
      file,
      line: test.location.line ?? null,
      titlePath: canonicalTitlePath(test, file),
      reason: safeReason(annotation?.description),
    });
  }

  onEnd(_result: FullResult): void {
    if (this.destination === null) return;
    fs.mkdirSync(path.dirname(this.destination), { recursive: true });
    fs.writeFileSync(this.destination, `${JSON.stringify({
      schemaVersion: REPORT_SCHEMA,
      skips: this.skips,
    }, null, 2)}\n`, { mode: 0o600 });
  }
}
