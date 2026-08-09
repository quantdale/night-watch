// ---------------------------------------------------------------------------
// Nightwatch — run evidence recorder.
//
// All evidence passes through the shared RedactionLayer BEFORE persistence;
// the recorder never receives unredacted secrets. Callers MUST redact every
// message/data payload (redaction.redactText / redactUrl / redactHeaders)
// before handing it to event() — the recorder applies NO redaction itself.
//
// Per-run layout:  artifacts/<run-id>/
//   manifest.json       — run identity, written at construction
//   events.jsonl        — every event, one JSON object per line
//   network.jsonl       — request/response events only (subset of events.jsonl)
//   console.jsonl       — console events only
//   screenshots/        — captured screenshots
//   repositories.json   — repo snapshots (via writeRepositories)
//   summary.json        — run summary (via finalize)
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { createRedactionLayer } from '../safety/redaction';
import type { RedactionLayer } from '../safety/redaction';
import type { RepoSnapshotRecord, RunEvent, RunEventType, RunSeverity, RunSummary } from './types';

export interface RunRecorderOptions {
  runId: string;
  environment: string;
  product: string;
  browser: string;
  scenario: string;
  /** Optional deterministic seed for the scenario; recorded in the manifest. */
  seed?: string;
  /** Nightwatch repo HEAD SHA, when resolvable at run start. */
  nightwatchSha?: string | null;
  /** Injectable clock (determinism in tests); defaults to new Date(). */
  now?: () => Date;
  /** Override the artifacts root; defaults to <nightwatch>/artifacts. */
  artifactsRoot?: string;
}

export class RunRecorder {
  /** Layer callers use to redact evidence BEFORE calling event(). */
  readonly redaction: RedactionLayer;
  /** Absolute path of this run's evidence directory. */
  readonly dir: string;

  private readonly runId: string;
  private readonly environment: string;
  private readonly product: string;
  private readonly browser: string;
  private readonly scenario: string;
  private readonly nightwatchSha: string | null;
  private readonly now: () => Date;
  private readonly startedAt: string;
  private seq = 0;
  private readonly events: RunEvent[] = [];

  constructor(opts: RunRecorderOptions) {
    if (!/^[A-Za-z0-9._-]+$/.test(opts.runId)) {
      throw new Error(
        `invalid runId ${JSON.stringify(opts.runId)}: only [A-Za-z0-9._-] are allowed`
      );
    }
    this.runId = opts.runId;
    this.environment = opts.environment;
    this.product = opts.product;
    this.browser = opts.browser;
    this.scenario = opts.scenario;
    this.nightwatchSha = opts.nightwatchSha ?? null;
    this.now = opts.now ?? (() => new Date());
    this.redaction = createRedactionLayer();

    const artifactsRoot = opts.artifactsRoot ?? path.join(__dirname, '..', '..', '..', 'artifacts');
    this.dir = path.join(artifactsRoot, opts.runId);
    fs.mkdirSync(this.dir, { recursive: true });
    this.startedAt = this.now().toISOString();

    // Manifest: run ID, timestamp, environment, product, browser, scenario,
    // seed (when applicable), Nightwatch git SHA (when available).
    const manifest: Record<string, string> = {
      runId: opts.runId,
      timestamp: this.startedAt,
      environment: opts.environment,
      product: opts.product,
      browser: opts.browser,
      scenario: opts.scenario,
    };
    if (opts.seed !== undefined) manifest.seed = opts.seed;
    if (opts.nightwatchSha != null) manifest.nightwatchSha = opts.nightwatchSha;
    fs.writeFileSync(path.join(this.dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  }

  /**
   * Record one event. Message and data MUST already be redacted by the caller.
   * Events are appended to events.jsonl; 'request'/'response' events are also
   * mirrored to network.jsonl and 'console' events to console.jsonl.
   */
  event(input: {
    type: RunEventType;
    severity: RunSeverity;
    message: string;
    data?: Record<string, unknown>;
  }): RunEvent {
    const ev: RunEvent = {
      seq: this.seq++,
      ts: this.now().toISOString(),
      type: input.type,
      severity: input.severity,
      message: input.message,
    };
    if (input.data !== undefined) ev.data = input.data;
    const line = `${JSON.stringify(ev)}\n`;
    fs.appendFileSync(path.join(this.dir, 'events.jsonl'), line);
    if (input.type === 'request' || input.type === 'response') {
      fs.appendFileSync(path.join(this.dir, 'network.jsonl'), line);
    } else if (input.type === 'console') {
      fs.appendFileSync(path.join(this.dir, 'console.jsonl'), line);
    }
    this.events.push(ev);
    return ev;
  }

  /** Capture a screenshot; returns its path relative to the run dir (or null). */
  async captureScreenshot(page: Page, name: string): Promise<string | null> {
    const safeName = name.replace(/[\\/]/g, '-');
    const rel = path.join('screenshots', `${safeName}.png`);
    fs.mkdirSync(path.join(this.dir, 'screenshots'), { recursive: true });
    try {
      await page.screenshot({ path: path.join(this.dir, rel) });
    } catch {
      this.event({
        type: 'screenshot',
        severity: 'warn',
        message: `Screenshot failed: ${safeName}`,
        data: { file: rel },
      });
      return null;
    }
    this.event({
      type: 'screenshot',
      severity: 'info',
      message: `Screenshot saved: ${rel}`,
      data: { file: rel },
    });
    return rel;
  }

  /** Persist repository snapshots to repositories.json; returns the file path. */
  async writeRepositories(snapshots: RepoSnapshotRecord[]): Promise<string> {
    const file = path.join(this.dir, 'repositories.json');
    fs.writeFileSync(file, JSON.stringify(snapshots, null, 2));
    return file;
  }

  /** Write summary.json and return the run summary. */
  async finalize(input: { passed: boolean; notes?: string[] }): Promise<RunSummary> {
    const endedAt = this.now().toISOString();
    const counts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    const hardFailures: RunSummary['hardFailures'] = [];
    const screenshots: string[] = [];
    for (const ev of this.events) {
      counts[ev.type] = (counts[ev.type] ?? 0) + 1;
      severityCounts[ev.severity] = (severityCounts[ev.severity] ?? 0) + 1;
      if (ev.type === 'hard-failure') {
        const d = ev.data;
        hardFailures.push({
          ts: ev.ts,
          message: ev.message,
          reason: d !== undefined && typeof d.reason === 'string' ? d.reason : ev.message,
        });
      }
      if (ev.type === 'screenshot' && typeof ev.data?.file === 'string') {
        screenshots.push(ev.data.file);
      }
    }
    const startedAt = this.events[0]?.ts ?? this.startedAt;
    const summary: RunSummary = {
      runId: this.runId,
      environment: this.environment,
      product: this.product,
      browser: this.browser,
      scenario: this.scenario,
      startedAt,
      endedAt,
      durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)),
      passed: input.passed,
      eventCount: this.events.length,
      counts,
      severityCounts,
      hardFailures,
      screenshots,
      nightwatchSha: this.nightwatchSha,
    };
    if (input.notes !== undefined) summary.notes = input.notes;
    fs.writeFileSync(path.join(this.dir, 'summary.json'), JSON.stringify(summary, null, 2));
    return summary;
  }
}

/**
 * Build a run ID: nightwatch-<YYYYMMDDTHHMMSSZ>-<4 hex chars> (UTC), e.g.
 * nightwatch-20260809T025000Z-a1b2.
 */
export function createRunId(now?: Date): string {
  const d = now ?? new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
  const rand = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `nightwatch-${stamp}-${rand}`;
}
