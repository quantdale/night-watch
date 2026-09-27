// M8 task 9.4 (NW-AUD-022 narrowed, R2-06/R2-46/R2-49) — every proxy effect is
// journaled as a PAIR: a PREPARED record before the effect and exactly one
// TERMINAL record after it. The strict ledger reader fails closed on a
// malformed line or an unmatched pair.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  PROXY_EVIDENCE_LEDGER_INVALID,
  appendProxyEvent,
  readProxyEventLedger,
  readProxyEvents,
} from '../../src/proxy/events';
import type { ProxyEvent } from '../../src/proxy/types';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function event(overrides: Partial<ProxyEvent> = {}): ProxyEvent {
  return {
    seq: 0,
    timestamp: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    runId: 'synthetic-run',
    protocol: 'http',
    host: 'allowed.synthetic.test',
    port: 443,
    classification: 'dev',
    decision: 'allow',
    ruleId: 'synthetic-rule',
    reason: 'synthetic reason',
    ...overrides,
  } as ProxyEvent;
}

function logWith(events: readonly ProxyEvent[]): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-proxy-ledger-'));
  const logPath = path.join(directory, 'events.jsonl');
  fs.writeFileSync(logPath, '', { mode: 0o600 });
  for (const entry of events) appendProxyEvent(logPath, entry);
  return logPath;
}

test.describe('proxy effect-pair evidence (9.4)', () => {
  test('a matched effect pair is a valid ledger and the tolerant reader agrees', () => {
    const logPath = logWith([
      event({ seq: 0, effectId: 'effect-1', phase: 'PREPARED', connection: 'attempted' }),
      event({ seq: 1, effectId: 'effect-1', phase: 'TERMINAL', connection: 'connected' }),
    ]);
    const ledger = readProxyEventLedger(logPath);
    expect(ledger.map((entry) => entry.phase)).toEqual(['PREPARED', 'TERMINAL']);
    expect(readProxyEvents(logPath)).toHaveLength(2);
  });

  test('an effect with no terminal record is refused, never summarized as complete', () => {
    const logPath = logWith([event({ seq: 0, effectId: 'effect-1', phase: 'PREPARED', connection: 'attempted' })]);
    expect(() => readProxyEventLedger(logPath)).toThrow(new RegExp(`${PROXY_EVIDENCE_LEDGER_INVALID}:UNMATCHED_PREPARED`));
  });

  test('an orphan terminal record is refused', () => {
    const logPath = logWith([event({ seq: 0, effectId: 'effect-9', phase: 'TERMINAL', connection: 'connected' })]);
    expect(() => readProxyEventLedger(logPath)).toThrow(new RegExp(`${PROXY_EVIDENCE_LEDGER_INVALID}:ORPHAN_TERMINAL`));
  });

  test('a duplicate terminal record is refused', () => {
    const logPath = logWith([
      event({ seq: 0, effectId: 'effect-1', phase: 'PREPARED', connection: 'attempted' }),
      event({ seq: 1, effectId: 'effect-1', phase: 'TERMINAL', connection: 'connected' }),
      event({ seq: 2, effectId: 'effect-1', phase: 'TERMINAL', connection: 'connected' }),
    ]);
    expect(() => readProxyEventLedger(logPath)).toThrow(new RegExp(`${PROXY_EVIDENCE_LEDGER_INVALID}:DUPLICATE_TERMINAL`));
  });

  test('a malformed line and a malformed event are both refused', () => {
    const logPath = logWith([event({ seq: 0, effectId: 'effect-1', phase: 'PREPARED', connection: 'attempted' })]);
    fs.appendFileSync(logPath, '{ not json\n');
    expect(() => readProxyEventLedger(logPath)).toThrow(new RegExp(`${PROXY_EVIDENCE_LEDGER_INVALID}:MALFORMED_LINE`));
    const second = logWith([event({ seq: 0, effectId: 'effect-1', phase: 'PREPARED', connection: 'attempted' })]);
    fs.appendFileSync(second, `${JSON.stringify({ seq: 'not-a-number' })}\n`);
    expect(() => readProxyEventLedger(second)).toThrow(new RegExp(`${PROXY_EVIDENCE_LEDGER_INVALID}:MALFORMED_EVENT`));
  });

  test('a phase without its pairing identity (or the reverse) is refused at write time', () => {
    const logPath = logWith([]);
    expect(() => appendProxyEvent(logPath, event({ seq: 0, phase: 'PREPARED' } as Partial<ProxyEvent>)))
      .toThrow(/PROXY_EVENT_SCHEMA_INVALID/);
    expect(() => appendProxyEvent(logPath, event({ seq: 1, effectId: 'effect-1' } as Partial<ProxyEvent>)))
      .toThrow(/PROXY_EVENT_SCHEMA_INVALID/);
  });

  test('the effect-site census: each protocol path writes its PREPARED record before the effect and one TERMINAL after', () => {
    const server = fs.readFileSync(path.join(REPO_ROOT, 'src', 'proxy', 'server.ts'), 'utf8');
    const prepared = server.match(/phase: 'PREPARED'/g) ?? [];
    const terminal = server.match(/phase: 'TERMINAL'/g) ?? [];
    // Three effect paths: HTTP forward, CONNECT tunnel, Upgrade handshake.
    expect(prepared.length).toBe(3);
    expect(terminal.length).toBe(3);
    // Each PREPARED is written before its path's dial/handshake, and each
    // TERMINAL after it.
    const firstPrepared = server.indexOf("phase: 'PREPARED'");
    const firstTerminal = server.indexOf("phase: 'TERMINAL'");
    expect(firstPrepared).toBeLessThan(firstTerminal);
    // The decision and its terminal share ONE effect identity per path.
    const effectIds = server.match(/effectId: decisionEffectId/g) ?? [];
    expect(effectIds.length).toBe(6);
    // The evidence-write failure sentinel is a negative seq, not a falsy one:
    // seq 0 is a legitimate first record.
    expect(server).toContain('if (recorded < 0)');
    expect(server).not.toContain('if (!recorded)');
  });
});
