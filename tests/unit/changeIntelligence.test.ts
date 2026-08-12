import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import fixtures from '../fixtures/change-intelligence/representative-changesets.json';
import {
  RIPPLE_DEPENDENCY_EDGES,
  RIPPLE_REPOSITORIES,
  applyExecutionDisposition,
  bootstrapBaseline,
  collectChangeset,
  combineChangesets,
  initialBaselineState,
  selectJourneys,
  syntheticChangeset,
  writeBaselineAtomic,
  readBaseline,
  addDirtyDevelopmentShadow,
  type ChangedFile,
  type DependencyEdge,
  type RepoDefinition,
} from '../../src/core/changeIntelligence';

const j1 = 'ripple-payer-exchange-read' as const;
const j2 = 'ripple-common-exchange-read' as const;
const j3 = 'ripple-account-inventory' as const;
const stableHead = '0000000000000000000000000000000000000002';

function fixture(id: string) {
  const item = fixtures.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`missing fixture ${id}`);
  return syntheticChangeset({ repoId: item.repoId, headSha: stableHead, files: item.files.map((file) => ({ ...file, repoId: item.repoId })) as ChangedFile[] });
}

function selected(result: ReturnType<typeof selectJourneys>): string[] {
  return result.selectedJourneys.map((journey) => journey.journeyId);
}

function repoWithSourceSha(repoId: string, sourceMapSha: string): RepoDefinition {
  const repo = RIPPLE_REPOSITORIES.find((candidate) => candidate.repoId === repoId);
  if (!repo) throw new Error(`missing repo ${repoId}`);
  return { ...repo, sourceMapSha };
}

test.describe('Phase 3 deterministic selection', () => {
  test('isolated J1 change selects J1 and explains J2/J3 negatives', () => {
    const result = selectJourneys(fixture('j1-component'));
    expect(selected(result)).toEqual([j1]);
    expect(result.nonSelectedJourneys).toEqual([
      { journeyId: j2, reason: 'No source-backed edge or unresolved runtime change targeted this journey.', reasonCode: 'REVIEWED_NOT_DEPENDENCY' },
      { journeyId: j3, reason: 'No source-backed edge or unresolved runtime change targeted this journey.', reasonCode: 'REVIEWED_NOT_DEPENDENCY' },
    ]);
    expect(result.selectedJourneys[0]?.confidence).toBe('HIGH');
    expect(result.selectedJourneys[0]?.priorityTier).toBe('P1');
  });

  test('isolated J2 change selects only J2', () => {
    const result = selectJourneys(fixture('j2-client'));
    expect(selected(result)).toEqual([j2]);
    expect(result.nonSelectedJourneys.map((item) => item.journeyId)).toEqual([j1, j3]);
  });

  test('backend-only J3 change selects J3', () => {
    const result = selectJourneys(fixture('j3-backend'));
    expect(selected(result)).toEqual([j3]);
    expect(result.impactReasons[0]?.reasonCode).toBe('DIRECT_BACKEND_HANDLER');
  });

  test('shared router selects all at P0 without relying on commit text', () => {
    const result = selectJourneys(fixture('shared-router'));
    expect(selected(result)).toEqual([j1, j2, j3]);
    expect(result.priorityOrder).toEqual([j1, j2, j3]);
    expect(result.impactReasons.every((reason) => reason.reasonCode === 'SHARED_ROUTER')).toBe(true);
    expect(result.fallbackTriggered).toBe(false);
  });

  test('unknown runtime impact cannot silently produce zero selection', () => {
    const result = selectJourneys(fixture('unknown-runtime'));
    expect(selected(result)).toEqual([j1, j2, j3]);
    expect(result.fallbackTriggered).toBe(true);
    expect(result.unresolvedImpact[0]?.reasonCode).toBe('UNKNOWN_FALLBACK');
    expect(result.nonSelectedJourneys).toEqual([]);
  });

  test('proven documentation-only change justifies zero selection', () => {
    const result = selectJourneys(fixture('docs-only'));
    expect(selected(result)).toEqual([]);
    expect(result.zeroSelectionJustified).toBe(true);
    expect(result.fallbackTriggered).toBe(false);
    expect(result.nonSelectedJourneys.map((item) => item.reasonCode)).toEqual(['NON_RUNTIME_ONLY', 'NON_RUNTIME_ONLY', 'NON_RUNTIME_ONLY']);
  });

  test('rename preserves the base-path impact edge', () => {
    const result = selectJourneys(fixture('rename-j1'));
    expect(selected(result)).toEqual([j1]);
    expect(result.impactReasons[0]?.previousPath).toContain('PayerExchangeRate/index.vue');
  });

  test('contract change and parser change remain J3-specific', () => {
    expect(selected(selectJourneys(fixture('j3-contract')))).toEqual([j3]);
    const parser = syntheticChangeset({ repoId: 'alphauslabs/grpc-chunk-parser', headSha: stableHead, files: [{ repoId: 'alphauslabs/grpc-chunk-parser', path: 'src/index.ts', status: 'modify' }] });
    expect(selected(selectJourneys(parser))).toEqual([j3]);
  });

  test('duplicate evidence is retained once per logical edge', () => {
    const changeset = syntheticChangeset({ repoId: 'mobingilabs/ripple-ui', headSha: stableHead, files: [
      { repoId: 'mobingilabs/ripple-ui', path: 'src/router.js', status: 'modify' },
      { repoId: 'mobingilabs/ripple-ui', path: 'src/router.js', status: 'modify' },
    ] });
    const result = selectJourneys(changeset);
    expect(result.impactReasons).toHaveLength(3);
    expect(new Set(result.impactReasons.map((reason) => reason.reasonId)).size).toBe(3);
  });

  test('stale map is visible and falls back conservatively', () => {
    const edges: DependencyEdge[] = RIPPLE_DEPENDENCY_EDGES.map((edge) => edge.edgeId === 'j1-client' ? { ...edge, sourceMapSha: 'stale-map-source' } : edge);
    const changeset = syntheticChangeset({ repoId: 'mobingilabs/ripple-ui', headSha: stableHead, files: [{ repoId: 'mobingilabs/ripple-ui', path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }] });
    const result = selectJourneys(changeset, { edges });
    expect(result.fallbackTriggered).toBe(true);
    expect(result.unresolvedImpact[0]?.reasonCode).toBe('STALE_EDGE');
    expect(selected(result)).toEqual([j1, j2, j3]);
  });

  test('determinism excludes generatedAt from changeset identity and selection digest', () => {
    const first = fixture('j2-client');
    const second = { ...first, generatedAt: '2030-01-01T00:00:00.000Z' };
    const a = selectJourneys(first);
    const b = selectJourneys(second);
    expect(first.changesetId).toBe(second.changesetId);
    expect(a).toEqual(b);
  });

  test('reviewed excluded repositories do not select current canaries', () => {
    const excluded: RepoDefinition = { ...RIPPLE_REPOSITORIES[0]!, repoId: 'alphauslabs/alupi', scope: 'REVIEWED_EXCLUDED', sourceMapSha: 'excluded' };
    const result = selectJourneys(syntheticChangeset({ repoId: excluded.repoId, headSha: stableHead, files: [{ repoId: excluded.repoId, path: 'apps/other/src/runtime.ts', status: 'modify' }] }), { repos: [...RIPPLE_REPOSITORIES, excluded] });
    expect(selected(result)).toEqual([]);
    expect(result.zeroSelectionJustified).toBe(true);
  });
});

test.describe('Phase 3 baseline safety', () => {
  test('accepted execution advances only the covered baseline', () => {
    const changeset = fixture('j1-component');
    const initial = initialBaselineState([
      bootstrapBaseline('mobingilabs/ripple-ui', '0000000000000000000000000000000000000001', 'bootstrap fixture'),
    ]);
    const next = applyExecutionDisposition(initial, changeset, { changesetId: changeset.changesetId, status: 'ACCEPTED_SUCCESS', acceptedJourneyIds: [j1] });
    expect(next.records[0]?.baselineSha).toBe(stableHead);
    expect(next.records[0]?.status).toBe('VERIFIED_BASELINE');
  });

  test('failed and blocked execution remain pending and do not advance', () => {
    const changeset = fixture('j1-component');
    const initial = initialBaselineState([
      bootstrapBaseline('mobingilabs/ripple-ui', '0000000000000000000000000000000000000001', 'bootstrap fixture'),
    ]);
    for (const status of ['FAILED', 'BLOCKED'] as const) {
      const next = applyExecutionDisposition(initial, changeset, { changesetId: changeset.changesetId, status, acceptedJourneyIds: [] });
      expect(next.records[0]?.baselineSha).toBe('0000000000000000000000000000000000000001');
      expect(next.records[0]?.status).toBe('PENDING_CHANGESET');
    }
  });

  test('atomic baseline write round-trips without credentials or customer data', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-baseline-'));
    const file = path.join(root, 'baseline.json');
    const state = initialBaselineState([bootstrapBaseline('mobingilabs/ripple-ui', stableHead, 'synthetic')]);
    writeBaselineAtomic(file, state);
    expect(readBaseline(file)).toEqual(state);
    expect(fs.readdirSync(root)).toEqual(['baseline.json']);
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('explicit local dirty shadow is labeled and never changes the committed source window', () => {
    const committed = fixture('j1-component');
    const dirty = addDirtyDevelopmentShadow(committed, [{ repoId: 'mobingilabs/ripple-ui', path: 'src/local-only.js', status: 'add' }]);
    expect(dirty.sourceWindow).toBe('LOCAL_DEVELOPMENT_SHADOW_MODE');
    expect(dirty.dirtyFiles[0]?.path).toBe('src/local-only.js');
    expect(committed.sourceWindow).toBe('COMMITTED_ONLY');
  });
});

test.describe('Phase 3 Git collector', () => {
  const gitFlags = ['-c', 'commit.gpgsign=false', '-c', 'user.email=nightwatch@example.invalid', '-c', 'user.name=Nightwatch Test'];
  const runGit = (cwd: string, args: string[]) => {
    const result = spawnSync('git', [...gitFlags, ...args], { cwd, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr ?? `git failed: ${args.join(' ')}`);
    return (result.stdout ?? '').trim();
  };

  test('collects committed changes, renames, and dirty paths without shell concatenation', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-git-'));
    runGit(root, ['init', '-b', 'main']);
    fs.writeFileSync(path.join(root, 'base.txt'), 'base\n');
    runGit(root, ['add', '--', 'base.txt']);
    runGit(root, ['commit', '-m', 'base']);
    const base = runGit(root, ['rev-parse', 'HEAD']);
    fs.renameSync(path.join(root, 'base.txt'), path.join(root, 'renamed file.txt'));
    fs.writeFileSync(path.join(root, '--leading-dash.txt'), 'safe\n');
    runGit(root, ['add', '-A', '--', '.']);
    runGit(root, ['commit', '-m', 'rename']);
    const head = runGit(root, ['rev-parse', 'HEAD']);
    fs.writeFileSync(path.join(root, 'dirty path.txt'), 'dirty\n');
    const changeset = collectChangeset({ repoPath: root, repoId: 'mobingilabs/ripple-ui', baseSha: base, headSha: head, generatedAt: new Date('2026-08-12T00:00:00.000Z') });
    expect(changeset.changedFiles.map((file) => file.status)).toContain('rename');
    expect(changeset.changedFiles.map((file) => file.path)).toContain('renamed file.txt');
    expect(changeset.changedFiles.map((file) => file.path)).toContain('--leading-dash.txt');
    expect(changeset.dirtyFiles.map((file) => file.path)).toContain('dirty path.txt');
    expect(changeset.sourceWindow).toBe('COMMITTED_ONLY');
    expect(changeset.deploymentStatus).toBe('DEPLOYMENT_STATUS_UNRESOLVED');
    const unchanged = collectChangeset({ repoPath: root, repoId: 'mobingilabs/ripple-ui', baseSha: head, headSha: head, generatedAt: new Date('2026-08-12T00:00:00.000Z') });
    expect(unchanged.changedFiles).toEqual([]);
    fs.unlinkSync(path.join(root, '--leading-dash.txt'));
    runGit(root, ['add', '-A', '--', '.']);
    runGit(root, ['commit', '-m', 'delete']);
    const deletedHead = runGit(root, ['rev-parse', 'HEAD']);
    const deleted = collectChangeset({ repoPath: root, repoId: 'mobingilabs/ripple-ui', baseSha: head, headSha: deletedHead, generatedAt: new Date('2026-08-12T00:00:00.000Z') });
    expect(deleted.changedFiles).toContainEqual({ repoId: 'mobingilabs/ripple-ui', path: '--leading-dash.txt', status: 'delete' });
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('rejects malformed or nonexistent commit identities', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-git-invalid-'));
    runGit(root, ['init', '-b', 'main']);
    expect(() => collectChangeset({ repoPath: root, repoId: 'mobingilabs/ripple-ui', baseSha: 'not-a-sha', headSha: stableHead })).toThrow('baseSha must be a hexadecimal commit SHA');
    expect(() => collectChangeset({ repoPath: root, repoId: 'mobingilabs/ripple-ui', baseSha: stableHead, headSha: stableHead })).toThrow('cat-file');
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('unions multiple repository ranges with stable repository ordering', () => {
    const first = syntheticChangeset({ repoId: 'mobingilabs/ripple-ui', headSha: stableHead, files: [{ repoId: 'mobingilabs/ripple-ui', path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }] });
    const second = syntheticChangeset({ repoId: 'mobingilabs/ouchan', headSha: stableHead, files: [{ repoId: 'mobingilabs/ouchan', path: 'services/billingd/services/billingsvc/billingsvc.go', status: 'modify' }] });
    const combined = combineChangesets([second, first], new Date('2026-08-12T00:00:00.000Z'));
    expect(combined.changedRepos).toEqual(['mobingilabs/ouchan', 'mobingilabs/ripple-ui']);
    expect(new Set(selected(selectJourneys(combined)))).toEqual(new Set([j1, j3]));
  });
});
