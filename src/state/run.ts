// ---------------------------------------------------------------------------
// Nightwatch — run monitor (in-memory failure state for the harness).
//
// The monitor aggregates hard failures (denied outbound requests) and oracle
// issues so journeys/scenarios can make a fail/pass decision at the end of a
// run, and can produce short human-readable notes for summary.json.
// ---------------------------------------------------------------------------

import type { RunEvent } from '../core/evidence/types';

/**
 * Semantic issue type: the failOn key that this issue represents. Issue
 * events carry the generic recorder type ('issue'/'oracle') with the semantic
 * name mirrored into data.reason.
 */
function semanticTypeOf(event: RunEvent): string {
  return typeof event.data?.reason === 'string' ? event.data.reason : event.type;
}

/** One denied outbound request (policy hard failure). */
export interface HardFailureRecord {
  ts: string;
  url: string;
  verdict: string;
  hostClass: string;
  reason: string;
}

export class RunMonitor {
  /** Fail-on set; 'hard-failure' is always fatal and cannot be turned off. */
  private readonly failOnSet: ReadonlySet<string>;

  readonly hardFailures: HardFailureRecord[] = [];
  /** Every issue event recorded (any type), in sequence. */
  readonly issues: RunEvent[] = [];
  /** True after any hard failure or any issue whose type is in failOn. */
  failed = false;

  constructor(failOn: readonly string[]) {
    this.failOnSet = new Set([...failOn, 'hard-failure']);
  }

  /** Record a policy hard failure (denied outbound request) — always fatal. */
  recordHardFailure(
    event: RunEvent,
    data: { url: string; verdict: string; hostClass: string; reason: string }
  ): void {
    this.hardFailures.push({
      ts: event.ts,
      url: data.url,
      verdict: data.verdict,
      hostClass: data.hostClass,
      reason: data.reason,
    });
    this.failed = true;
  }

  /**
   * Record an oracle issue. Sets `failed` iff the issue's semantic type is in
   * failOn. The recorder's RunEventType union is fixed, so issue events carry
   * the generic type ('issue'/'oracle') with the semantic type
   * ('console-error', 'pageerror', 'malformed-json', ...) in data.reason;
   * the semantic type is what failOn matches against.
   */
  recordIssue(event: RunEvent): void {
    this.issues.push(event);
    if (this.failOnSet.has(event.type) || this.failOnSet.has(semanticTypeOf(event))) {
      this.failed = true;
    }
  }

  /** Short lines describing failure causes (for summary.json notes). */
  summaryNotes(): string[] {
    const notes: string[] = [];
    for (const hf of this.hardFailures) {
      notes.push(`hard failure: ${hf.verdict} ${hf.hostClass} — ${hf.reason} (${hf.url})`);
    }
    for (const ev of this.issues) {
      if (this.failOnSet.has(semanticTypeOf(ev)) || this.failOnSet.has(ev.type)) {
        notes.push(`issue (${semanticTypeOf(ev)}): ${ev.message}`);
      }
    }
    return notes;
  }
}
