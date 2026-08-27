// ---------------------------------------------------------------------------
// Nightwatch — run evidence recorder.
//
// Standard evidence passes through the shared RedactionLayer BEFORE
// persistence. Authenticated evidence has a second recorder-level guard:
// metadata-only mode strips bodies, headers, storage, arbitrary query values,
// and sensitive path identifiers even if a caller supplies them by mistake.
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
import { readProxyEvents, summarizeProxyEvents } from '../../proxy/events';
import type { ProxyEvent, ProxyRuntimeState, ProxySummary } from '../../proxy/types';

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface RunRecorderOptions {
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
  /** Enable metadata-first persistence for a real authenticated run. */
  authenticated?: boolean;
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface RecorderProxyOptions {
  state: ProxyRuntimeState;
  browserGuardsEnabled: boolean;
  onViolation?: (event: ProxyEvent, failureEvent: RunEvent) => void;
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
  private authenticated: boolean;
  private seq = 0;
  private readonly events: RunEvent[] = [];
  private proxy: {
    state: ProxyRuntimeState;
    startIndex: number;
    browserGuardsEnabled: boolean;
    onViolation?: (event: ProxyEvent, failureEvent: RunEvent) => void;
    consumedViolationSeqs: Set<number>;
  } | null = null;

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
    this.authenticated = opts.authenticated ?? false;
    this.now = opts.now ?? (() => new Date());
    this.redaction = createRedactionLayer();

    const artifactsRoot = opts.artifactsRoot ?? path.join(__dirname, '..', '..', '..', 'artifacts');
    this.dir = path.join(artifactsRoot, opts.runId);
    fs.mkdirSync(this.dir, { recursive: true });
    if (this.authenticated) fs.chmodSync(this.dir, 0o700);
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
    const manifestFile = path.join(this.dir, 'manifest.json');
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    this.secureAuthenticatedArtifact(manifestFile);
    if (this.authenticated) this.enableAuthenticatedEvidence();
  }

  /** Keep authenticated metadata owner-only even when the process umask is permissive. */
  private secureAuthenticatedArtifact(file: string): void {
    if (this.authenticated) fs.chmodSync(file, 0o600);
  }

  get isAuthenticated(): boolean {
    return this.authenticated;
  }

  /** Switch the recorder to the irreversible authenticated metadata policy. */
  enableAuthenticatedEvidence(): void {
    this.authenticated = true;
    this.addManifestEntry('evidencePolicy', {
      mode: 'authenticated-metadata-first',
      requestHeaders: false,
      requestBodies: false,
      responseBodies: false,
      queryValues: false,
      pathIdentifiers: 'placeholder',
      storageState: false,
      customerDom: false,
      screenshots: false,
      traces: false,
    });
  }

  /** URL helper used by observers so authenticated paths are minimized too. */
  redactUrl(url: string): string {
    return this.authenticated ? this.redaction.redactAuthenticatedUrl(url) : this.redaction.redactUrl(url);
  }

  /** Stable category for transport errors; raw error text is not evidence. */
  classifyNetworkFailure(errorText: string): string {
    if (/^(?:client-or-policy-abort|dns-failure|timeout|tls-failure|transport-failure)$/.test(errorText)) return errorText;
    if (/ERR_ABORTED|ERR_BLOCKED_BY_CLIENT|inspector/i.test(errorText)) return 'client-or-policy-abort';
    if (/NAME_NOT_RESOLVED|DNS/i.test(errorText)) return 'dns-failure';
    if (/TIMED_OUT|TIMEOUT/i.test(errorText)) return 'timeout';
    if (/SSL|CERT|TLS/i.test(errorText)) return 'tls-failure';
    return 'transport-failure';
  }

  private sanitizeAuthenticatedMessage(message: string): string {
    const redacted = this.redaction.redactText(message);
    return redacted.replace(/\b(?:https?|wss?):\/\/[^\s)]+/gi, (url) => this.redaction.redactAuthenticatedUrl(url));
  }

  private sanitizeAuthenticatedData(data: Record<string, unknown>): Record<string, unknown> {
    const forbidden = /^(?:authorization|headers?|cookie|set-cookie|body|requestbody|responsebody|access[_-]?token|refresh[_-]?token|id[_-]?token|token|secret|password|credential|cookies|storage|localstorage|sessionstorage|storage_state|dom|html|textcontent|query|querystring|search|searchparams|email|customer(?:name|id)?|account(?:id)?|msp(?:id)?|billing(?:group)?(?:id|name)?|invoice(?:id|amount)?|cost|amount)$/i;
    const visit = (value: unknown, key: string): unknown => {
      if (forbidden.test(key)) return undefined;
      if (Array.isArray(value)) return value.map((item) => visit(item, key)).filter((item) => item !== undefined);
      if (value !== null && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
          const safe = visit(childValue, childKey);
          if (safe !== undefined) out[childKey] = safe;
        }
        return out;
      }
      if (typeof value !== 'string') return value;
      if (key === 'url') return this.redaction.redactAuthenticatedUrl(value);
      if (key === 'errorText') return this.classifyNetworkFailure(value);
      if (key === 'message' || key === 'text') return '[SUPPRESSED_AUTHENTICATED_TEXT]';
      return this.redaction.redactText(value);
    };
    return (visit(data, 'data') as Record<string, unknown>) ?? {};
  }

  /**
   * Add (or replace) a manifest.json entry after construction, e.g. the trace
   * decision made by the harness. Deterministic: same inputs, same bytes.
   */
  addManifestEntry(key: string, value: unknown): void {
    const file = path.join(this.dir, 'manifest.json');
    let manifest: Record<string, unknown>;
    try {
      manifest = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
    } catch {
      manifest = {};
    }
    manifest[key] = this.authenticated ? this.sanitizeAuthenticatedData({ value }).value : value;
    fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
    this.secureAuthenticatedArtifact(file);
  }

  /** Bind this recorder to the already-running Nightwatch outer proxy. */
  configureProxy(opts: RecorderProxyOptions): void {
    const existing = readProxyEvents(opts.state.eventLogPath);
    this.proxy = {
      state: opts.state,
      startIndex: existing.length,
      browserGuardsEnabled: opts.browserGuardsEnabled,
      onViolation: opts.onViolation,
      consumedViolationSeqs: new Set<number>(),
    };
    this.addManifestEntry('networkContainment', {
      proxyEnabled: true,
      proxyAddress: `loopback:${opts.state.port}`,
      proxyPolicyVersion: opts.state.policyVersion,
      proxyContainmentVersion: opts.state.containmentVersion,
      resolvedAddressPolicyVersion: opts.state.resolvedAddressPolicyVersion,
      addressBindingVersion: opts.state.addressBindingVersion,
      browserGuardsEnabled: opts.browserGuardsEnabled,
    });
  }

  /**
   * Pull new proxy events into sanitized run evidence and notify the monitor
   * callback for denied production/unknown traffic. The proxy never stores
   * request headers, cookies, bodies, query strings, or tokens.
   */
  syncProxyViolations(): ProxySummary | null {
    if (this.proxy === null) return null;
    const all = readProxyEvents(this.proxy.state.eventLogPath);
    const relevant = all.slice(this.proxy.startIndex);
    for (const event of relevant) {
      if ((event.decision !== 'deny' && event.containmentViolation === undefined) || this.proxy.consumedViolationSeqs.has(event.seq)) continue;
      this.proxy.consumedViolationSeqs.add(event.seq);
      const failureEvent = this.onProxyViolation(event);
      this.proxy.onViolation?.(event, failureEvent);
    }
    const file = path.join(this.dir, 'proxy.jsonl');
    fs.writeFileSync(file, relevant.map((e) => `${JSON.stringify(e)}\n`).join(''));
    this.secureAuthenticatedArtifact(file);
    return summarizeProxyEvents(relevant);
  }

  private onProxyViolation(event: ProxyEvent): RunEvent {
    const safeTarget = `${event.protocol}://${event.host}${event.port === null ? '' : `:${event.port}`}/`;
    const containment = event.containmentViolation !== undefined;
    return this.event({
      type: 'hard-failure',
      severity: 'fatal',
      message: containment
        ? `HARD FAILURE: outer proxy containment check failed ${safeTarget}`
        : `HARD FAILURE: outer proxy denied ${safeTarget}`,
      data: {
        url: safeTarget,
        verdict: event.decision,
        hostClass: event.classification,
        reason: event.containmentViolation ?? event.reason,
        ...(event.resolutionReason === undefined ? {} : { resolution: event.resolutionReason }),
        ...(event.connectionFailure === undefined ? {} : { connection: event.connectionFailure }),
        path: 'outer-proxy',
        proxyRuleId: event.ruleId,
      },
    });
  }

  /**
   * Record one event. Standard callers provide redacted values; authenticated
   * mode applies a second metadata-only persistence guard here.
   * Events are appended to events.jsonl; 'request'/'response' events are also
   * mirrored to network.jsonl and 'console' events to console.jsonl.
   */
  event(input: {
    type: RunEventType;
    severity: RunSeverity;
    message: string;
    data?: Record<string, unknown>;
  }): RunEvent {
    const message = this.authenticated ? this.sanitizeAuthenticatedMessage(input.message) : input.message;
    const data = input.data === undefined
      ? undefined
      : this.authenticated
        ? this.sanitizeAuthenticatedData(input.data)
        : input.data;
    const ev: RunEvent = {
      seq: this.seq++,
      ts: this.now().toISOString(),
      type: input.type,
      severity: input.severity,
      message,
    };
    if (data !== undefined) ev.data = data;
    const line = `${JSON.stringify(ev)}\n`;
    const eventsFile = path.join(this.dir, 'events.jsonl');
    fs.appendFileSync(eventsFile, line);
    this.secureAuthenticatedArtifact(eventsFile);
    if (input.type === 'request' || input.type === 'response') {
      const networkFile = path.join(this.dir, 'network.jsonl');
      fs.appendFileSync(networkFile, line);
      this.secureAuthenticatedArtifact(networkFile);
    } else if (input.type === 'console') {
      const consoleFile = path.join(this.dir, 'console.jsonl');
      fs.appendFileSync(consoleFile, line);
      this.secureAuthenticatedArtifact(consoleFile);
    }
    this.events.push(ev);
    return ev;
  }

  /** Capture a screenshot; returns its path relative to the run dir (or null). */
  async captureScreenshot(page: Page, name: string): Promise<string | null> {
    if (this.authenticated) {
      this.event({
        type: 'policy',
        severity: 'info',
        message: 'authenticated screenshot capture disabled',
        data: { reason: 'authenticated-evidence-minimization' },
      });
      return null;
    }
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
    this.secureAuthenticatedArtifact(file);
    return file;
  }

  /** Write summary.json and return the run summary. */
  async finalize(input: { passed: boolean; notes?: string[] }): Promise<RunSummary> {
    const proxySummary = this.syncProxyViolations();
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
      passed: input.passed && (proxySummary === null || proxySummary.violations === 0),
      eventCount: this.events.length,
      counts,
      severityCounts,
      hardFailures,
      screenshots,
      nightwatchSha: this.nightwatchSha,
    };
    if (proxySummary !== null) summary.proxy = proxySummary;
    if (input.notes !== undefined) summary.notes = input.notes;
    const file = path.join(this.dir, 'summary.json');
    fs.writeFileSync(file, JSON.stringify(summary, null, 2));
    this.secureAuthenticatedArtifact(file);
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
