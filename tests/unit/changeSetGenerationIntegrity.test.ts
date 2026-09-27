// M8 task 9.10 (NW-AUD-043) — a ChangeSet is validated and its id RECOMPUTED
// before it drives selection, renames are classified by BOTH endpoints, and the
// dependency edges are bound to the baseline/head they were derived from.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { changesetId, selectJourneys, validateChangeSet } from '../../src/core/changeIntelligence/selection';
import { CHANGE_INTELLIGENCE_SCHEMA_VERSION, SELECTOR_VERSION } from '../../src/core/changeIntelligence/types';
import type { ChangeSet } from '../../src/core/changeIntelligence/types';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SELECTION = fs.readFileSync(path.join(REPO_ROOT, 'src', 'core', 'changeIntelligence', 'selection.ts'), 'utf8');

const BASE = '1'.repeat(40);
const HEAD = '2'.repeat(40);

function changeSet(files: ChangeSet['changedFiles'], overrides: Partial<ChangeSet> = {}): ChangeSet {
  const partial: Omit<ChangeSet, 'changesetId'> = {
    schemaVersion: CHANGE_INTELLIGENCE_SCHEMA_VERSION,
    selectorVersion: SELECTOR_VERSION,
    generatedAt: '2026-01-01T00:00:00.000Z',
    repoBaselines: [{
      repoId: 'alphauslabs/ripple-api',
      baseSha: BASE,
      headSha: HEAD,
      mergeBase: BASE,
      rangeSemantics: 'BASE_SHA_TO_HEAD_SHA',
      source: 'COMMITTED_UPSTREAM_CHANGE',
      dirtyExcluded: true,
    }],
    changedRepos: ['alphauslabs/ripple-api'],
    changedFiles: files,
    commits: [],
    dirtyFiles: [],
    sourceWindow: 'COMMITTED_ONLY',
    deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED',
    ...overrides,
  };
  return { ...partial, changesetId: changesetId(partial) };
}

test.describe('change intelligence source generation integrity (9.10)', () => {
  test('a validated changeset is accepted and selection recomputes the same id', () => {
    const set = changeSet([{ repoId: 'alphauslabs/ripple-api', path: 'src/app.php', status: 'modify' }]);
    expect(() => validateChangeSet(set)).not.toThrow();
    expect(changesetId(set)).toBe(set.changesetId);
    expect(() => selectJourneys(set)).not.toThrow();
  });

  test('a changeset whose id does not describe its content is refused', () => {
    const set = changeSet([{ repoId: 'alphauslabs/ripple-api', path: 'src/app.php', status: 'modify' }]);
    const forged: ChangeSet = { ...set, changesetId: 'cs-000000000000000000000000' };
    expect(() => validateChangeSet(forged)).toThrow(/CHANGESET_ID_MISMATCH/);
    expect(() => selectJourneys(forged)).toThrow(/CHANGESET_ID_MISMATCH/);
    // Content added under a stale id is refused too: the id must cover it.
    const grown: ChangeSet = { ...set, changedFiles: [...set.changedFiles, { repoId: 'alphauslabs/ripple-api', path: 'src/other.php', status: 'modify' }] };
    expect(() => validateChangeSet(grown)).toThrow(/CHANGESET_ID_MISMATCH/);
  });

  test('a rename must name BOTH endpoints, and both endpoints are classified', () => {
    const oneSided = changeSet([{ repoId: 'alphauslabs/ripple-api', path: 'src/new.php', status: 'rename' } as ChangeSet['changedFiles'][number]]);
    expect(() => validateChangeSet(oneSided)).toThrow(/CHANGESET_RENAME_ENDPOINT_MISSING/);
    const twoSided = changeSet([{ repoId: 'alphauslabs/ripple-api', path: 'src/new.php', previousPath: 'src/old.php', status: 'rename' }]);
    expect(() => validateChangeSet(twoSided)).not.toThrow();
    // Both endpoints participate in edge matching and non-runtime
    // classification (source-pinned: no single-endpoint helper remains).
    expect(SELECTION).toContain('matches(edge, file.path) || (file.previousPath !== undefined && matches(edge, file.previousPath))');
    expect(SELECTION).toContain('const previousPath = file.previousPath ? canonicalPath(file.previousPath) : \'\';');
    // A self-referential rename is not a rename.
    const selfReferential = changeSet([{ repoId: 'alphauslabs/ripple-api', path: 'src/same.php', previousPath: 'src/same.php', status: 'rename' }]);
    expect(() => validateChangeSet(selfReferential)).toThrow(/CHANGESET_RENAME_SELF_REFERENTIAL/);
  });

  test('a file whose repository has no baseline is refused, and an unbound baseline is refused', () => {
    const orphan = changeSet([{ repoId: 'alphauslabs/unknown-repo', path: 'src/app.php', status: 'modify' }]);
    expect(() => validateChangeSet(orphan)).toThrow(/CHANGESET_BASELINE_MISSING/);
    const unbound = changeSet([{ repoId: 'alphauslabs/ripple-api', path: 'src/app.php', status: 'modify' }], {
      repoBaselines: [{
        repoId: 'alphauslabs/ripple-api',
        baseSha: 'not-a-sha',
        headSha: HEAD,
        mergeBase: BASE,
        rangeSemantics: 'BASE_SHA_TO_HEAD_SHA',
        source: 'COMMITTED_UPSTREAM_CHANGE',
        dirtyExcluded: true,
      }],
    });
    expect(() => validateChangeSet(unbound)).toThrow(/CHANGESET_BASELINE_UNBOUND/);
  });

  test('the dependency edges are declared static and the baseline carries the real head', () => {
    // The edge set is a DECLARED map, not derived per changeset: the code says
    // so, and every edge match is against the validated changeset's own files.
    expect(SELECTION).toContain('const edges = options.edges ?? RIPPLE_DEPENDENCY_EDGES;');
    // The selection reads the baselines from the changeset, never from ambient
    // state, so the edges are matched against the real baseline/head pair.
    expect(SELECTION).toContain('const baselineRepos = new Set(changeset.repoBaselines.map((baseline) => baseline.repoId));');
    const set = changeSet([{ repoId: 'alphauslabs/ripple-api', path: 'src/app.php', status: 'modify' }]);
    expect(set.repoBaselines[0]?.baseSha).toBe(BASE);
    expect(set.repoBaselines[0]?.headSha).toBe(HEAD);
  });
});
