import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertNoBenchmarkLeakage } from '../../src/core/agentProtocol';
import { defineBenchmarkCase, extractPreFixSnapshot, runBenchmarkHunt } from '../../src/core/benchmark';
import {
  REASONER_DRIVER_VERSION,
  REASONER_TURN_RESPONSE_VERSION,
  type ReasonerCallResult,
  type ReasonerDriver,
} from '../../src/core/agentProtocol';

function git(repo: string, args: readonly string[]): string {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', shell: false });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'git failed');
  return result.stdout.trim();
}

test('pre-fix snapshot is parent blobs only and never leaks the fix SHA or message', async () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-prefix-'));
  try {
    git(repo, ['init', '-b', 'main']);
    git(repo, ['config', 'user.email', 'nightwatch@example.invalid']);
    git(repo, ['config', 'user.name', 'Nightwatch Fixture']);
    fs.writeFileSync(path.join(repo, 'total.ts'), 'export const total = 101;\n');
    git(repo, ['add', 'total.ts']);
    git(repo, ['commit', '-m', 'seed cart total']);
    fs.writeFileSync(path.join(repo, 'total.ts'), 'export const total = 100;\n');
    git(repo, ['add', 'total.ts']);
    git(repo, ['commit', '-m', 'fix off-by-one cart total']);
    const sha = git(repo, ['rev-parse', 'HEAD']);
    const extracted = extractPreFixSnapshot(repo, sha);
    expect(extracted.status).toBe('EXTRACTED');
    expect(extracted.snapshot).toContain('export const total = 101;');
    expect(extracted.snapshot).not.toContain('export const total = 100;');
    expect(extracted.snapshot).not.toContain(sha);
    expect(extracted.snapshot).not.toContain('fix off-by-one cart total');
    const defined = defineBenchmarkCase({
      caseId: 'mined-prefix-1',
      productFamily: 'fixture',
      category: 'billing',
      hidden: {
        fixCommit: sha,
        fixDiff: 'export const total = 100;',
        issueTitle: null,
        bugDescription: 'fix off-by-one cart total',
        knownFailingTest: null,
        explanation: null,
      },
      preFix: {
        symptomReport: 'inspect the listed pre-fix files for anomalies',
        sourceSnapshot: extracted.snapshot,
        reproSteps: 'observe pre-fix blobs only',
      },
    });
    expect(() => assertNoBenchmarkLeakage({ blobs: [defined.preFix.sourceSnapshot] }, defined.hidden)).not.toThrow();
    const blind: ReasonerDriver = {
      protocolVersion: REASONER_DRIVER_VERSION,
      transport: 'CLI',
      provenance: { transport: 'CLI', executableBasename: 'blind', provider: 'fixture', model: 'blind' },
      async complete(): Promise<ReasonerCallResult> {
        return {
          ok: true,
          response: {
            schemaVersion: REASONER_TURN_RESPONSE_VERSION,
            intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }],
            hypotheses: [],
          },
          provenance: { transport: 'CLI', executableBasename: 'blind', provider: 'fixture', model: 'blind' },
          stdoutBytes: 8,
          stderrBytes: 0,
        };
      },
    };
    const hunt = await runBenchmarkHunt(defined, { reasoner: blind, maxTurns: 3 });
    expect(hunt.leaked).toEqual([]);
    expect(hunt.admitted).toBe(false);
    expect(hunt.requestBlobs.join('\n')).not.toContain(sha);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('invalid SHA is DATA_BLOCKED and invents no snapshot', () => {
  const blocked = extractPreFixSnapshot('/tmp', 'not-a-sha');
  expect(blocked.status).toBe('DATA_BLOCKED');
  expect(blocked.snapshot).toBe('');
  expect(blocked.files).toEqual([]);
});
