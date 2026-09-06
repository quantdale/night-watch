import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  BUG_ATLAS_RECORD_VERSION,
  REASONER_DRIVER_VERSION,
  REASONER_TURN_RESPONSE_VERSION,
  type BugAtlasRecord,
  type ReasonerCallResult,
  type ReasonerDriver,
} from '../../src/core/agentProtocol';
import { mineLocalGitHistory } from '../../src/core/bugAtlas';
import {
  resolveMinedRepoPath,
  runBenchmarkHunt,
  scoreBenchmarkCandidate,
  tryDefineMinedBenchmarkCase,
} from '../../src/core/benchmark';
import { DEFAULT_SIBLING_ROOT } from '../../src/core/source/siblingSource';

const BLIND: ReasonerDriver = {
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

function git(repo: string, args: readonly string[]): string {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', shell: false });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'git failed');
  return result.stdout.trim();
}

function record(partial: Pick<BugAtlasRecord, 'bugId' | 'repository' | 'symptom' | 'provenance'>): BugAtlasRecord {
  return {
    schemaVersion: BUG_ATLAS_RECORD_VERSION,
    product: 'fixture',
    service: null,
    expected: null,
    actual: null,
    trigger: null,
    rootCause: null,
    fixLocator: null,
    testsAdded: [],
    violatedInvariant: null,
    detectionSignals: [],
    relatedBugIds: [],
    ...partial,
  };
}

test('mined record becomes a leak-free pre-fix case on a local git fixture', async () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-mined-case-'));
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
    const defined = tryDefineMinedBenchmarkCase(
      record({
        bugId: 'FIXTURE-001',
        repository: 'example/ledger',
        symptom: 'fix off-by-one cart total',
        provenance: {
          category: 'OBSERVATION',
          repository: 'example/ledger',
          sourceSha: sha,
          locator: null,
          confidence: 'LOW',
        },
      }),
      repo,
    );
    expect(defined).not.toBeNull();
    expect(defined!.hidden.explanation).toBe('fix off-by-one cart total');
    expect(defined!.preFix.sourceSnapshot).toContain('export const total = 101;');
    expect(defined!.preFix.sourceSnapshot).not.toContain(sha);
    expect(defined!.preFix.symptomReport).not.toContain('fix off-by-one');
    const overlap = scoreBenchmarkCandidate('off-by-one cart total in total.ts', defined!.hidden, {
      visibleFiles: ['total.ts'],
    });
    expect(overlap.fileHits).toBe(1);
    expect(overlap.keywordRecall).toBeGreaterThan(0);
    expect(overlap.outcome).not.toBe('MISS');
    const hunt = await runBenchmarkHunt(defined!, { reasoner: BLIND, maxTurns: 3 });
    expect(hunt.leaked).toEqual([]);
    expect(hunt.admitted).toBe(false);
    expect(hunt.outcome).toBe('MISS');
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('added test file in the fix is hidden knownFailingTest and does not leak', async () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-mined-added-test-'));
  try {
    git(repo, ['init', '-b', 'main']);
    git(repo, ['config', 'user.email', 'nightwatch@example.invalid']);
    git(repo, ['config', 'user.name', 'Nightwatch Fixture']);
    fs.writeFileSync(path.join(repo, 'total.ts'), 'export const total = 101;\n');
    git(repo, ['add', 'total.ts']);
    git(repo, ['commit', '-m', 'seed cart total']);
    fs.writeFileSync(path.join(repo, 'total.ts'), 'export const total = 100;\n');
    fs.writeFileSync(path.join(repo, 'total.test.ts'), 'import { total } from "./total";\nif (total !== 100) throw new Error("off-by-one");\n');
    git(repo, ['add', 'total.ts', 'total.test.ts']);
    git(repo, ['commit', '-m', 'fix off-by-one cart total']);
    const sha = git(repo, ['rev-parse', 'HEAD']);
    const defined = tryDefineMinedBenchmarkCase(
      record({
        bugId: 'FIXTURE-ADDED-TEST',
        repository: 'example/ledger',
        symptom: 'fix off-by-one cart total',
        provenance: {
          category: 'OBSERVATION',
          repository: 'example/ledger',
          sourceSha: sha,
          locator: null,
          confidence: 'LOW',
        },
      }),
      repo,
    );
    expect(defined).not.toBeNull();
    expect(defined!.hidden.knownFailingTest).toBe('total.test.ts');
    expect(defined!.preFix.sourceSnapshot).not.toContain('total.test.ts');
    expect(defined!.preFix.sourceSnapshot).toContain('export const total = 101;');
    const named = scoreBenchmarkCandidate('total.test.ts covers total.ts off-by-one', defined!.hidden, {
      visibleFiles: ['total.ts'],
    });
    expect(named.testMatch).toBe(true);
    const hunt = await runBenchmarkHunt(defined!, { reasoner: BLIND, maxTurns: 3 });
    expect(hunt.leaked).toEqual([]);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});


test('bounded sibling mine runs isolated hunts without leaking fix SHAs', async () => {
  const report = mineLocalGitHistory({ maxRepos: 2, maxCommitsPerRepo: 20 });
  test.skip(report.status !== 'MINED' || report.records.length === 0, 'sibling historical data unavailable');
  const root = report.repositoriesRoot ?? DEFAULT_SIBLING_ROOT;
  let isolated = 0;
  let hunts = 0;
  let misses = 0;
  for (const item of report.records) {
    const repoPath = resolveMinedRepoPath(root, item.repository);
    if (repoPath === null) continue;
    const defined = tryDefineMinedBenchmarkCase(item, repoPath);
    if (defined === null) continue;
    isolated += 1;
    if (hunts >= 2) continue;
    const hunt = await runBenchmarkHunt(defined, { reasoner: BLIND, maxTurns: 3 });
    expect(hunt.leaked).toEqual([]);
    expect(hunt.requestBlobs.join('\n')).not.toContain(item.provenance.sourceSha ?? 'never');
    hunts += 1;
    if (hunt.outcome === 'MISS') misses += 1;
  }
  expect(isolated).toBeGreaterThan(0);
  expect(hunts).toBeGreaterThan(0);
  expect(misses).toBe(hunts);
});
