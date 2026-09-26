// W9 provider lane — opt-in REAL owner-local reproduction proof.
//
// Executes a genuinely supported local package (discovered generically from
// repository metadata, never hard-coded) through the real provider: real
// discovery, real toolchain resolution, real `go test` in fresh disposable
// trees. Skipped unless NIGHTWATCH_REAL_OWNER_LOCAL_PROOF=1, and skipped when
// prerequisites (sibling checkout, supported package, toolchain) are absent.
//
//   NIGHTWATCH_REAL_OWNER_LOCAL_PROOF=1 npx playwright test \
//     tests/unit/realOwnerLocalReproductionProof.test.ts --project=nightwatch --workers=1
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { liveSourceTestRoot } from '../helpers/liveSourceTestAuthority';

import { validateCurrentSourceProof } from '../../src/core/localInvestigation/currentSourceProof';
import { createOwnerLocalInvestigationContext } from '../../src/core/localInvestigation/ownerLocal';
import type { LocalSourceProvider } from '../../src/core/localInvestigation/types';
import { DEFAULT_SIBLING_ROOT } from '../../src/core/source/siblingSource';
import { approvedRootsFor, ownerApprovedRepositoryIds } from '../../src/core/source/universe';
import {
  createOwnerLocalReproductionProvider,
  discoverOwnerLocalTarget,
  resolveOwnerLocalGoBinary,
  requiredGoVersionForModule,
  ownerLocalModuleRoot,
} from '../../src/core/ownerLocalReproduction/provider';

const ENABLED = process.env['NIGHTWATCH_REAL_OWNER_LOCAL_PROOF'] === '1';
const SIBLING_ROOT = liveSourceTestRoot();

const HONEST_VERDICTS = [
  'REPRODUCED_CURRENT_FAILURE',
  'NOT_REPRODUCED',
  'INCONCLUSIVE',
  'ENVIRONMENT_BLOCKED',
] as const;

function isUsableDir(target: string): boolean {
  try {
    return fs.lstatSync(target).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Generically discover the first supported package from metadata: walk
 * approved repositories/allowlisted roots (sorted, bounded, skipping VCS,
 * vendor, and JS build trees) for a directory holding both a `.go` source
 * and a `_test.go` file, and confirm it through real target discovery.
 */
function discoverFirstSupportedPackage(siblingRoot: string): string | null {
  const BUDGET = 25_000;
  let spent = 0;
  const skipped = new Set(['.git', 'vendor', 'node_modules', 'dist', 'build']);
  const testDirs: string[] = [];
  const walk = (dir: string): void => {
    if (spent > BUDGET || testDirs.length >= 50) return;
    let entries: fs.Dirent[];
    try {
      entries = fs
        .readdirSync(dir, { withFileTypes: true })
        .sort((left, right) => left.name.localeCompare(right.name));
    } catch {
      return;
    }
    let hasGo = false;
    let hasTest = false;
    const subdirs: string[] = [];
    for (const entry of entries) {
      spent += 1;
      if (spent > BUDGET) return;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!skipped.has(entry.name)) subdirs.push(entry.name);
        continue;
      }
      if (!entry.isFile()) continue;
      if (entry.name.endsWith('.go')) {
        hasGo = true;
        if (entry.name.endsWith('_test.go')) hasTest = true;
      }
    }
    if (hasGo && hasTest) testDirs.push(dir);
    for (const subdir of subdirs) {
      if (spent > BUDGET || testDirs.length >= 50) return;
      walk(path.join(dir, subdir));
    }
  };
  for (const repo of ownerApprovedRepositoryIds()) {
    const roots = approvedRootsFor(repo);
    if (roots === null) continue;
    for (const root of [...roots].sort()) {
      const base = path.join(siblingRoot, ...repo.split('/'), ...root.split('/'));
      if (!isUsableDir(base)) continue;
      walk(base);
      for (const dir of testDirs.splice(0)) {
        let sources: string[];
        try {
          sources = fs
            .readdirSync(dir)
            .filter((name) => name.endsWith('.go') && !name.endsWith('_test.go'))
            .sort();
        } catch {
          continue;
        }
        for (const source of sources) {
          const relative = path.relative(path.join(siblingRoot, ...repo.split('/')), path.join(dir, source));
          if (relative.startsWith('..') || relative.length === 0) continue;
          const candidate = `${repo}:${relative.split(path.sep).join('/')}`;
          const discovery = discoverOwnerLocalTarget({ sourcePath: candidate, siblingRoot });
          if (discovery.status === 'SUPPORTED') return candidate;
        }
      }
      if (spent > BUDGET) return null;
    }
  }
  return null;
}

test.describe('W9 real owner-local reproduction proof (opt-in)', () => {
  test('real supported package reproduces honestly end to end', async () => {
    test.skip(!ENABLED, 'NIGHTWATCH_REAL_OWNER_LOCAL_PROOF=1 to run the real proof');
    // Deadline, not a wait: two full-tree materializations plus two real `go
    // test` runs need minutes. No sleep or polling is introduced here.
    test.setTimeout(600_000);
    expect(isUsableDir(SIBLING_ROOT)).toBe(true);

    const candidate = discoverFirstSupportedPackage(SIBLING_ROOT);
    test.skip(candidate === null, 'no supported vendored Go test package under the approved universe');
    if (candidate === null) return;

    // Toolchain prerequisite: a resolvable allowlisted binary, never a download.
    const discovery = discoverOwnerLocalTarget({ sourcePath: candidate, siblingRoot: SIBLING_ROOT });
    expect(discovery.status).toBe('SUPPORTED');
    if (discovery.status !== 'SUPPORTED') return;
    const moduleRoot = ownerLocalModuleRoot(SIBLING_ROOT, discovery.target);
    test.skip(moduleRoot === null, 'supported target module root unresolvable');
    if (moduleRoot === null) return;
    const toolchain = resolveOwnerLocalGoBinary({
      requiredVersion: requiredGoVersionForModule(moduleRoot),
    });
    test.skip(toolchain.status !== 'RESOLVED', 'no allowlisted Go toolchain satisfies the module');
    if (toolchain.status !== 'RESOLVED') return;

    // Real host source provider when it can serve the candidate; the digest
    // binding is still enforced whenever it is present.
    let sourceProvider: LocalSourceProvider | undefined;
    try {
      const context = createOwnerLocalInvestigationContext({
        siblingRoot: SIBLING_ROOT,
        repositoryIds: [discovery.target.repository],
      });
      const reRead = await context.source.read(candidate);
      if (reRead.status === 'AVAILABLE') sourceProvider = context.source;
    } catch {
      sourceProvider = undefined;
    }

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-real-owner-local-'));
    try {
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot: SIBLING_ROOT,
        tempRoot,
        sourceProvider,
      });
      const result = await provider.run({
        reproductionId: 'rep-real-1',
        candidateId: null,
        sourcePath: candidate,
        sourceEvidenceRef: 'real-proof-no-session-binding',
        observedEvidenceRefs: [],
      });
      expect(result.status).toBe('AVAILABLE');
      if (result.status !== 'AVAILABLE') return;
      expect(HONEST_VERDICTS).toContain(result.value.verdict);
      // No execution may leak temp trees, whatever the verdict.
      expect(fs.readdirSync(tempRoot)).toEqual([]);
      if (result.value.verdict === 'REPRODUCED_CURRENT_FAILURE') {
        expect(result.value.preFix).toBe('FAIL');
        expect(result.value.postFix).toBe('NOT_RUN');
        const proof = result.value.currentSourceProof;
        expect(proof).not.toBeNull();
        if (proof !== null && proof !== undefined) {
          expect(
            validateCurrentSourceProof(proof, {
              providerId: provider.providerId,
              sourcePath: candidate,
            }),
          ).toBeNull();
        }
      }
      if (result.value.verdict === 'NOT_REPRODUCED') {
        expect(result.value.preFix).toBe('PASS');
        expect(result.value.postFix).toBe('NOT_RUN');
      }
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
