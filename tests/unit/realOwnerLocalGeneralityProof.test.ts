// W10 M8 — opt-in REAL reproduction GENERALITY proof.
//
// W9 proved one real package could execute. One package is an existence proof,
// not generality: a single hand-reachable target can be an accident of which
// directory sorts first. This proof selects a SECOND, mechanically DISTINCT
// target through the same W10 capability path the reasoner now uses, and runs
// it through the generic production provider — not a bespoke test command.
//
// Repository diversity is measured, not assumed. The M0 census established that
// exactly one approved repository (`mobingilabs/ouchan`) contains any
// executable target at all: `alphauslabs/blue-sdk-go` is the only other
// approved repository with Go under its approved roots and it vendors nothing,
// so all 57 of its files refuse `VENDOR_DIRECTORY_ABSENT`. This test therefore
// proves PACKAGE diversity and records the repository limitation honestly
// rather than fabricating a second repository.
//
//   NIGHTWATCH_REAL_OWNER_LOCAL_PROOF=1 npx playwright test \
//     tests/unit/realOwnerLocalGeneralityProof.test.ts --project=nightwatch --workers=1
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { validateCurrentSourceProof } from '../../src/core/localInvestigation/currentSourceProof';
import { createOwnerLocalInvestigationContext } from '../../src/core/localInvestigation/ownerLocal';
import { DEFAULT_SIBLING_ROOT } from '../../src/core/source/siblingSource';
import {
  createOwnerLocalReproductionProvider,
  discoverOwnerLocalTarget,
  resolveOwnerLocalGoBinary,
  requiredGoVersionForModule,
  ownerLocalModuleRoot,
} from '../../src/core/ownerLocalReproduction/provider';

const ENABLED = process.env['NIGHTWATCH_REAL_OWNER_LOCAL_PROOF'] === '1';
const SIBLING_ROOT = process.env['NIGHTWATCH_REPOS_ROOT'] ?? DEFAULT_SIBLING_ROOT;

const HONEST_VERDICTS = [
  'REPRODUCED_CURRENT_FAILURE',
  'NOT_REPRODUCED',
  'INCONCLUSIVE',
  'ENVIRONMENT_BLOCKED',
] as const;

test.describe('W10 real reproduction generality proof (opt-in)', () => {
  test('the capability surface offers several distinct real executable targets', async () => {
    test.skip(!ENABLED, 'NIGHTWATCH_REAL_OWNER_LOCAL_PROOF=1 to run the real proof');
    // Deadline, not a wait: real classification over the approved universe
    // reads source through the confined boundary. No sleep or polling here.
    test.setTimeout(600_000);

    const context = createOwnerLocalInvestigationContext({ siblingRoot: SIBLING_ROOT });
    const index = await context.source.index();
    test.skip(!('value' in index), 'owner-approved source index unavailable');
    if (!('value' in index)) return;

    const surface = index.value.surface ?? [];
    const executable = surface.filter((entry) => entry.readiness === 'EXECUTABLE_NOW');
    const distinctTargets = new Set(executable.map((entry) => entry.targetId));

    // The W9 window offered zero. Generality starts at "more than one".
    expect(executable.length).toBeGreaterThan(1);
    expect(distinctTargets.size).toBeGreaterThan(1);

    // Every executable entry names a real executor class and a real target id;
    // an executable claim without one would be an unbacked assertion.
    for (const entry of executable) {
      expect(entry.executorClass).toBe('GO_VENDORED_PACKAGE_TEST');
      expect(entry.targetId).not.toBeNull();
      expect(entry.refusal).toBeNull();
    }

    // Repository diversity is a measured property of the approved universe, not
    // a target we may assume. Record what is actually true.
    const executableRepositories = new Set(
      executable.map((entry) => entry.sourcePath.slice(0, entry.sourcePath.indexOf(':'))),
    );
    expect(executableRepositories.size).toBeGreaterThanOrEqual(1);
  });

  test('a second distinct real package reproduces honestly through the generic provider', async () => {
    test.skip(!ENABLED, 'NIGHTWATCH_REAL_OWNER_LOCAL_PROOF=1 to run the real proof');
    // Deadline, not a wait: a full-tree materialization plus two real
    // `go test` runs need minutes. No sleep or polling is introduced here.
    test.setTimeout(900_000);

    const context = createOwnerLocalInvestigationContext({ siblingRoot: SIBLING_ROOT });
    const index = await context.source.index();
    test.skip(!('value' in index), 'owner-approved source index unavailable');
    if (!('value' in index)) return;

    const executable = (index.value.surface ?? []).filter(
      (entry) => entry.readiness === 'EXECUTABLE_NOW',
    );
    test.skip(executable.length < 2, 'fewer than two executable targets in the approved universe');

    // Deliberately NOT the first: the first target is what the W9 proof already
    // covers, so reusing it would prove nothing new. Take the first entry whose
    // target id differs from the first entry's.
    const firstTargetId = executable[0]?.targetId ?? null;
    const second = executable.find((entry) => entry.targetId !== firstTargetId) ?? null;
    test.skip(second === null, 'no second DISTINCT executable target');
    if (second === null) return;

    const candidate = second.sourcePath;
    const discovery = discoverOwnerLocalTarget({ sourcePath: candidate, siblingRoot: SIBLING_ROOT });
    expect(discovery.status).toBe('SUPPORTED');
    if (discovery.status !== 'SUPPORTED') return;

    const moduleRoot = ownerLocalModuleRoot(SIBLING_ROOT, discovery.target);
    test.skip(moduleRoot === null, 'target module root unresolvable');
    if (moduleRoot === null) return;
    const toolchain = resolveOwnerLocalGoBinary({
      requiredVersion: requiredGoVersionForModule(moduleRoot),
    });
    test.skip(toolchain.status !== 'RESOLVED', 'no allowlisted Go toolchain satisfies the module');
    if (toolchain.status !== 'RESOLVED') return;

    // Sibling identity before and after: a reproduction must never mutate the
    // repository it reads.
    const repositoryRoot = path.join(SIBLING_ROOT, ...discovery.target.repository.split('/'));
    const identityBefore = fs.readdirSync(repositoryRoot).sort().join('\n');

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-w10-generality-'));
    try {
      const provider = createOwnerLocalReproductionProvider({
        siblingRoot: SIBLING_ROOT,
        tempRoot,
        sourceProvider: context.source,
      });
      const result = await provider.run({
        reproductionId: 'rep-w10-generality-1',
        candidateId: null,
        sourcePath: candidate,
        sourceEvidenceRef: 'w10-generality-no-session-binding',
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

    expect(fs.readdirSync(repositoryRoot).sort().join('\n')).toBe(identityBefore);
  });
});
