// M6 task 7.8 (B-10/C-22) — one sibling-root resolution: trimmed, env-first,
// fail-closed, and consumed by every surface.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SIBLING_ROOT } from '../../src/core/source/siblingRoot';
import { resolveSiblingRoot, resolveSourceTopology } from '../../src/core/policy/sourceTopology';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

test.describe('sibling-root resolution (7.8)', () => {
  test('the environment wins, is trimmed, and the default is the fallback', () => {
    expect(resolveSiblingRoot({ environment: { NIGHTWATCH_REPOS_ROOT: '/tmp/relocated-repos' } })).toBe('/tmp/relocated-repos');
    // Surrounding whitespace is trimmed rather than becoming a different path.
    expect(resolveSiblingRoot({ environment: { NIGHTWATCH_REPOS_ROOT: '  /tmp/trimmed-repos \n' } })).toBe('/tmp/trimmed-repos');
    // An empty or whitespace-only value falls back to the default.
    expect(resolveSiblingRoot({ environment: { NIGHTWATCH_REPOS_ROOT: '' } })).toBe(DEFAULT_SIBLING_ROOT);
    expect(resolveSiblingRoot({ environment: { NIGHTWATCH_REPOS_ROOT: '   ' } })).toBe(DEFAULT_SIBLING_ROOT);
    expect(resolveSiblingRoot({ environment: {} })).toBe(DEFAULT_SIBLING_ROOT);
  });

  test('an explicit option wins over the environment and a relative root refuses', () => {
    expect(
      resolveSiblingRoot({
        repositoriesRoot: '/tmp/explicit-repos',
        environment: { NIGHTWATCH_REPOS_ROOT: '/tmp/relocated-repos' },
      }),
    ).toBe('/tmp/explicit-repos');
    // Fail closed: a relative root cannot name the sibling universe.
    expect(() => resolveSiblingRoot({ environment: { NIGHTWATCH_REPOS_ROOT: 'relative/repos' } })).toThrow(
      /SOURCE_TOPOLOGY_REPOSITORIES_ROOT_AMBIGUOUS/,
    );
  });

  test('the resolver and the topology authority agree on the root', () => {
    const environment = { NIGHTWATCH_REPOS_ROOT: '/tmp/agreement-repos' };
    expect(resolveSourceTopology({ environment }).repositoriesRoot).toBe(resolveSiblingRoot({ environment }));
  });

  test('every declared consumer resolves through the one authority', () => {
    const consumers = [
      'src/controlCenter/authorities/sourceAuthority.ts',
      'src/core/localInvestigation/historical.ts',
      'src/core/localInvestigation/ownerLocal.ts',
      'src/core/bugAtlas/miner.ts',
      'src/core/ownerLocalReproduction/provider.ts',
      'bin/nightwatch-intelligence.mjs',
      'bin/record-identity.mjs',
      'bin/change-intelligence.mjs',
      'bin/cache-key-contract.mjs',
      'bin/release-freshness.mjs',
      'bin/silent-zero-output.mjs',
      'bin/test-oracle-quality.mjs',
      'bin/w11-historical-arm.mjs',
      'scenarios/ripple/local.smoke.ts',
      'tests/helpers/liveSourceTestAuthority.ts',
    ];
    for (const file of consumers) {
      const source = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
      expect(source, file).toMatch(/resolveSiblingRoot|liveSourceTestRoot/);
      // No consumer may read the leaf constant directly.
      // Comments are inert: only CODE may mention the leaf constant.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code.includes('DEFAULT_SIBLING_ROOT'), file).toBe(false);
    }
  });
});
