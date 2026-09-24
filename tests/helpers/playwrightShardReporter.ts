// Strict machine-readable execution reporter for one validation shard.
//
// Unlike the timing reporter, this reporter is an execution authority. When a
// receipt path is supplied by bin/run-shards.mjs, failure to publish a valid
// receipt is allowed to fail the child run; the parent will classify the
// missing/malformed receipt as non-pass. It contains no test titles, paths,
// diagnostics, or environment values.

import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import {
  createShardExecutionReceipt,
  serializeShardExecutionReceipt,
  type ShardPlaywrightStatus,
} from '../../src/core/validation/shardExecutionReceipt';

interface NightwatchShardReporterOptions {
  readonly path?: string;
  readonly shardId?: string;
}

export default class PlaywrightShardReporter implements Reporter {
  private readonly destination: string | null;
  private readonly shardId: string | null;
  private planned = 0;
  private readonly outcomes = new Map<string, 'passed' | 'failed' | 'skipped' | 'unknown'>();

  constructor(options: NightwatchShardReporterOptions = {}) {
    const environmentAuthorizesReceipt = process.env.NIGHTWATCH_GATE_ENVIRONMENT === 'SHARDS';
    const requestedPath = options.path ?? (environmentAuthorizesReceipt ? process.env.NIGHTWATCH_SHARD_RECEIPT_PATH : undefined);
    const requestedId = options.shardId ?? (environmentAuthorizesReceipt ? process.env.NIGHTWATCH_SHARD_ID : undefined);
    if ((requestedPath === undefined) !== (requestedId === undefined)) {
      throw new Error('SHARD_RECEIPT_CONFIGURATION_INVALID');
    }
    if (requestedPath === undefined || requestedId === undefined) {
      this.destination = null;
      this.shardId = null;
      return;
    }
    if (!path.isAbsolute(requestedPath) || requestedId.length === 0) throw new Error('SHARD_RECEIPT_CONFIGURATION_INVALID');
    this.destination = path.resolve(requestedPath);
    this.shardId = requestedId;
  }

  onBegin(_config: FullConfig, suite: Suite): void {
    if (this.destination === null) return;
    this.planned = suite.allTests().length;
    this.outcomes.clear();
  }

  onTestEnd(test: TestCase, _result: TestResult): void {
    if (this.destination === null) return;
    const outcome = test.outcome();
    if (outcome === 'expected') this.outcomes.set(test.id, 'passed');
    else if (outcome === 'unexpected') this.outcomes.set(test.id, 'failed');
    else if (outcome === 'skipped') this.outcomes.set(test.id, 'skipped');
    else this.outcomes.set(test.id, 'unknown');
  }

  onEnd(result: FullResult): void {
    if (this.destination === null || this.shardId === null) return;
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let unknown = 0;
    for (const outcome of this.outcomes.values()) {
      if (outcome === 'passed') passed += 1;
      else if (outcome === 'failed') failed += 1;
      else if (outcome === 'skipped') skipped += 1;
      else unknown += 1;
    }
    const executed = this.outcomes.size;
    const didNotRun = Math.max(0, this.planned - executed);
    const status: ShardPlaywrightStatus = result.status === 'timedout' ? 'timedOut' : result.status;
    const receipt = createShardExecutionReceipt({
      shardId: this.shardId,
      playwrightStatus: status,
      planned: this.planned,
      executed,
      passed,
      failed,
      skipped,
      didNotRun,
      unknown,
    });
    const serialized = serializeShardExecutionReceipt(receipt);
    fs.mkdirSync(path.dirname(this.destination), { recursive: true });
    const temporary = `${this.destination}.${process.pid}-${randomBytes(8).toString('hex')}.tmp`;
    let descriptor: number | undefined;
    try {
      descriptor = fs.openSync(temporary, 'wx', 0o600);
      fs.writeFileSync(descriptor, serialized, { encoding: 'utf8' });
      fs.fsyncSync(descriptor);
      fs.closeSync(descriptor);
      descriptor = undefined;
      fs.renameSync(temporary, this.destination);
      fs.chmodSync(this.destination, 0o600);
    } catch (error) {
      if (descriptor !== undefined) {
        try { fs.closeSync(descriptor); } catch { /* preserve original failure */ }
      }
      try { fs.rmSync(temporary, { force: true }); } catch { /* preserve original failure */ }
      throw error;
    }
  }

  printsToStdio(): boolean {
    return false;
  }
}
