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
import { randomBytes } from 'node:crypto';
import type { Page } from '@playwright/test';
import { createRedactionLayer } from '../safety/redaction';
import type { RedactionLayer } from '../safety/redaction';
import type { ProvenRouteTable } from '../safety/provenRoutes';
import { containsPrivatePayload, containsPrivatePayloadShape, privateKeySensitivity } from '../policy';
import type { RepoSnapshotRecord, RunEvent, RunEventType, RunSeverity, RunSummary } from './types';
import { KNOWN_RUN_FAILURE_REASONS } from './types';
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

/**
 * NW-AUD-018: closed firewall-kind vocabulary with per-kind byte budgets
 * pinned to the run-evidence READER limits, so a file the writer admits is
 * a file the reader can still parse.
 */
type RunEvidenceFirewallKind = 'manifest' | 'events' | 'proxy' | 'repositories' | 'summary';
const RUN_EVIDENCE_FIREWALL_LIMITS: Readonly<Record<RunEvidenceFirewallKind, number>> = Object.freeze({
  manifest: 512 * 1024, // runEvidenceReader MAX_MANIFEST_BYTES
  events: 64 * 1024, // reader line bound (MAX_EVENT_TEXT_LENGTH applies per line)
  proxy: 8 * 1024 * 1024, // not read by the Control Center; bounded anyway
  repositories: 2 * 1024 * 1024, // reader MAX_REPOSITORIES_BYTES
  summary: 512 * 1024, // reader MAX_SUMMARY_BYTES
});

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
  private evidencePolicyRecorded = false;
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
    // NW-AUD-018: in authenticated mode the constructor manifest crosses the
    // sanitizer before any byte is published — caller-supplied scenario /
    // environment strings are evidence subject to the same policy as every
    // later entry, not an exempt preamble.
    const manifestPayload = this.authenticated
      ? ((this.sanitizeAuthenticatedData({ manifest }).manifest ?? {}) as Record<string, string>)
      : manifest;
    this.publishJson(manifestFile, manifestPayload, JSON.stringify(manifestPayload, null, 2), 'manifest');
    if (this.authenticated) this.enableAuthenticatedEvidence();
  }

  /** Keep authenticated metadata owner-only even when the process umask is permissive. */
  private secureAuthenticatedArtifact(file: string): void {
    if (this.authenticated) fs.chmodSync(file, 0o600);
  }

  /**
   * NW-AUD-018 — the ONE final typed persistence firewall. Every
   * authenticated byte crosses it immediately before publication: closed
   * kind vocabulary, per-kind byte budget pinned to the reader, no NUL
   * bytes, structural private-shape screen (NW-AUD-019 v2, primary) plus
   * the text screen as defense-in-depth. Diagnostics are categorical and
   * never echo payload content. Unauthenticated artifacts are out of this
   * policy's scope by design (their own screens apply elsewhere).
   */
  private firewall(kind: RunEvidenceFirewallKind, value: unknown, bytes: string): void {
    if (!this.authenticated) return;
    const limit = RUN_EVIDENCE_FIREWALL_LIMITS[kind];
    if (limit === undefined) throw new Error(`RUN_EVIDENCE_FIREWALL_KIND_UNKNOWN:${String(kind)}`);
    if (bytes.length > limit) throw new Error(`RUN_EVIDENCE_FIREWALL_TOO_LARGE:${kind}`);
    if (bytes.includes('\0')) throw new Error(`RUN_EVIDENCE_FIREWALL_MALFORMED:${kind}`);
    if (containsPrivatePayload(value)) throw new Error(`RUN_EVIDENCE_FIREWALL_PRIVACY_BLOCKED:${kind}`);
    if (containsPrivatePayloadShape(bytes)) throw new Error(`RUN_EVIDENCE_FIREWALL_PRIVACY_BLOCKED:${kind}`);
  }

  /** Fail closed on a symlinked, foreign-owned or non-file publish target. */
  private assertPublishTarget(file: string): void {
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(file);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw new Error('RUN_EVIDENCE_PUBLISH_TARGET_UNSAFE');
    }
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('RUN_EVIDENCE_PUBLISH_TARGET_UNSAFE');
    const uid = typeof process.getuid === 'function' ? process.getuid() : undefined;
    if (uid !== undefined && stat.uid !== uid) throw new Error('RUN_EVIDENCE_PUBLISH_TARGET_UNSAFE');
  }

  /**
   * Crash-consistent JSON publication: private equivalent of the
   * privateArtifacts primitive (wx/0600 temporary, file fsync, atomic
   * rename, directory fsync, post-verify) with the firewall and target
   * checks immediately before any byte is committed.
   */
  private publishJson(file: string, value: unknown, serialized: string, kind: RunEvidenceFirewallKind): void {
    this.firewall(kind, value, serialized);
    this.assertPublishTarget(file);
    const temporary = path.join(this.dir, `.nightwatch-${process.pid}-${randomBytes(16).toString('hex')}.tmp`);
    let descriptor: number | undefined;
    try {
      descriptor = fs.openSync(temporary, 'wx', 0o600);
      fs.writeFileSync(descriptor, serialized, { encoding: 'utf8' });
      fs.fsyncSync(descriptor);
      fs.closeSync(descriptor);
      descriptor = undefined;
      fs.chmodSync(temporary, 0o600);
      fs.renameSync(temporary, file);
      this.secureAuthenticatedArtifact(file);
      this.fsyncRunDirectory();
      this.assertPublishTarget(file);
    } catch (error) {
      if (descriptor !== undefined) {
        try { fs.closeSync(descriptor); } catch { /* preserve the original failure */ }
      }
      try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch { /* best effort */ }
      throw error;
    }
  }

  /** Hardened append for the jsonl streams: target check, then append. */
  private appendLine(file: string, line: string): void {
    this.assertPublishTarget(file);
    fs.appendFileSync(file, line);
    this.secureAuthenticatedArtifact(file);
  }

  private fsyncRunDirectory(): void {
    let descriptor: number | undefined;
    try {
      descriptor = fs.openSync(this.dir, 'r');
      fs.fsyncSync(descriptor);
    } catch {
      throw new Error('RUN_EVIDENCE_DIRECTORY_FSYNC_FAILED');
    } finally {
      if (descriptor !== undefined) {
        try { fs.closeSync(descriptor); } catch { /* durability already failed above */ }
      }
    }
  }

  get isAuthenticated(): boolean {
    return this.authenticated;
  }

  /** Switch the recorder to the irreversible authenticated metadata policy. */
  enableAuthenticatedEvidence(): void {
    // Hardening runs on EVERY call: before the first flip it is the
    // verify-then-tighten transaction; afterwards it is an idempotent
    // re-tighten, so the owner-only world can never regress even if the
    // filesystem was loosened behind the recorder's back.
    this.hardenAuthenticatedDirectory();
    if (!this.authenticated) this.authenticated = true;
    if (this.evidencePolicyRecorded) return;
    this.evidencePolicyRecorded = true;
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

  /**
   * NW-AUD-018: bind source-proven endpoint authority so authenticated URL
   * persistence can quote route templates; without this every path reduces
   * to the categorical unknown-route marker.
   */
  bindProvenRoutes(table: ProvenRouteTable): void {
    this.redaction.setProvenRoutes(table);
  }

  /**
   * Two-phase hardening of the run directory for a late authenticated
   * transition. Verification precedes mutation so an ambiguous tree is
   * refused rather than left half-hardened.
   */
  private hardenAuthenticatedDirectory(): void {
    const FAIL = 'AUTHENTICATED_EVIDENCE_TRANSITION_UNSAFE';
    const MAX_FILES = 4096;
    const MAX_DEPTH = 4;
    const uid = typeof process.getuid === 'function' ? process.getuid() : undefined;
    let fileCount = 0;
    const verify = (target: string, depth: number): void => {
      let stat: fs.Stats;
      try {
        stat = fs.lstatSync(target);
      } catch {
        throw new Error(FAIL);
      }
      if (stat.isSymbolicLink()) throw new Error(FAIL);
      if (uid !== undefined && stat.uid !== uid) throw new Error(FAIL);
      if (stat.isDirectory()) {
        if (depth > MAX_DEPTH) throw new Error(FAIL);
        for (const entry of fs.readdirSync(target)) verify(path.join(target, entry), depth + 1);
        return;
      }
      if (!stat.isFile()) throw new Error(FAIL);
      fileCount += 1;
      if (fileCount > MAX_FILES) throw new Error('AUTHENTICATED_EVIDENCE_TRANSITION_TOO_LARGE');
    };
    const tighten = (target: string): void => {
      const stat = fs.lstatSync(target);
      if (stat.isDirectory()) {
        fs.chmodSync(target, 0o700);
        for (const entry of fs.readdirSync(target)) tighten(path.join(target, entry));
      } else {
        fs.chmodSync(target, 0o600);
      }
    };
    verify(this.dir, 0);
    tighten(this.dir);
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
      // NW-AUD-018: the parallel hand-maintained denylist collapses into the
      // SHARED structural key authority (SENSITIVE_PRIVATE_KEYS + compound
      // identity suffixes), so a `billing_group_id`-style key can no longer
      // slip past a regex that only spelled the un-compounded forms.
      const sensitivity = privateKeySensitivity(key);
      if (sensitivity === 'always') return undefined;
      if (sensitivity === 'non-numeric' && typeof value !== 'number') return undefined;
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
    // NW-AUD-018: the key is caller-chosen evidence too — a closed shape in
    // both modes, never a vehicle for an identifier-bearing or prototype-
    // hostile name.
    if (!/^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(key)) {
      throw new Error('AUTHENTICATED_MANIFEST_KEY_UNSAFE');
    }
    const file = path.join(this.dir, 'manifest.json');
    let manifest: Record<string, unknown>;
    try {
      manifest = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
    } catch {
      manifest = {};
    }
    manifest[key] = this.authenticated ? this.sanitizeAuthenticatedData({ value }).value : value;
    this.publishJson(file, manifest, JSON.stringify(manifest, null, 2), 'manifest');
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
    const safeEvents = this.authenticated
      ? relevant.map((e) => (this.sanitizeAuthenticatedData({ event: e }).event as ProxyEvent))
      : relevant;
    const file = path.join(this.dir, 'proxy.jsonl');
    const proxyBytes = safeEvents.map((e) => `${JSON.stringify(e)}\n`).join('');
    this.publishJson(file, safeEvents, proxyBytes, 'proxy');
    return summarizeProxyEvents(safeEvents);
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
    // NW-AUD-018: one firewall, one vocabulary — every authenticated event
    // byte is screened and bounded before any of the three streams see it.
    this.firewall('events', ev, line);
    const eventsFile = path.join(this.dir, 'events.jsonl');
    this.appendLine(eventsFile, line);
    if (input.type === 'request' || input.type === 'response') {
      this.appendLine(path.join(this.dir, 'network.jsonl'), line);
    } else if (input.type === 'console') {
      this.appendLine(path.join(this.dir, 'console.jsonl'), line);
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
      // Keep capture bounded even when a host compositor is unavailable. The
      // browser contract selects the compatible compositor path for current
      // system Chrome before this call.
      await page.screenshot({ path: path.join(this.dir, rel), timeout: 10_000, animations: 'disabled' });
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
    const payload = this.authenticated
      ? ((this.sanitizeAuthenticatedData({ snapshots }).snapshots ?? []) as RepoSnapshotRecord[])
      : snapshots;
    this.publishJson(file, payload, JSON.stringify(payload, null, 2), 'repositories');
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
        const rawReason = d !== undefined && typeof d.reason === 'string' ? d.reason : ev.message;
        // NW-AUD-018: in authenticated mode the writer persists only the
        // categorical form the reader would project anyway — the raw message
        // never reaches the file, and reasons come from the SHARED closed
        // vocabulary (core/evidence/types) rather than a second copy.
        hardFailures.push(this.authenticated
          ? {
            ts: ev.ts,
            message: '[REDACTED_HARD_FAILURE]',
            reason: KNOWN_RUN_FAILURE_REASONS.has(rawReason) ? rawReason : 'RUN_FAILURE_UNCLASSIFIED',
          }
          : { ts: ev.ts, message: ev.message, reason: rawReason });
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
    if (input.notes !== undefined && input.notes.length > 0) {
      // NW-AUD-018: free-form notes never persist in authenticated mode —
      // the writer emits exactly the collapsed token the reader projects.
      summary.notes = this.authenticated ? ['RUN_NOTE_PRESENT'] : input.notes;
    }
    const file = path.join(this.dir, 'summary.json');
    this.publishJson(file, summary, JSON.stringify(summary, null, 2), 'summary');
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
