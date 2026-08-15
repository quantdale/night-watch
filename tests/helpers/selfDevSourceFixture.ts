// ---------------------------------------------------------------------------
// Phase 8B.1.0 — explicit adopted-catalog source fixtures (test-only).
//
// Historical tests built temporary Git repositories by copying the live
// checkout (process.cwd()) — including whatever adopted-case catalog happened
// to be in the generated source. Once the canonical catalog can be non-empty,
// that silently changes what those tests prove. This helper makes the
// adopted-catalog state EXPLICIT: it renders the requested state (EMPTY /
// EXPAND_ONLY / EXPAND_AND_COLLAPSE) through the REAL Phase 8B renderer and
// validators into a committed temporary repository. The real Nightwatch
// checkout is never modified.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  SELFDEV_AUTHORITATIVE_PATHS,
  SELFDEV_FIXTURE_ID,
  deriveAdoptedCase,
  renderAdoptedCatalogSource,
} from '../../src/core/selfDev';

export type SyntheticCatalogState = 'EMPTY' | 'EXPAND_ONLY' | 'EXPAND_AND_COLLAPSE';

const EXPAND_ACTIONS: readonly string[] = ['selfdev.synthetic.expand-summary'];
const EXPAND_ASSERTIONS: readonly string[] = [
  'selfdev.assert.state.expanded',
  'selfdev.assert.transition.expansion',
  'selfdev.assert.oracle.structural-stable',
];
const EXPAND_COLLAPSE_ACTIONS: readonly string[] = ['selfdev.synthetic.expand-summary', 'selfdev.synthetic.collapse-summary'];
const EXPAND_COLLAPSE_ASSERTIONS: readonly string[] = [
  'selfdev.assert.state.ready',
  'selfdev.assert.transition.collapse',
  'selfdev.assert.oracle.structural-stable',
];

/** Renders the canonical adopted-catalog source for the requested state (real renderer, canonical ordering). */
export function renderSyntheticCatalogSource(state: SyntheticCatalogState): string {
  if (state === 'EMPTY') return renderAdoptedCatalogSource([]);
  const entries = [];
  entries.push(deriveAdoptedCase(SELFDEV_FIXTURE_ID, EXPAND_ACTIONS, EXPAND_ASSERTIONS));
  if (state === 'EXPAND_AND_COLLAPSE') {
    entries.push(deriveAdoptedCase(SELFDEV_FIXTURE_ID, EXPAND_COLLAPSE_ACTIONS, EXPAND_COLLAPSE_ASSERTIONS));
  }
  return renderAdoptedCatalogSource(entries);
}

export interface SelfDevSourceFixture {
  readonly root: string;
  readonly headSha: string;
  readonly catalogState: SyntheticCatalogState;
  cleanup(): void;
}

function gitEnvironment(root: string): NodeJS.ProcessEnv {
  return {
    PATH: '/usr/bin:/bin',
    HOME: root,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Nightwatch Synthetic',
    GIT_AUTHOR_EMAIL: 'synthetic@example.invalid',
    GIT_COMMITTER_NAME: 'Nightwatch Synthetic',
    GIT_COMMITTER_EMAIL: 'synthetic@example.invalid',
    GIT_OPTIONAL_LOCKS: '0',
  };
}

function git(root: string, args: readonly string[]): string {
  const result = spawnSync('git', ['-C', root, ...args], {
    cwd: root,
    env: gitEnvironment(root),
    shell: false,
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 512 * 1024,
  });
  if (result.status !== 0) throw new Error(`GIT_TEST_FAILED:${args.join('_')}:${result.stderr ?? ''}`);
  return (result.stdout ?? '').trim();
}

/**
 * Creates a committed temporary source repository with the requested adopted
 * catalog state. The authoritative source set is copied from the live
 * checkout, then the generated catalog file is REPLACED by the rendered state
 * (never the live checkout's bytes), and the result is committed so
 * sourceBundleDigest / contractDigest / Git HEAD are internally coherent.
 *
 * `marker` guarantees genuinely distinct commit trees (and therefore distinct
 * HEAD SHAs and downstream content-addressed IDs) across independently built
 * fixtures.
 */
export function createSyntheticSelfDevSourceFixture(catalogState: SyntheticCatalogState, marker = 'default'): SelfDevSourceFixture {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-selfdev-source-fixture-'));
  for (const relative of SELFDEV_AUTHORITATIVE_PATHS) {
    const source = path.join(process.cwd(), relative);
    const destination = path.join(repository, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  fs.writeFileSync(path.join(repository, 'src/core/selfDev/adoptedCaseCatalog.generated.ts'), renderSyntheticCatalogSource(catalogState));
  fs.writeFileSync(path.join(repository, 'SYNTHETIC_FIXTURE_MARKER.txt'), `${catalogState}:${marker}\n`);
  // The fixture is a source-only tree: symlink the running checkout's
  // node_modules so CLI subprocesses running inside the fixture can resolve
  // `typescript` and the like, and exclude the symlink so the fixture's Git
  // state stays fully clean (whole-repository cleanliness checks see nothing).
  fs.symlinkSync(path.join(process.cwd(), 'node_modules'), path.join(repository, 'node_modules'), 'dir');
  git(repository, ['init', '--quiet']);
  fs.appendFileSync(path.join(repository, '.git', 'info', 'exclude'), '\nnode_modules\n');
  git(repository, ['add', '--all']);
  git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', `synthetic catalog fixture: ${catalogState}`]);
  const headSha = git(repository, ['rev-parse', 'HEAD']);
  return {
    root: repository,
    headSha,
    catalogState,
    cleanup: () => fs.rmSync(repository, { recursive: true, force: true }),
  };
}
