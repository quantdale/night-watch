// ---------------------------------------------------------------------------
// Nightwatch — run evidence event contracts.
// Every observer emits RunEvents through the RunRecorder, which appends them
// to artifacts/<run-id>/events.jsonl (plus filtered views: network.jsonl,
// console.jsonl). All text fields MUST be redacted before calling event().
// ---------------------------------------------------------------------------

export type RunEventType =
  | 'start'
  | 'end'
  | 'env'
  | 'navigation'
  | 'request'
  | 'response'
  | 'console'
  | 'pageerror'
  | 'requestfailed'
  | 'policy'
  | 'telemetry'
  | 'oracle'
  | 'issue'
  | 'hard-failure'
  | 'screenshot'
  | 'stability'
  | 'download'
  | 'service-worker';

export type RunSeverity = 'info' | 'warn' | 'error' | 'fatal';

export interface RunEvent {
  /** Monotonic sequence number assigned by the recorder. */
  seq: number;
  /** ISO-8601 timestamp (injected clock for determinism in tests). */
  ts: string;
  type: RunEventType;
  severity: RunSeverity;
  message: string;
  data?: Record<string, unknown>;
}

/** Data attached to 'request' events (already redacted by the caller). */
export interface RequestEventData {
  method: string;
  url: string;
  headers?: Record<string, string>;
  resourceType?: string;
  /** True when the policy blocked this request (deny or telemetry). */
  blockedByPolicy?: boolean;
  verdict?: string;
  reason?: string;
}

/** Data attached to 'response' events. */
export interface ResponseEventData {
  url: string;
  status: number;
  contentType?: string;
  /** Redacted body, only for JSON-ish content types, capped in size. */
  body?: string;
  bodyRedacted?: boolean;
}

export interface RunSummary {
  runId: string;
  environment: string;
  product: string;
  browser: string;
  scenario: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  passed: boolean;
  eventCount: number;
  /** Counts by RunEventType. */
  counts: Record<string, number>;
  /** Counts by RunSeverity. */
  severityCounts: Record<string, number>;
  hardFailures: Array<{ ts: string; message: string; reason: string }>;
  screenshots: string[];
  nightwatchSha: string | null;
  /** Sanitized aggregate from the independent outer proxy, when configured. */
  proxy?: {
    allowed: number;
    telemetryBlocked: number;
    denied: number;
    unknown: number;
    violations: number;
  };
  notes?: string[];
}

export interface RepoSnapshotRecord {
  /** Path relative to the repos root. */
  path: string;
  /** Branch name, or 'HEAD (detached)' when detached. */
  branch: string;
  /** Full HEAD SHA. */
  headSha: string;
  /** Upstream tracking ref (e.g. origin/master) or null. */
  upstream: string | null;
  /** Ahead/behind vs upstream, or null when no upstream. */
  aheadBehind: { ahead: number; behind: number } | null;
  /** True when the working tree has changes (untracked/modified/deleted). */
  dirty: boolean;
  /** Number of dirty entries per `git status --porcelain`. */
  dirtyFileCount: number;
  /** ISO timestamp of the last commit (author date). */
  lastCommit: string;
  /** ISO timestamp of the snapshot. */
  timestamp: string;
  ok: boolean;
  error?: string;
}
