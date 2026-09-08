import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  REPOSITORIES_ROOT_ENV,
  SESSION_WORKTREE_PARENT_RELATIVE,
  assertOutsideSourceTopology,
  containingSourceRoot,
  resolveSourceTopology,
} from '../../src/core/policy/sourceTopology';
import {
  PRIVATE_ARTIFACT_ROOT_ENV,
  PrivateArtifactStore,
  privateArtifactRoot,
} from '../../src/core/policy/privateArtifacts';
import {
  PRODUCTION_ARTIFACT_ROOT_ENV,
  ProductionFindingsStore,
} from '../../src/core/prodEvidence/productionFindingsStore';

/**
 * NW-02. `privateArtifacts.ts` and `productionFindingsStore.ts` each computed
 * their own exclusion set from `path.resolve(__dirname, '..', '..', '..')`, so
 * a SAFETY decision moved with the checkout: from the canonical
 * `REPOSITORIES/nightwatch` checkout the excluded roots were `REPOSITORIES`
 * and its children, but from a C-00 session worktree at
 * `$HOME/.nightwatch/worktrees/<name>` they became `$HOME/.nightwatch/worktrees`
 * — so a configured private root beneath canonical or a sibling checkout was
 * rejected in one supported topology and ACCEPTED in another.
 *
 * Every path here is fabricated. Nothing under a real repositories root or a
 * real worktree is created, read, or written: the module is pure, and the
 * three topologies are supplied as injected values rather than by running the
 * test from three different checkouts.
 */

/** The three supported checkout locations, as the module would see them. */
const REPOSITORIES = '/synthetic/alphaus/REPOSITORIES';
const HOME = '/synthetic/home/owner';
const WORKTREE_PARENT = path.join(HOME, SESSION_WORKTREE_PARENT_RELATIVE);

const TOPOLOGIES = [
  { name: 'canonical checkout', localCheckoutRoot: path.join(REPOSITORIES, 'nightwatch') },
  { name: 'linked session worktree', localCheckoutRoot: path.join(WORKTREE_PARENT, 'session-abc123') },
  { name: 'relocated fresh clone', localCheckoutRoot: '/synthetic/elsewhere/nightwatch-clone' },
] as const;

/** Targets that must be refused from every topology. */
const FORBIDDEN_TARGETS = [
  { name: 'the canonical Nightwatch checkout', target: path.join(REPOSITORIES, 'nightwatch', '.nightwatch', 'findings') },
  { name: 'the repositories root itself', target: REPOSITORIES },
  { name: 'a sibling company checkout', target: path.join(REPOSITORIES, 'ouchan', 'private') },
  { name: 'a sibling source subtree', target: path.join(REPOSITORIES, 'blue-sdk-go', 'session', 'state') },
  { name: 'the session-worktree parent', target: WORKTREE_PARENT },
  { name: 'another session worktree', target: path.join(WORKTREE_PARENT, 'session-other', 'findings') },
] as const;

function topologyFor(localCheckoutRoot: string) {
  return resolveSourceTopology({
    repositoriesRoot: REPOSITORIES,
    homeDirectory: HOME,
    localCheckoutRoot,
    environment: {},
  });
}

test.describe('NW-02 — private-path exclusion is independent of checkout topology', () => {
  test('every source, sibling and worktree root is refused from every topology', () => {
    const decisions = new Map<string, string[]>();
    for (const topology of TOPOLOGIES) {
      const resolved = topologyFor(topology.localCheckoutRoot);
      for (const forbidden of FORBIDDEN_TARGETS) {
        expect(
          containingSourceRoot(forbidden.target, resolved),
          `${forbidden.name} must be refused from the ${topology.name}`,
        ).not.toBeNull();
        expect(() => assertOutsideSourceTopology(forbidden.target, 'SYNTHETIC_REFUSED', resolved))
          .toThrow('SYNTHETIC_REFUSED');
      }
      // Record the full decision vector so the topologies are compared as a
      // whole, not one assertion at a time.
      decisions.set(
        topology.name,
        FORBIDDEN_TARGETS.map((forbidden) => `${forbidden.name}=${containingSourceRoot(forbidden.target, resolved) === null ? 'ALLOWED' : 'REFUSED'}`),
      );
    }
    const vectors = [...decisions.values()].map((entries) => entries.join('|'));
    expect(new Set(vectors).size, `decisions differed across topology: ${JSON.stringify([...decisions])}`).toBe(1);
  });

  test('a legitimate owner state root is allowed from every topology', () => {
    for (const topology of TOPOLOGIES) {
      const resolved = topologyFor(topology.localCheckoutRoot);
      for (const allowed of [
        path.join(HOME, '.nightwatch', 'findings'),
        path.join(HOME, '.nightwatch', 'reviews'),
        path.join(HOME, '.nightwatch', 'prod-findings'),
      ]) {
        expect(
          containingSourceRoot(allowed, resolved),
          `${allowed} must remain usable from the ${topology.name}`,
        ).toBeNull();
      }
    }
  });

  test('the local checkout is refused as self-protection, in addition to the shared roots', () => {
    // A relocated clone is outside both absolute roots, so only the
    // self-protection entry can refuse it.
    const resolved = topologyFor('/synthetic/elsewhere/nightwatch-clone');
    expect(containingSourceRoot('/synthetic/elsewhere/nightwatch-clone/state', resolved))
      .toBe('/synthetic/elsewhere/nightwatch-clone');
    // Omitting it must not widen the shared answer.
    const without = resolveSourceTopology({
      repositoriesRoot: REPOSITORIES,
      homeDirectory: HOME,
      localCheckoutRoot: null,
      environment: {},
    });
    expect(without.localCheckoutRoot).toBeNull();
    for (const forbidden of FORBIDDEN_TARGETS) {
      expect(containingSourceRoot(forbidden.target, without)).not.toBeNull();
    }
  });

  test('an ambiguous repositories root fails closed instead of falling back', () => {
    expect(() => resolveSourceTopology({ repositoriesRoot: 'relative/REPOSITORIES', environment: {} }))
      .toThrow('SOURCE_TOPOLOGY_REPOSITORIES_ROOT_AMBIGUOUS');
    expect(() => resolveSourceTopology({ repositoriesRoot: '   ', environment: {} }))
      .toThrow('SOURCE_TOPOLOGY_REPOSITORIES_ROOT_AMBIGUOUS');
    expect(() => resolveSourceTopology({ homeDirectory: 'not/absolute', environment: {} }))
      .toThrow('SOURCE_TOPOLOGY_HOME_AMBIGUOUS');
    expect(() => containingSourceRoot('not/absolute', topologyFor(path.join(REPOSITORIES, 'nightwatch'))))
      .toThrow('SOURCE_TOPOLOGY_CANDIDATE_NOT_ABSOLUTE');
  });

  test('an explicit repositories root overrides the environment, which overrides the default', () => {
    const explicit = resolveSourceTopology({
      repositoriesRoot: '/synthetic/explicit/REPOSITORIES',
      homeDirectory: HOME,
      localCheckoutRoot: null,
      environment: { [REPOSITORIES_ROOT_ENV]: '/synthetic/env/REPOSITORIES' },
    });
    expect(explicit.repositoriesRoot).toBe('/synthetic/explicit/REPOSITORIES');
    const fromEnvironment = resolveSourceTopology({
      homeDirectory: HOME,
      localCheckoutRoot: null,
      environment: { [REPOSITORIES_ROOT_ENV]: '/synthetic/env/REPOSITORIES' },
    });
    expect(fromEnvironment.repositoriesRoot).toBe('/synthetic/env/REPOSITORIES');
    const fromDefault = resolveSourceTopology({ homeDirectory: HOME, localCheckoutRoot: null, environment: {} });
    expect(path.isAbsolute(fromDefault.repositoriesRoot)).toBe(true);
    expect(fromDefault.excludedRoots).toContain(fromDefault.repositoriesRoot);
  });

  /**
   * The measurement that distinguishes the repair from the defect, through
   * the CONSUMERS' own public paths rather than the new module's.
   *
   * A configured default root is held to the exclusion contract, so pointing
   * `NIGHTWATCH_PRIVATE_STATE_DIR` at the canonical Nightwatch checkout is
   * exactly the decision that used to move with `__dirname`. This test runs
   * from a C-00 session worktree, where the pre-repair exclusion set was
   * `$HOME/.nightwatch/worktrees` — so it ACCEPTED this root. It must now be
   * refused, and refused identically no matter which checkout runs the test.
   */
  test('a configured default root inside canonical source is refused by both real stores', () => {
    const live = resolveSourceTopology();
    const insideCanonical = path.join(live.repositoriesRoot, 'nightwatch', 'synthetic-nw02-private-root');
    const insideSibling = path.join(live.repositoriesRoot, 'ouchan', 'synthetic-nw02-private-root');
    const previousPrivate = process.env[PRIVATE_ARTIFACT_ROOT_ENV];
    const previousProduction = process.env[PRODUCTION_ARTIFACT_ROOT_ENV];
    try {
      for (const forbidden of [insideCanonical, insideSibling]) {
        process.env[PRIVATE_ARTIFACT_ROOT_ENV] = forbidden;
        expect(() => privateArtifactRoot(undefined, 'findings'))
          .toThrow('PRIVATE_ARTIFACT_ROOT_INSIDE_REPOSITORY');
        expect(() => new PrivateArtifactStore())
          .toThrow('PRIVATE_ARTIFACT_ROOT_INSIDE_REPOSITORY');

        process.env[PRODUCTION_ARTIFACT_ROOT_ENV] = forbidden;
        expect(() => new ProductionFindingsStore())
          .toThrow('PRODUCTION_ARTIFACT_ROOT_INSIDE_REPOSITORY');

        // The refusal must happen before creation, not after.
        expect(fs.existsSync(forbidden)).toBe(false);
      }
    } finally {
      if (previousPrivate === undefined) delete process.env[PRIVATE_ARTIFACT_ROOT_ENV];
      else process.env[PRIVATE_ARTIFACT_ROOT_ENV] = previousPrivate;
      if (previousProduction === undefined) delete process.env[PRODUCTION_ARTIFACT_ROOT_ENV];
      else process.env[PRODUCTION_ARTIFACT_ROOT_ENV] = previousProduction;
    }
  });

  test('the live store still refuses a root under the real repositories tree, and accepts a disposable one', () => {
    // The live default topology, whatever checkout this test runs from.
    const live = resolveSourceTopology();
    const insideSource = path.join(live.repositoriesRoot, 'nightwatch', 'synthetic-nw02-must-not-exist');
    expect(() => privateArtifactRoot(undefined, 'findings')).not.toThrow();
    expect(() => assertOutsideSourceTopology(insideSource, 'PRIVATE_ARTIFACT_ROOT_INSIDE_REPOSITORY', live))
      .toThrow('PRIVATE_ARTIFACT_ROOT_INSIDE_REPOSITORY');
    // Nothing was created under the source tree by the refusal.
    expect(fs.existsSync(insideSource)).toBe(false);

    // A disposable injected root still works end to end.
    const disposable = fs.mkdtempSync(path.join(os.tmpdir(), 'nw02-store-'));
    try {
      const store = new PrivateArtifactStore({ root: disposable });
      const written = store.writeJson('synthetic-nw02.json', { probe: 'fabricated' });
      expect(written.startsWith(disposable)).toBe(true);
      expect(store.policy.rootClass).toBe('INJECTED_TEST_ROOT');
    } finally {
      fs.rmSync(disposable, { recursive: true, force: true });
    }
  });
});
