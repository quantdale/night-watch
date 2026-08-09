// ---------------------------------------------------------------------------
// Nightwatch — sanitized proxy event storage and aggregation.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import type { ProxyEvent, ProxySummary } from './types';

export function ensureEventLog(logPath: string): void {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, '');
}

export function appendProxyEvent(logPath: string, event: ProxyEvent): void {
  fs.appendFileSync(logPath, `${JSON.stringify(event)}\n`);
}

/** Read complete JSON lines only; a concurrently written final line is ignored. */
export function readProxyEvents(logPath: string): ProxyEvent[] {
  let raw: string;
  try {
    raw = fs.readFileSync(logPath, 'utf8');
  } catch {
    return [];
  }
  const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
  const out: ProxyEvent[] = [];
  for (const line of lines) {
    try {
      const value = JSON.parse(line) as ProxyEvent;
      if (
        typeof value.seq === 'number' &&
        typeof value.timestamp === 'string' &&
        typeof value.runId === 'string' &&
        typeof value.protocol === 'string' &&
        typeof value.host === 'string' &&
        (typeof value.port === 'number' || value.port === null) &&
        typeof value.classification === 'string' &&
        typeof value.decision === 'string' &&
        typeof value.ruleId === 'string' &&
        typeof value.reason === 'string'
      ) {
        out.push(value);
      }
    } catch {
      // Fail closed for event parsing by omitting incomplete evidence. The
      // proxy itself never treats an evidence write as an allow decision.
    }
  }
  return out;
}

export function summarizeProxyEvents(events: readonly ProxyEvent[]): ProxySummary {
  const summary: ProxySummary = {
    allowed: 0,
    telemetryBlocked: 0,
    optionalSupportBlocked: 0,
    denied: 0,
    unknown: 0,
    violations: 0,
  };
  for (const event of events) {
    if (event.decision === 'allow') summary.allowed += 1;
    else if (event.decision === 'block-telemetry') summary.telemetryBlocked += 1;
    else if (event.decision === 'block-optional-support') summary.optionalSupportBlocked += 1;
    else {
      summary.denied += 1;
      summary.violations += 1;
      if (event.classification === 'unknown-alphaus' || event.classification === 'external') {
        summary.unknown += 1;
      }
    }
  }
  return summary;
}
